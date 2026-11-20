package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/mail"
	"strings"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

// Mirror pages: a smart mirror (device) with its own kiosk sign-in and a
// prepaid AI try-on limit. Each fitting start on that mirror uses one try-on.

// EstimatedTryOnCostCents is the provider cost estimate per 30-60 s Decart
// session shown in platform margins (Decart realtime ~ $0.02/s).
const EstimatedTryOnCostCents = 60

type packageRow struct {
	ID         string
	Credits    int
	PriceCents int
}

func (s *Server) loadPackage(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, id string) (packageRow, error) {
	var p packageRow
	e := q.QueryRow(ctx, "SELECT id,credits,COALESCE(price_cents,0) FROM mirror.credit_packages WHERE id=$1 AND active", id).Scan(&p.ID, &p.Credits, &p.PriceCents)
	return p, e
}

// Kiosk accounts only open the fitting room, so a shorter password is allowed.
func validKioskPassword(p string) bool { return len(p) >= 8 && len(p) <= 72 }

// createMirrorPage registers a smart mirror, its kiosk account and, optionally,
// its first try-on package (pending until the platform confirms payment).
func (s *Server) createMirrorPage(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var b struct {
		Name      string `json:"name"`
		BranchID  string `json:"branchId"`
		Layout    string `json:"layout"`
		Email     string `json:"email"`
		Password  string `json:"password"`
		PackageID string `json:"packageId"`
	}
	if !decode(w, r, &b) {
		return
	}
	b.Email = strings.ToLower(strings.TrimSpace(b.Email))
	if _, e := mail.ParseAddress(b.Email); e != nil || len(b.Email) > 254 || !validKioskPassword(b.Password) || !validID(b.BranchID) || strings.TrimSpace(b.Name) == "" || len(b.Name) > 120 || !contains([]string{"", "landscape", "portrait"}, b.Layout) {
		problem(w, 400, "check the mirror name, branch, sign-in email and password (8+ characters)")
		return
	}
	hash, e := bcrypt.GenerateFromPassword([]byte(b.Password), 12)
	if e != nil {
		s.dbError(w, e)
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var limit, count int
	if e = tx.QueryRow(r.Context(), "SELECT p.device_limit FROM mirror.subscriptions s JOIN mirror.plans p ON p.id=s.plan_id WHERE s.tenant_id=$1 AND s.status='ACTIVE' AND s.expires_at>now() FOR UPDATE OF s", t).Scan(&limit); e != nil {
		problem(w, 409, "active subscription required")
		return
	}
	if e = tx.QueryRow(r.Context(), "SELECT count(*) FROM mirror.devices WHERE tenant_id=$1", t).Scan(&count); e != nil {
		s.dbError(w, e)
		return
	}
	if count >= limit {
		problem(w, 409, "device limit reached")
		return
	}
	var exists bool
	if e = tx.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM mirror.users WHERE email=$1)", b.Email).Scan(&exists); e != nil || exists {
		problem(w, 409, "this sign-in email is already used")
		return
	}
	var userID, deviceID string
	e = tx.QueryRow(r.Context(), "INSERT INTO mirror.users(tenant_id,branch_id,email,password_hash,role) VALUES($1,$2,$3,$4,'STAFF') RETURNING id::text", t, b.BranchID, b.Email, string(hash)).Scan(&userID)
	if e == nil {
		layout := b.Layout
		if layout == "" {
			layout = "landscape"
		}
		config, _ := json.Marshal(map[string]string{"layout": layout})
		e = tx.QueryRow(r.Context(), "INSERT INTO mirror.devices(tenant_id,branch_id,name,configuration,user_id) VALUES($1,$2,$3,$4,$5) RETURNING id::text", t, b.BranchID, strings.TrimSpace(b.Name), string(config), userID).Scan(&deviceID)
	}
	if e == nil && b.PackageID != "" {
		var p packageRow
		if p, e = s.loadPackage(r.Context(), tx, b.PackageID); e == nil {
			e = s.addPurchase(r.Context(), tx, current(r), t, deviceID, p, "INITIAL")
		}
	}
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "mirror.create", map[string]string{"id": deviceID, "name": b.Name})
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 201, map[string]string{"id": deviceID, "userId": userID})
}

// addPurchase records a package for a mirror. The Super Admin sells it
// directly (paid and credited at once); a brand's own request waits for the
// platform to confirm payment.
func (s *Server) addPurchase(ctx context.Context, tx pgx.Tx, u User, tenantID, deviceID string, p packageRow, kind string) error {
	status := "PENDING"
	if u.Role == "SUPER_ADMIN" {
		status = "PAID"
	}
	_, e := tx.Exec(ctx, `INSERT INTO mirror.limit_purchases(tenant_id,device_id,package_id,kind,tryons,amount_cents,status,requested_by,confirmed_by,paid_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $7='PAID' THEN $8::uuid END,CASE WHEN $7='PAID' THEN now() END)`, tenantID, deviceID, p.ID, kind, p.Credits, p.PriceCents, status, u.ID)
	if e == nil && status == "PAID" {
		_, e = tx.Exec(ctx, "UPDATE mirror.devices SET tryon_limit=tryon_limit+$2 WHERE id=$1", deviceID, p.Credits)
	}
	return e
}

func (s *Server) buyLimit(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	id := r.PathValue("id")
	if !ok || !validID(id) {
		problem(w, 400, "invalid scope or mirror")
		return
	}
	var b struct {
		PackageID string `json:"packageId"`
	}
	if !decode(w, r, &b) {
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var exists bool
	if e = tx.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM mirror.devices WHERE id=$1 AND tenant_id=$2)", id, t).Scan(&exists); e != nil || !exists {
		problem(w, 404, "mirror not found")
		return
	}
	p, e := s.loadPackage(r.Context(), tx, b.PackageID)
	if e != nil {
		problem(w, 400, "choose a try-on package")
		return
	}
	if e = s.addPurchase(r.Context(), tx, current(r), t, id, p, "TOPUP"); e == nil {
		e = s.audit(r.Context(), tx, current(r), "limit.purchase", map[string]any{"id": id, "tryons": p.Credits, "amountCents": p.PriceCents})
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

// confirmPurchase marks a pending package paid (adds the try-ons) or cancelled.
func (s *Server) confirmPurchase(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var b struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !validID(id) || !contains([]string{"PAID", "CANCELLED"}, b.Status) {
		problem(w, 400, "invalid purchase status")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var device string
	var tryons int
	e = tx.QueryRow(r.Context(), "UPDATE mirror.limit_purchases SET status=$2,confirmed_by=$3,paid_at=CASE WHEN $2='PAID' THEN now() END WHERE id=$1 AND status='PENDING' RETURNING device_id::text,tryons", id, b.Status, current(r).ID).Scan(&device, &tryons)
	if e != nil {
		problem(w, 409, "purchase is not pending")
		return
	}
	if b.Status == "PAID" {
		_, e = tx.Exec(r.Context(), "UPDATE mirror.devices SET tryon_limit=tryon_limit+$2 WHERE id=$1", device, tryons)
	}
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "limit.confirm", map[string]string{"id": id, "status": b.Status})
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

func (s *Server) limitPurchases(w http.ResponseWriter, r *http.Request) {
	const q = `SELECT to_jsonb(p)||jsonb_build_object('brand',t.name,'mirror',d.name) FROM mirror.limit_purchases p JOIN mirror.tenants t ON t.id=p.tenant_id JOIN mirror.devices d ON d.id=p.device_id `
	if current(r).Role == "SUPER_ADMIN" && r.URL.Query().Get("scope") == "platform" {
		s.list(w, r, q+"ORDER BY p.created_at DESC LIMIT 500")
		return
	}
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, q+"WHERE p.tenant_id=$1 ORDER BY p.created_at DESC LIMIT 500", t)
}

func (s *Server) updatePackage(w http.ResponseWriter, r *http.Request) {
	var b struct {
		PriceCents int `json:"priceCents"`
		Credits    int `json:"credits"`
	}
	if !decode(w, r, &b) {
		return
	}
	if b.PriceCents < 0 || b.PriceCents > 100000000 || b.Credits < 1 || b.Credits > 1000000 {
		problem(w, 400, "invalid package")
		return
	}
	tag, e := s.DB.Exec(r.Context(), "UPDATE mirror.credit_packages SET price_cents=$2,credits=$3 WHERE id=$1", r.PathValue("id"), b.PriceCents, b.Credits)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "package not found")
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

// mirrorPages lists mirrors with their limit, usage and sales for ?days=N.
func (s *Server) mirrorPages(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, `
WITH since AS (SELECT date_trunc('day',now())-($3::int-1)*interval '1 day' AS t0),
     f AS (SELECT created_at, details->>'deviceId' AS device FROM mirror.audit_logs WHERE tenant_id=$1 AND action='fitting.start')
SELECT jsonb_build_object('id',d.id,'name',d.name,'branchId',d.branch_id,'branch',b.name,'status',d.status,'lastSeen',d.last_seen,'createdAt',d.created_at,
 'layout',d.configuration->>'layout','email',u.email,'userId',u.id,'accountStatus',u.status,
 'tryonLimit',d.tryon_limit,'tryonsUsed',d.tryons_used,'remaining',GREATEST(d.tryon_limit-d.tryons_used,0),
 'today',(SELECT count(*) FROM f WHERE f.device=d.id::text AND f.created_at>=date_trunc('day',now())),
 'fittings',(SELECT count(*) FROM f,since WHERE f.device=d.id::text AND f.created_at>=since.t0),
 'requests',(SELECT count(*) FROM mirror.orders o,since WHERE o.device_id=d.id AND o.created_at>=since.t0),
 'sold',(SELECT count(*) FROM mirror.orders o,since WHERE o.device_id=d.id AND o.status='COMPLETED' AND o.created_at>=since.t0),
 'soldValue',(SELECT COALESCE(SUM(i.qty*i.price_cents),0)/100.0 FROM mirror.orders o JOIN mirror.order_items i ON i.order_id=o.id,since WHERE o.device_id=d.id AND o.status='COMPLETED' AND o.created_at>=since.t0),
 'avgDaily',(SELECT round(count(*)::numeric/$3,1) FROM f,since WHERE f.device=d.id::text AND f.created_at>=since.t0),
 'paidCents',(SELECT COALESCE(SUM(amount_cents),0) FROM mirror.limit_purchases p WHERE p.device_id=d.id AND p.status='PAID'),
 'pending',(SELECT count(*) FROM mirror.limit_purchases p WHERE p.device_id=d.id AND p.status='PENDING'),
 'series',(SELECT COALESCE(jsonb_agg(jsonb_build_object('date',to_char(x,'YYYY-MM-DD'),'fittings',(SELECT count(*) FROM f WHERE f.device=d.id::text AND f.created_at>=x AND f.created_at<x+interval '1 day')) ORDER BY x),'[]'::jsonb) FROM since, generate_series(since.t0,date_trunc('day',now()),interval '1 day') x))
FROM mirror.devices d JOIN mirror.branches b ON b.id=d.branch_id LEFT JOIN mirror.users u ON u.id=d.user_id
WHERE d.tenant_id=$1 AND ($2='' OR d.branch_id=NULLIF($2,'')::uuid) ORDER BY d.created_at`, t, current(r).BranchID, periodDays(r))
}

func (s *Server) renameMirror(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	id := r.PathValue("id")
	var b struct {
		Name string `json:"name"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !ok || !validID(id) || strings.TrimSpace(b.Name) == "" || len(b.Name) > 120 {
		problem(w, 400, "invalid mirror name")
		return
	}
	tag, e := s.DB.Exec(r.Context(), "UPDATE mirror.devices SET name=$3 WHERE id=$1 AND tenant_id=$2", id, t, strings.TrimSpace(b.Name))
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "mirror not found")
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

// platformRevenue: money and usage per brand and in total for the Super Admin.
func (s *Server) platformRevenue(w http.ResponseWriter, r *http.Request) {
	var out []byte
	e := s.DB.QueryRow(r.Context(), `
WITH since AS (SELECT date_trunc('day',now())-($1::int-1)*interval '1 day' AS t0),
 b AS (SELECT t.id,t.name,t.status,s.plan_id,COALESCE(p.price_cents,0) AS plan_cents,s.expires_at,
   (SELECT count(*) FROM mirror.devices d WHERE d.tenant_id=t.id) AS mirrors,
   (SELECT count(*) FROM mirror.devices d WHERE d.tenant_id=t.id AND d.last_seen>now()-interval '5 minutes') AS online,
   (SELECT COALESCE(SUM(d.tryon_limit),0) FROM mirror.devices d WHERE d.tenant_id=t.id) AS tryons_bought,
   (SELECT COALESCE(SUM(d.tryons_used),0) FROM mirror.devices d WHERE d.tenant_id=t.id) AS tryons_used,
   (SELECT count(*) FROM mirror.audit_logs a,since WHERE a.tenant_id=t.id AND a.action='fitting.start' AND a.created_at>=since.t0) AS fittings,
   (SELECT COALESCE(SUM(amount_cents),0) FROM mirror.limit_purchases x WHERE x.tenant_id=t.id AND x.status='PAID' AND x.kind='INITIAL') AS initial_cents,
   (SELECT COALESCE(SUM(amount_cents),0) FROM mirror.limit_purchases x WHERE x.tenant_id=t.id AND x.status='PAID' AND x.kind='TOPUP') AS topup_cents,
   (SELECT COALESCE(SUM(amount_cents),0) FROM mirror.limit_purchases x,since WHERE x.tenant_id=t.id AND x.status='PAID' AND x.paid_at>=since.t0) AS period_cents,
   (SELECT COALESCE(SUM(amount_cents),0) FROM mirror.limit_purchases x WHERE x.tenant_id=t.id AND x.status='PENDING') AS pending_cents,
   (SELECT count(*) FROM mirror.limit_purchases x WHERE x.tenant_id=t.id AND x.status='PAID' AND x.kind='TOPUP') AS topups,
   (SELECT COALESCE(SUM(i.qty*i.price_cents),0) FROM mirror.orders o JOIN mirror.order_items i ON i.order_id=o.id,since WHERE o.tenant_id=t.id AND o.status='COMPLETED' AND o.created_at>=since.t0) AS store_sales_cents
  FROM mirror.tenants t LEFT JOIN mirror.subscriptions s ON s.tenant_id=t.id LEFT JOIN mirror.plans p ON p.id=s.plan_id)
SELECT jsonb_build_object('days',$1::int,'tryOnCostCents',$2::int,
 'totals',(SELECT jsonb_build_object(
   'brands',count(*),'mirrors',COALESCE(SUM(mirrors),0),'onlineMirrors',COALESCE(SUM(online),0),
   'mrr',COALESCE(SUM(plan_cents) FILTER (WHERE status='ACTIVE' AND expires_at>now()),0)/100.0,
   'limitRevenue',COALESCE(SUM(initial_cents+topup_cents),0)/100.0,'initialRevenue',COALESCE(SUM(initial_cents),0)/100.0,'topupRevenue',COALESCE(SUM(topup_cents),0)/100.0,
   'periodLimitRevenue',COALESCE(SUM(period_cents),0)/100.0,'pending',COALESCE(SUM(pending_cents),0)/100.0,
   'tryonsBought',COALESCE(SUM(tryons_bought),0),'tryonsUsed',COALESCE(SUM(tryons_used),0),'fittings',COALESCE(SUM(fittings),0),
   'estimatedCost',COALESCE(SUM(fittings),0)*$2/100.0,'storeSales',COALESCE(SUM(store_sales_cents),0)/100.0) FROM b),
 'brands',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status,'planId',plan_id,'plan',plan_cents/100.0,
   'mirrors',mirrors,'online',online,'tryonsBought',tryons_bought,'tryonsUsed',tryons_used,'remaining',GREATEST(tryons_bought-tryons_used,0),'fittings',fittings,
   'initialRevenue',initial_cents/100.0,'topupRevenue',topup_cents/100.0,'topups',topups,'pending',pending_cents/100.0,'periodRevenue',period_cents/100.0,
   'totalRevenue',(initial_cents+topup_cents)/100.0,'estimatedCost',fittings*$2/100.0,'storeSales',store_sales_cents/100.0) ORDER BY (initial_cents+topup_cents) DESC, name),'[]'::jsonb) FROM b),
 'series',(SELECT COALESCE(jsonb_agg(jsonb_build_object('date',to_char(x,'YYYY-MM-DD'),
   'revenue',(SELECT COALESCE(SUM(amount_cents),0)/100.0 FROM mirror.limit_purchases p WHERE p.status='PAID' AND p.paid_at>=x AND p.paid_at<x+interval '1 day'),
   'fittings',(SELECT count(*) FROM mirror.audit_logs a WHERE a.action='fitting.start' AND a.created_at>=x AND a.created_at<x+interval '1 day')) ORDER BY x),'[]'::jsonb)
   FROM since, generate_series(since.t0,date_trunc('day',now()),interval '1 day') x))`, periodDays(r), EstimatedTryOnCostCents).Scan(&out)
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, json.RawMessage(out))
}

// verifyPassword lets the kiosk confirm its own password before signing out.
func (s *Server) verifyPassword(w http.ResponseWriter, r *http.Request) {
	u := current(r)
	var b struct {
		Password string `json:"password"`
	}
	if !decode(w, r, &b) {
		return
	}
	key := "verify:" + u.ID
	if s.limited(key) {
		problem(w, 429, "try again later")
		return
	}
	var hash string
	if e := s.DB.QueryRow(r.Context(), "SELECT password_hash FROM mirror.users WHERE id=$1", u.ID).Scan(&hash); e != nil {
		s.dbError(w, e)
		return
	}
	if len(b.Password) > 72 || bcrypt.CompareHashAndPassword([]byte(hash), []byte(b.Password)) != nil {
		s.rateLimit(key)
		problem(w, 403, "wrong password")
		return
	}
	s.resetLimit(key)
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

// me returns the signed-in user and, for a kiosk account, its mirror.
func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	u := current(r)
	out := map[string]any{"user": u}
	if s.DB != nil {
		var id, name, branch string
		if e := s.DB.QueryRow(r.Context(), "SELECT id::text,name,branch_id::text FROM mirror.devices WHERE user_id=$1", u.ID).Scan(&id, &name, &branch); e == nil {
			out["device"] = map[string]string{"id": id, "name": name, "branchId": branch}
		}
	}
	jsonResponse(w, 200, out)
}

// kioskDevice resolves the mirror that a fitting or order belongs to: the
// kiosk account's own mirror, else a mirror of the tenant the kiosk names.
func (s *Server) kioskDevice(ctx context.Context, u User, requested string) string {
	var id string
	if e := s.DB.QueryRow(ctx, "SELECT id::text FROM mirror.devices WHERE user_id=$1", u.ID).Scan(&id); e == nil {
		return id
	}
	if !validID(requested) {
		return ""
	}
	if e := s.DB.QueryRow(ctx, "SELECT id::text FROM mirror.devices WHERE id=$1 AND tenant_id=$2 AND ($3='' OR branch_id=NULLIF($3,'')::uuid)", requested, u.TenantID, u.BranchID).Scan(&id); e == nil {
		return id
	}
	return ""
}
