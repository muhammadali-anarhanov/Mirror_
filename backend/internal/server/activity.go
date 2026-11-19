package server

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5"
	"net"
	"net/http"
	"net/mail"
	"strings"
)

func (s *Server) plans(w http.ResponseWriter, r *http.Request) {
	s.list(w, r, "SELECT to_jsonb(p) FROM mirror.plans p ORDER BY price_cents")
}
func (s *Server) subscription(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, "SELECT to_jsonb(s)||jsonb_build_object('plan',to_jsonb(p),'paymentProcessing',false) FROM mirror.subscriptions s JOIN mirror.plans p ON p.id=s.plan_id WHERE tenant_id=$1", t)
}
func (s *Server) changePlan(w http.ResponseWriter, r *http.Request) {
	if current(r).Role != "SUPER_ADMIN" {
		problem(w, 403, "plan changes require a platform administrator; payments are not integrated")
		return
	}
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var b struct {
		PlanID     string `json:"planId"`
		ExtendDays int    `json:"extendDays"`
	}
	if !decode(w, r, &b) {
		return
	}
	if b.ExtendDays < 0 || b.ExtendDays > 366 || (b.PlanID == "" && b.ExtendDays == 0) {
		problem(w, 400, "choose a plan or a number of days to extend")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	if b.PlanID == "" {
		// Manual renewal (payments are not integrated): extend from today or the current expiry.
		tag, e := tx.Exec(r.Context(), "UPDATE mirror.subscriptions SET expires_at=GREATEST(expires_at,now())+make_interval(days=>$2),status='ACTIVE' WHERE tenant_id=$1", t, b.ExtendDays)
		if e == nil && tag.RowsAffected() != 1 {
			problem(w, 404, "subscription not found")
			return
		}
		if e == nil {
			e = s.audit(r.Context(), tx, current(r), "subscription.extend", b)
		}
		if e == nil {
			e = tx.Commit(r.Context())
		}
		if e != nil {
			s.dbError(w, e)
			return
		}
		jsonResponse(w, 200, map[string]bool{"ok": true})
		return
	}
	var old string
	e = tx.QueryRow(r.Context(), "SELECT plan_id FROM mirror.subscriptions WHERE tenant_id=$1 FOR UPDATE", t).Scan(&old)
	if e != nil {
		s.dbError(w, e)
		return
	}
	var branches, devices int
	e = tx.QueryRow(r.Context(), "SELECT branch_limit,device_limit FROM mirror.plans WHERE id=$1", b.PlanID).Scan(&branches, &devices)
	if e != nil {
		s.dbError(w, e)
		return
	}
	var bc, dc int
	e = tx.QueryRow(r.Context(), "SELECT (SELECT count(*) FROM mirror.branches WHERE tenant_id=$1),(SELECT count(*) FROM mirror.devices WHERE tenant_id=$1)", t).Scan(&bc, &dc)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if bc > branches || dc > devices {
		problem(w, 409, "existing resources exceed plan limits")
		return
	}
	_, e = tx.Exec(r.Context(), "UPDATE mirror.subscriptions SET plan_id=$2 WHERE tenant_id=$1", t, b.PlanID)
	if e == nil && b.ExtendDays > 0 {
		_, e = tx.Exec(r.Context(), "UPDATE mirror.subscriptions SET expires_at=GREATEST(expires_at,now())+make_interval(days=>$2),status='ACTIVE' WHERE tenant_id=$1", t, b.ExtendDays)
	}
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "subscription.plan", b)
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
func (s *Server) addCredits(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var b struct {
		Amount    int    `json:"amount"`
		Reference string `json:"reference"`
	}
	if !decode(w, r, &b) {
		return
	}
	if b.Amount < 1 || b.Amount > 1000000 || len(b.Reference) < 8 || len(b.Reference) > 150 {
		problem(w, 400, "invalid credits or unique reference")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	tag, e := tx.Exec(r.Context(), "INSERT INTO mirror.credit_ledger(tenant_id,reference,delta) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", t, "grant:"+b.Reference, b.Amount)
	if e == nil && tag.RowsAffected() == 1 {
		tag, e = tx.Exec(r.Context(), "UPDATE mirror.subscriptions SET extra_credits=extra_credits+$2 WHERE tenant_id=$1", t, b.Amount)
		if e == nil && tag.RowsAffected() != 1 {
			e = errors.New("subscription missing")
		}
	}
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "credits.grant", b)
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

// ConsumeCredit reserves one tenant credit in the caller transaction before provider submission.
func ConsumeCredit(ctx context.Context, tx pgx.Tx, tenantID, reference string) error {
	var status string
	var usable bool
	var used, extra, limit int
	e := tx.QueryRow(ctx, `SELECT s.status,s.expires_at>now(),s.used,s.extra_credits,p.monthly_tryons FROM mirror.subscriptions s JOIN mirror.plans p ON p.id=s.plan_id WHERE tenant_id=$1 FOR UPDATE OF s`, tenantID).Scan(&status, &usable, &used, &extra, &limit)
	if e != nil {
		return e
	}
	if status != "ACTIVE" || !usable {
		return errors.New("subscription inactive")
	}
	// Calendar-month window resets without extending the paid/manual expiry.
	_, e = tx.Exec(ctx, `UPDATE mirror.subscriptions SET period_start=date_trunc('month',now()),period_end=date_trunc('month',now())+interval '1 month',used=0 WHERE tenant_id=$1 AND period_end<=now()`, tenantID)
	if e != nil {
		return e
	}
	e = tx.QueryRow(ctx, "SELECT used FROM mirror.subscriptions WHERE tenant_id=$1", tenantID).Scan(&used)
	if e != nil {
		return e
	}
	tag, e := tx.Exec(ctx, "INSERT INTO mirror.credit_ledger(tenant_id,reference,delta) VALUES($1,$2,-1) ON CONFLICT DO NOTHING", tenantID, "tryon:"+reference)
	if e != nil || tag.RowsAffected() == 0 {
		return e
	}
	if used < limit {
		_, e = tx.Exec(ctx, "UPDATE mirror.subscriptions SET used=used+1 WHERE tenant_id=$1", tenantID)
	} else if extra > 0 {
		_, e = tx.Exec(ctx, "UPDATE mirror.subscriptions SET extra_credits=extra_credits-1 WHERE tenant_id=$1", tenantID)
	} else {
		return errors.New("try-on credit limit reached")
	}
	return e
}

type cartItem struct {
	ProductID string `json:"productId"`
	VariantID string `json:"variantId"`
	Qty       int    `json:"qty"`
}

func validItem(b cartItem) bool {
	return validID(b.ProductID) && validID(b.VariantID) && b.Qty > 0 && b.Qty <= 100
}
func (s *Server) cart(w http.ResponseWriter, r *http.Request) {
	u := current(r)
	var b struct {
		cartItem
		BranchID string `json:"branchId"`
	}
	if !decode(w, r, &b) {
		return
	}
	branch, ok := s.sessionBranch(r, b.BranchID)
	if !ok {
		problem(w, 403, "branch session required")
		return
	}
	if !validItem(b.cartItem) {
		problem(w, 400, "invalid cart item")
		return
	}
	tag, e := s.DB.Exec(r.Context(), `INSERT INTO mirror.carts(user_id,tenant_id,product_id,variant_id,qty) SELECT $1,$2,p.id,v.id,$5 FROM mirror.products p JOIN mirror.variants v ON v.product_id=p.id JOIN mirror.inventory i ON i.variant_id=v.id WHERE p.tenant_id=$2 AND p.id=$3 AND v.id=$4 AND v.active AND p.status='Published' AND i.branch_id=$6 AND i.quantity-i.blocked>=$5 ON CONFLICT(user_id,variant_id) DO UPDATE SET qty=LEAST(100,mirror.carts.qty+EXCLUDED.qty)`, u.ID, u.TenantID, b.ProductID, b.VariantID, b.Qty, branch)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 409, "product unavailable")
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
func (s *Server) checkout(w http.ResponseWriter, r *http.Request) {
	u := current(r)
	var b struct {
		Items    []cartItem `json:"items"`
		BranchID string     `json:"branchId"`
	}
	if !decode(w, r, &b) {
		return
	}
	branch, ok := s.sessionBranch(r, b.BranchID)
	if !ok {
		problem(w, 403, "branch session required")
		return
	}
	if len(b.Items) == 0 || len(b.Items) > 100 {
		problem(w, 400, "invalid items")
		return
	}
	seen := map[string]bool{}
	for _, i := range b.Items {
		if !validItem(i) || seen[i.VariantID] {
			problem(w, 400, "invalid or duplicate item")
			return
		}
		seen[i.VariantID] = true
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	id := uuid()
	_, e = tx.Exec(r.Context(), "INSERT INTO mirror.orders(id,tenant_id,user_id,branch_id) VALUES($1,$2,$3,$4)", id, u.TenantID, u.ID, branch)
	if e != nil {
		s.dbError(w, e)
		return
	}
	for _, i := range b.Items {
		tag, e := tx.Exec(r.Context(), `INSERT INTO mirror.order_items(order_id,tenant_id,product_id,variant_id,qty,price_cents) SELECT $1,$2,p.id,v.id,$5,p.price_cents FROM mirror.products p JOIN mirror.variants v ON v.product_id=p.id JOIN mirror.inventory i ON i.variant_id=v.id WHERE p.tenant_id=$2 AND p.id=$3 AND v.id=$4 AND v.active AND p.status='Published' AND i.branch_id=$6 AND i.quantity-i.blocked>=$5`, id, u.TenantID, i.ProductID, i.VariantID, i.Qty, branch)
		if e != nil {
			s.dbError(w, e)
			return
		}
		if tag.RowsAffected() != 1 {
			problem(w, 409, "product unavailable")
			return
		}
	}
	_, e = tx.Exec(r.Context(), "DELETE FROM mirror.carts WHERE user_id=$1", u.ID)
	if e == nil {
		e = s.audit(r.Context(), tx, u, "order.cashier_request", map[string]string{"id": id})
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 201, map[string]string{"id": id, "status": "SENT_TO_CASHIER"})
}
func (s *Server) orders(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, `SELECT to_jsonb(o)||jsonb_build_object('items',(SELECT jsonb_agg(to_jsonb(i)) FROM mirror.order_items i WHERE i.order_id=o.id)) FROM mirror.orders o WHERE tenant_id=$1 AND ($2='' OR branch_id=NULLIF($2,'')::uuid) ORDER BY created_at DESC LIMIT 500`, t, current(r).BranchID)
}
func (s *Server) notifications(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, "SELECT to_jsonb(n) FROM mirror.notifications n WHERE tenant_id=$1 AND ($2='' OR branch_id=NULLIF($2,'')::uuid) ORDER BY created_at DESC LIMIT 500", t, current(r).BranchID)
}
func (s *Server) readNotification(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	id := r.PathValue("id")
	if !ok || !validID(id) {
		problem(w, 400, "invalid scope or ID")
		return
	}
	var b struct {
		Read bool `json:"read"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !b.Read {
		problem(w, 400, "read must be true")
		return
	}
	tag, e := s.DB.Exec(r.Context(), "UPDATE mirror.notifications SET read_at=now() WHERE id=$1 AND tenant_id=$2 AND ($3='' OR branch_id=NULLIF($3,'')::uuid)", id, t, current(r).BranchID)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "notification not found")
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
func (s *Server) application(w http.ResponseWriter, r *http.Request) {
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	if !s.rateLimit("application:" + host) {
		problem(w, 429, "try again later")
		return
	}
	if !s.Config.AllowedOrigin(r.Header.Get("Origin")) {
		problem(w, 403, "trusted origin required")
		return
	}
	var b struct {
		ApplicationType   string `json:"applicationType"`
		CompanyName       string `json:"companyName"`
		ContactName       string `json:"contactName"`
		Email             string `json:"email"`
		Phone             string `json:"phone"`
		Country           string `json:"country"`
		Website           string `json:"website"`
		RequestedBranches *int   `json:"requestedBranches"`
		Message           string `json:"message"`
		Consent           bool   `json:"consent"`
		Fax               string `json:"fax"`
	}
	if !decode(w, r, &b) {
		return
	}
	if strings.TrimSpace(b.Fax) != "" {
		jsonResponse(w, 202, map[string]bool{"ok": true})
		return
	}
	_, e := mail.ParseAddress(b.Email)
	if e != nil || len(b.Email) > 254 || !contains([]string{"DEMO", "CONTACT", "PARTNERSHIP"}, b.ApplicationType) || len(strings.TrimSpace(b.CompanyName)) < 2 || len(b.CompanyName) > 120 || len(strings.TrimSpace(b.ContactName)) < 2 || len(b.ContactName) > 120 || !b.Consent || len(b.Phone) > 40 || len(b.Country) > 80 || len(b.Website) > 500 || len(b.Message) > 2000 || (b.RequestedBranches != nil && (*b.RequestedBranches < 1 || *b.RequestedBranches > 10000)) {
		problem(w, 400, "please check submitted fields")
		return
	}
	payload, _ := json.Marshal(b)
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var id string
	e = tx.QueryRow(r.Context(), "INSERT INTO mirror.applications(payload) VALUES($1) RETURNING id::text", string(payload)).Scan(&id)
	if e == nil {
		_, e = tx.Exec(r.Context(), "INSERT INTO mirror.application_events(application_id,event_type) VALUES($1,'SUBMITTED')", id)
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 201, map[string]bool{"ok": true})
}

func (s *Server) reviewApplication(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var b struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !validID(id) || !contains([]string{"REVIEWING", "MORE_INFORMATION_REQUIRED", "APPROVED", "REJECTED", "CLOSED"}, b.Status) {
		problem(w, 400, "invalid application status")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	tag, e := tx.Exec(r.Context(), "UPDATE mirror.applications SET status=$2 WHERE id=$1", id, b.Status)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "application not found")
		return
	}
	_, e = tx.Exec(r.Context(), "INSERT INTO mirror.application_events(application_id,event_type) VALUES($1,$2)", id, b.Status)
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "application.review", map[string]string{"id": id, "status": b.Status})
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

func (s *Server) MaintainSubscriptions(ctx context.Context) error {
	tx, e := s.DB.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(ctx)
	_, e = tx.Exec(ctx, "UPDATE mirror.subscriptions SET status='EXPIRED' WHERE expires_at<=now() AND status='ACTIVE'")
	if e != nil {
		return e
	}
	_, e = tx.Exec(ctx, "UPDATE mirror.subscriptions SET period_start=date_trunc('month',now()),period_end=date_trunc('month',now())+interval '1 month',used=0 WHERE status='ACTIVE' AND expires_at>now() AND period_end<=now()")
	if e != nil {
		return e
	}
	return tx.Commit(ctx)
}
