package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// Endpoints used by the admin consoles. They reuse the existing schema: try-on
// (fitting) starts are recorded as audit_logs rows with action 'fitting.start',
// so no migration is required for statistics.

func periodDays(r *http.Request) int {
	d, e := strconv.Atoi(r.URL.Query().Get("days"))
	if e != nil || d < 1 {
		return 30
	}
	if d > 365 {
		return 365
	}
	return d
}

// analytics returns real tenant (or branch) statistics for the period ?days=N.
func (s *Server) analytics(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	days := periodDays(r)
	var out []byte
	e := s.DB.QueryRow(r.Context(), `
WITH f AS (SELECT a.created_at, a.details->>'productId' AS product_id, a.details->>'branchId' AS branch_id FROM mirror.audit_logs a
           WHERE a.tenant_id=$1 AND a.action='fitting.start' AND ($2='' OR a.details->>'branchId'=$2)),
     o AS (SELECT o.id, o.created_at, o.status, o.branch_id, COALESCE((SELECT SUM(i.qty*i.price_cents) FROM mirror.order_items i WHERE i.order_id=o.id),0) AS value_cents,
                  COALESCE((SELECT SUM(i.qty) FROM mirror.order_items i WHERE i.order_id=o.id),0) AS units
           FROM mirror.orders o WHERE o.tenant_id=$1 AND ($2='' OR o.branch_id=NULLIF($2,'')::uuid)),
     since AS (SELECT date_trunc('day',now())-($3::int-1)*interval '1 day' AS t0)
SELECT jsonb_build_object(
 'days',$3::int,
 'tryonSessions',(SELECT count(*) FROM f,since WHERE f.created_at>=since.t0),
 'fittingsTotal',(SELECT count(*) FROM f),
 'activeBranches',(SELECT count(*) FROM mirror.branches WHERE tenant_id=$1 AND status='ACTIVE' AND ($2='' OR id=NULLIF($2,'')::uuid)),
 'branches',(SELECT count(*) FROM mirror.branches WHERE tenant_id=$1 AND ($2='' OR id=NULLIF($2,'')::uuid)),
 'activeDevices',(SELECT count(*) FROM mirror.devices WHERE tenant_id=$1 AND last_seen>now()-interval '5 minutes' AND ($2='' OR branch_id=NULLIF($2,'')::uuid)),
 'devices',(SELECT count(*) FROM mirror.devices WHERE tenant_id=$1 AND ($2='' OR branch_id=NULLIF($2,'')::uuid)),
 'cashierRequests',(SELECT count(*) FROM o,since WHERE o.created_at>=since.t0),
 'ordersTotal',(SELECT count(*) FROM o),
 'completedOrders',(SELECT count(*) FROM o,since WHERE o.created_at>=since.t0 AND o.status='COMPLETED'),
 'orderValue',(SELECT COALESCE(SUM(value_cents),0)/100.0 FROM o,since WHERE o.created_at>=since.t0 AND o.status<>'CANCELLED'),
 'completedValue',(SELECT COALESCE(SUM(value_cents),0)/100.0 FROM o,since WHERE o.created_at>=since.t0 AND o.status='COMPLETED'),
 'unitsRequested',(SELECT COALESCE(SUM(units),0) FROM o,since WHERE o.created_at>=since.t0 AND o.status<>'CANCELLED'),
 'products',(SELECT count(*) FROM mirror.products WHERE tenant_id=$1 AND status<>'Archived'),
 'publishedProducts',(SELECT count(*) FROM mirror.products WHERE tenant_id=$1 AND status='Published'),
 'inventoryUnits',(SELECT COALESCE(SUM(quantity-blocked),0) FROM mirror.inventory WHERE tenant_id=$1 AND ($2='' OR branch_id=NULLIF($2,'')::uuid)),
 'lowStock',(SELECT count(*) FROM mirror.inventory i JOIN mirror.variants v ON v.id=i.variant_id AND v.active WHERE i.tenant_id=$1 AND i.quantity-i.blocked<=3 AND ($2='' OR i.branch_id=NULLIF($2,'')::uuid)),
 'series',(SELECT COALESCE(jsonb_agg(jsonb_build_object('date',to_char(d,'YYYY-MM-DD'),
     'fittings',(SELECT count(*) FROM f WHERE f.created_at>=d AND f.created_at<d+interval '1 day'),
     'orders',(SELECT count(*) FROM o WHERE o.created_at>=d AND o.created_at<d+interval '1 day'),
     'value',(SELECT COALESCE(SUM(value_cents),0)/100.0 FROM o WHERE o.created_at>=d AND o.created_at<d+interval '1 day' AND o.status<>'CANCELLED')) ORDER BY d),'[]'::jsonb)
   FROM since, generate_series(since.t0, date_trunc('day',now()), interval '1 day') d),
 'topProducts',(SELECT COALESCE(jsonb_agg(x ORDER BY x.fittings DESC),'[]'::jsonb) FROM (SELECT p.id, p.name, count(*) AS fittings FROM f JOIN since ON f.created_at>=since.t0 JOIN mirror.products p ON p.id::text=f.product_id AND p.tenant_id=$1 GROUP BY p.id,p.name ORDER BY count(*) DESC LIMIT 5) x),
 'topOrdered',(SELECT COALESCE(jsonb_agg(x ORDER BY x.units DESC),'[]'::jsonb) FROM (SELECT p.id, p.name, SUM(i.qty) AS units FROM o JOIN since ON o.created_at>=since.t0 JOIN mirror.order_items i ON i.order_id=o.id JOIN mirror.products p ON p.id=i.product_id WHERE o.status<>'CANCELLED' GROUP BY p.id,p.name ORDER BY SUM(i.qty) DESC LIMIT 5) x),
 'branchBreakdown',(SELECT COALESCE(jsonb_agg(x ORDER BY x.fittings DESC),'[]'::jsonb) FROM (SELECT b.id, b.name,
     (SELECT count(*) FROM f,since WHERE f.created_at>=since.t0 AND f.branch_id=b.id::text) AS fittings,
     (SELECT count(*) FROM o,since WHERE o.created_at>=since.t0 AND o.branch_id=b.id) AS orders
   FROM mirror.branches b WHERE b.tenant_id=$1 AND ($2='' OR b.id=NULLIF($2,'')::uuid)) x),
 'salesDataAvailable',false)`, t, current(r).BranchID, days).Scan(&out)
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, json.RawMessage(out))
}

// platformStats is the Super Admin overview across every brand.
func (s *Server) platformStats(w http.ResponseWriter, r *http.Request) {
	days := periodDays(r)
	var out []byte
	e := s.DB.QueryRow(r.Context(), `
WITH since AS (SELECT date_trunc('day',now())-($1::int-1)*interval '1 day' AS t0),
     f AS (SELECT created_at, tenant_id FROM mirror.audit_logs WHERE action='fitting.start')
SELECT jsonb_build_object(
 'days',$1::int,
 'brands',(SELECT count(*) FROM mirror.tenants),
 'activeBrands',(SELECT count(*) FROM mirror.tenants WHERE status='ACTIVE'),
 'suspendedBrands',(SELECT count(*) FROM mirror.tenants WHERE status='SUSPENDED'),
 'branches',(SELECT count(*) FROM mirror.branches),
 'devices',(SELECT count(*) FROM mirror.devices),
 'onlineDevices',(SELECT count(*) FROM mirror.devices WHERE last_seen>now()-interval '5 minutes'),
 'users',(SELECT count(*) FROM mirror.users WHERE role<>'SUPER_ADMIN'),
 'products',(SELECT count(*) FROM mirror.products WHERE status<>'Archived'),
 'applications',(SELECT count(*) FROM mirror.applications),
 'newApplications',(SELECT count(*) FROM mirror.applications WHERE status IN ('NEW','REVIEWING','MORE_INFORMATION_REQUIRED')),
 'applicationsByStatus',(SELECT COALESCE(jsonb_object_agg(status,c),'{}'::jsonb) FROM (SELECT status,count(*) c FROM mirror.applications GROUP BY status) x),
 'fittings',(SELECT count(*) FROM f,since WHERE f.created_at>=since.t0),
 'orders',(SELECT count(*) FROM mirror.orders,since WHERE created_at>=since.t0),
 'mrr',(SELECT COALESCE(SUM(p.price_cents),0)/100.0 FROM mirror.subscriptions s JOIN mirror.plans p ON p.id=s.plan_id JOIN mirror.tenants t ON t.id=s.tenant_id WHERE s.status='ACTIVE' AND s.expires_at>now() AND t.status='ACTIVE'),
 'plans',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'brands',(SELECT count(*) FROM mirror.subscriptions s WHERE s.plan_id=p.id AND s.status='ACTIVE')) ORDER BY p.price_cents),'[]'::jsonb) FROM mirror.plans p),
 'series',(SELECT COALESCE(jsonb_agg(jsonb_build_object('date',to_char(d,'YYYY-MM-DD'),
     'fittings',(SELECT count(*) FROM f WHERE f.created_at>=d AND f.created_at<d+interval '1 day'),
     'orders',(SELECT count(*) FROM mirror.orders o WHERE o.created_at>=d AND o.created_at<d+interval '1 day'),
     'applications',(SELECT count(*) FROM mirror.applications a WHERE a.created_at>=d AND a.created_at<d+interval '1 day')) ORDER BY d),'[]'::jsonb)
   FROM since, generate_series(since.t0, date_trunc('day',now()), interval '1 day') d),
 'topBrands',(SELECT COALESCE(jsonb_agg(x ORDER BY x.fittings DESC),'[]'::jsonb) FROM (SELECT t.id,t.name,(SELECT count(*) FROM f,since WHERE f.tenant_id=t.id AND f.created_at>=since.t0) AS fittings FROM mirror.tenants t ORDER BY 3 DESC LIMIT 5) x))`, days).Scan(&out)
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, json.RawMessage(out))
}

// brands lists tenants with their subscription and size, for the platform console.
func (s *Server) brands(w http.ResponseWriter, r *http.Request) {
	u := current(r)
	s.list(w, r, `SELECT to_jsonb(t)||jsonb_build_object('planId',s.plan_id,'subscriptionStatus',s.status,'expiresAt',s.expires_at,'used',s.used,'extraCredits',s.extra_credits,
  'branches',(SELECT count(*) FROM mirror.branches b WHERE b.tenant_id=t.id),
  'users',(SELECT count(*) FROM mirror.users x WHERE x.tenant_id=t.id),
  'products',(SELECT count(*) FROM mirror.products p WHERE p.tenant_id=t.id AND p.status<>'Archived'),
  'devices',(SELECT count(*) FROM mirror.devices d WHERE d.tenant_id=t.id))
 FROM mirror.tenants t LEFT JOIN mirror.subscriptions s ON s.tenant_id=t.id
 WHERE ($1='SUPER_ADMIN' OR t.id=NULLIF($2,'')::uuid) ORDER BY t.created_at DESC LIMIT 500`, u.Role, u.TenantID)
}

// auditLogs: ?scope=platform lets the Super Admin read every log, including
// platform actions that have no tenant.
func (s *Server) auditLogs(w http.ResponseWriter, r *http.Request) {
	const q = `SELECT to_jsonb(a)||jsonb_build_object('actor',COALESCE(u.email,'')) FROM mirror.audit_logs a LEFT JOIN mirror.users u ON u.id=a.actor_id `
	if current(r).Role == "SUPER_ADMIN" && r.URL.Query().Get("scope") == "platform" {
		s.list(w, r, q+"ORDER BY a.created_at DESC LIMIT 500")
		return
	}
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, q+"WHERE a.tenant_id=$1 ORDER BY a.created_at DESC LIMIT 500", t)
}

func validPassword(p string) bool { return len(p) >= 12 && len(p) <= 72 }

// changePassword lets any signed-in user replace their own password.
func (s *Server) changePassword(w http.ResponseWriter, r *http.Request) {
	u := current(r)
	var b struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !validPassword(b.NewPassword) || len(b.CurrentPassword) > 72 {
		problem(w, 400, "the new password must be 12 to 72 characters")
		return
	}
	key := "password:" + u.ID
	if s.limited(key) {
		problem(w, 429, "try again later")
		return
	}
	var hash string
	if e := s.DB.QueryRow(r.Context(), "SELECT password_hash FROM mirror.users WHERE id=$1", u.ID).Scan(&hash); e != nil {
		s.dbError(w, e)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(b.CurrentPassword)) != nil {
		s.rateLimit(key)
		problem(w, 403, "current password is incorrect")
		return
	}
	next, e := bcrypt.GenerateFromPassword([]byte(b.NewPassword), 12)
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
	_, e = tx.Exec(r.Context(), "UPDATE mirror.users SET password_hash=$2 WHERE id=$1", u.ID, string(next))
	if e == nil {
		// Sign out every other device; keep this session.
		_, e = tx.Exec(r.Context(), "UPDATE mirror.sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL", u.ID, u.SessionID)
	}
	if e == nil {
		e = s.audit(r.Context(), tx, u, "user.password", map[string]string{"id": u.ID})
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	s.resetLimit(key)
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

// resetUserPassword lets a Brand Admin (own brand) or the Super Admin set a new
// password for a staff/admin account. Super Admin accounts cannot be reset here.
func (s *Server) resetUserPassword(w http.ResponseWriter, r *http.Request) {
	u := current(r)
	id := r.PathValue("id")
	var b struct {
		Password string `json:"password"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !validID(id) || !validPassword(b.Password) || id == u.ID {
		problem(w, 400, "password must be 12 to 72 characters; use account settings for your own password")
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
	scope := u.TenantID // Brand Admins only reach their own brand.
	if u.Role == "SUPER_ADMIN" {
		scope = ""
	}
	tag, e := tx.Exec(r.Context(), "UPDATE mirror.users SET password_hash=$3 WHERE id=$1 AND role<>'SUPER_ADMIN' AND ($2='' OR tenant_id=NULLIF($2,'')::uuid)", id, scope, string(hash))
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "user not found")
		return
	}
	_, e = tx.Exec(r.Context(), "UPDATE mirror.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", id)
	if e == nil {
		e = s.audit(r.Context(), tx, u, "user.password_reset", map[string]string{"id": id})
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

// updateOrder moves a cashier request to COMPLETED (sold) or CANCELLED.
func (s *Server) updateOrder(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	id := r.PathValue("id")
	if !ok || !validID(id) {
		problem(w, 400, "invalid scope or order")
		return
	}
	var b struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !contains([]string{"SENT_TO_CASHIER", "COMPLETED", "CANCELLED"}, b.Status) {
		problem(w, 400, "invalid order status")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var previous, branch string
	e = tx.QueryRow(r.Context(), "SELECT status,branch_id::text FROM mirror.orders WHERE id=$1 AND tenant_id=$2 AND ($3='' OR branch_id=NULLIF($3,'')::uuid) FOR UPDATE", id, t, current(r).BranchID).Scan(&previous, &branch)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if _, e = tx.Exec(r.Context(), "UPDATE mirror.orders SET status=$2 WHERE id=$1", id, b.Status); e != nil {
		s.dbError(w, e)
		return
	}
	// A sale takes the items out of branch stock; undoing a sale puts them back.
	if previous != "COMPLETED" && b.Status == "COMPLETED" {
		_, e = tx.Exec(r.Context(), "UPDATE mirror.inventory v SET quantity=GREATEST(v.quantity-i.qty,v.blocked) FROM mirror.order_items i WHERE i.order_id=$1 AND v.variant_id=i.variant_id AND v.branch_id=$2 AND v.tenant_id=$3", id, branch, t)
	} else if previous == "COMPLETED" && b.Status != "COMPLETED" {
		_, e = tx.Exec(r.Context(), "UPDATE mirror.inventory v SET quantity=v.quantity+i.qty FROM mirror.order_items i WHERE i.order_id=$1 AND v.variant_id=i.variant_id AND v.branch_id=$2 AND v.tenant_id=$3", id, branch, t)
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	if e = s.audit(r.Context(), tx, current(r), "order.status", map[string]string{"id": id, "status": b.Status}); e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

// updateBranch renames a branch or switches it ACTIVE/INACTIVE.
func (s *Server) updateBranch(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	id := r.PathValue("id")
	if !ok || !validID(id) {
		problem(w, 400, "invalid scope or branch")
		return
	}
	var b struct {
		Name    string `json:"name"`
		Address string `json:"address"`
		Status  string `json:"status"`
	}
	if !decode(w, r, &b) {
		return
	}
	if strings.TrimSpace(b.Name) == "" || len(b.Name) > 120 || len(b.Address) > 500 || !contains([]string{"ACTIVE", "INACTIVE"}, b.Status) {
		problem(w, 400, "invalid branch")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	tag, e := tx.Exec(r.Context(), "UPDATE mirror.branches SET name=$3,address=$4,status=$5 WHERE id=$1 AND tenant_id=$2", id, t, strings.TrimSpace(b.Name), b.Address, b.Status)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "branch not found")
		return
	}
	if e = s.audit(r.Context(), tx, current(r), "branch.update", map[string]string{"id": id, "status": b.Status}); e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

// deviceHeartbeat marks a smart mirror online. The kiosk calls it every minute.
func (s *Server) deviceHeartbeat(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	id := r.PathValue("id")
	if !ok || !validID(id) {
		problem(w, 400, "invalid scope or device")
		return
	}
	tag, e := s.DB.Exec(r.Context(), "UPDATE mirror.devices SET last_seen=now(),status='ACTIVE' WHERE id=$1 AND tenant_id=$2 AND ($3='' OR branch_id=NULLIF($3,'')::uuid)", id, t, current(r).BranchID)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "device not found")
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

// sessionBranch resolves the branch for kiosk cart/checkout. Branch accounts
// always use their own branch; brand-level accounts must name a branch of
// their tenant (the kiosk lets them choose one).
func (s *Server) sessionBranch(r *http.Request, requested string) (string, bool) {
	u := current(r)
	if u.BranchID != "" {
		return u.BranchID, true
	}
	t, ok := tenant(r)
	if !ok || !validID(requested) || (u.Role != "BRAND_ADMIN" && u.Role != "SUPER_ADMIN") {
		return "", false
	}
	var exists bool
	if e := s.DB.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM mirror.branches WHERE id=$1 AND tenant_id=$2)", requested, t).Scan(&exists); e != nil || !exists {
		return "", false
	}
	return requested, true
}
