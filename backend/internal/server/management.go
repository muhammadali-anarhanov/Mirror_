package server

import (
	"encoding/json"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"net/mail"
	"strings"
)

func (s *Server) list(w http.ResponseWriter, r *http.Request, query string, args ...any) {
	rows, e := s.DB.Query(r.Context(), query, args...)
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer rows.Close()
	out := []json.RawMessage{}
	for rows.Next() {
		var b []byte
		if e = rows.Scan(&b); e != nil {
			s.dbError(w, e)
			return
		}
		out = append(out, json.RawMessage(b))
	}
	if e = rows.Err(); e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, out)
}
func (s *Server) updateBrand(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var b struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !validID(id) || !contains([]string{"ACTIVE", "SUSPENDED"}, b.Status) || len(strings.TrimSpace(b.Reason)) < 5 || len(b.Reason) > 500 {
		problem(w, 400, "valid status and reason required")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	tag, e := tx.Exec(r.Context(), "UPDATE mirror.tenants SET status=$2 WHERE id=$1", id, b.Status)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "brand not found")
		return
	}
	_, e = tx.Exec(r.Context(), "UPDATE mirror.sessions SET revoked_at=now() WHERE user_id IN (SELECT id FROM mirror.users WHERE tenant_id=$1)", id)
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "brand.status", map[string]string{"id": id, "status": b.Status, "reason": b.Reason})
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
func (s *Server) createBrand(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Name string `json:"name"`
	}
	if !decode(w, r, &b) {
		return
	}
	if len(strings.TrimSpace(b.Name)) < 2 || len(b.Name) > 120 {
		problem(w, 400, "invalid name")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var id string
	e = tx.QueryRow(r.Context(), "INSERT INTO mirror.tenants(name) VALUES($1) RETURNING id::text", b.Name).Scan(&id)
	if e == nil {
		_, e = tx.Exec(r.Context(), "INSERT INTO mirror.subscriptions(tenant_id,plan_id) VALUES($1,'starter')", id)
	}
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "brand.create", map[string]string{"id": id})
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 201, map[string]string{"id": id, "name": b.Name})
}
func (s *Server) branches(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, "SELECT to_jsonb(b) FROM mirror.branches b WHERE tenant_id=$1 AND ($2='' OR id=NULLIF($2,'')::uuid) ORDER BY name LIMIT 500", t, current(r).BranchID)
}
func (s *Server) createBranch(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var b struct {
		Name    string `json:"name"`
		Address string `json:"address"`
	}
	if !decode(w, r, &b) {
		return
	}
	if strings.TrimSpace(b.Name) == "" || len(b.Name) > 120 || len(b.Address) > 500 {
		problem(w, 400, "invalid branch")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var limit, count int
	e = tx.QueryRow(r.Context(), "SELECT p.branch_limit FROM mirror.subscriptions s JOIN mirror.plans p ON p.id=s.plan_id WHERE s.tenant_id=$1 AND s.status='ACTIVE' AND s.expires_at>now() FOR UPDATE OF s", t).Scan(&limit)
	if e != nil {
		problem(w, 409, "active subscription required")
		return
	}
	e = tx.QueryRow(r.Context(), "SELECT count(*) FROM mirror.branches WHERE tenant_id=$1", t).Scan(&count)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if count >= limit {
		problem(w, 409, "branch limit reached")
		return
	}
	var id string
	e = tx.QueryRow(r.Context(), "INSERT INTO mirror.branches(tenant_id,name,address) VALUES($1,$2,$3) RETURNING id::text", t, b.Name, b.Address).Scan(&id)
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "branch.create", map[string]string{"id": id})
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 201, map[string]string{"id": id})
}
func (s *Server) devices(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, "SELECT to_jsonb(d) FROM mirror.devices d WHERE tenant_id=$1 AND ($2='' OR branch_id=NULLIF($2,'')::uuid) ORDER BY name LIMIT 500", t, current(r).BranchID)
}
func (s *Server) createDevice(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var b struct {
		Name          string          `json:"name"`
		BranchID      string          `json:"branchId"`
		Configuration json.RawMessage `json:"configuration"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !validID(b.BranchID) || strings.TrimSpace(b.Name) == "" || len(b.Name) > 120 {
		problem(w, 400, "invalid device")
		return
	}
	if len(b.Configuration) == 0 {
		b.Configuration = json.RawMessage(`{}`)
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var limit, count int
	e = tx.QueryRow(r.Context(), "SELECT p.device_limit FROM mirror.subscriptions s JOIN mirror.plans p ON p.id=s.plan_id WHERE s.tenant_id=$1 AND s.status='ACTIVE' AND s.expires_at>now() FOR UPDATE OF s", t).Scan(&limit)
	if e != nil {
		problem(w, 409, "active subscription required")
		return
	}
	e = tx.QueryRow(r.Context(), "SELECT count(*) FROM mirror.devices WHERE tenant_id=$1", t).Scan(&count)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if count >= limit {
		problem(w, 409, "device limit reached")
		return
	}
	var id string
	e = tx.QueryRow(r.Context(), "INSERT INTO mirror.devices(tenant_id,branch_id,name,configuration) VALUES($1,$2,$3,$4) RETURNING id::text", t, b.BranchID, b.Name, string(b.Configuration)).Scan(&id)
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "device.create", map[string]string{"id": id})
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 201, map[string]string{"id": id})
}
func (s *Server) users(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, `SELECT jsonb_build_object('id',id,'email',email,'role',role,'branchId',branch_id,'status',status) FROM mirror.users WHERE tenant_id=$1 ORDER BY email LIMIT 500`, t)
}
func (s *Server) createUser(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var b struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
		BranchID string `json:"branchId"`
		Status   string `json:"status"`
	}
	if !decode(w, r, &b) {
		return
	}
	b.Email = strings.ToLower(strings.TrimSpace(b.Email))
	_, e := mail.ParseAddress(b.Email)
	if e != nil || len(b.Email) > 254 || len(b.Password) < 12 || len(b.Password) > 72 || !contains([]string{"BRAND_ADMIN", "STORE_ADMIN", "STAFF"}, b.Role) || (b.Role == "BRAND_ADMIN" && b.BranchID != "") || (b.Role != "BRAND_ADMIN" && !validID(b.BranchID)) {
		problem(w, 400, "invalid user")
		return
	}
	if b.Status == "" {
		b.Status = "ACTIVE"
	}
	if !contains([]string{"ACTIVE", "PENDING", "SUSPENDED"}, b.Status) {
		problem(w, 400, "invalid status")
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
	var id string
	e = tx.QueryRow(r.Context(), "INSERT INTO mirror.users(tenant_id,branch_id,email,password_hash,role,status) VALUES($1,NULLIF($2,'')::uuid,$3,$4,$5,$6) RETURNING id::text", t, b.BranchID, b.Email, string(hash), b.Role, b.Status).Scan(&id)
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "user.create", map[string]string{"id": id})
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 201, map[string]string{"id": id})
}
func (s *Server) updateUser(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	id := r.PathValue("id")
	if !ok || !validID(id) {
		problem(w, 400, "invalid scope or user")
		return
	}
	var b struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !contains([]string{"ACTIVE", "PENDING", "SUSPENDED"}, b.Status) || id == current(r).ID {
		problem(w, 400, "invalid status or self update")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	tag, e := tx.Exec(r.Context(), "UPDATE mirror.users SET status=$3 WHERE id=$1 AND tenant_id=$2 AND role<>'SUPER_ADMIN'", id, t, b.Status)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "user not found")
		return
	}
	_, e = tx.Exec(r.Context(), "UPDATE mirror.sessions SET revoked_at=now() WHERE user_id=$1", id)
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "user.status", map[string]string{"id": id, "status": b.Status})
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
func (s *Server) inventory(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	s.list(w, r, `SELECT to_jsonb(i)||jsonb_build_object('sku',v.sku,'barcode',v.barcode,'size',v.size,'color',v.color,'product',p.name,'branch',b.name) FROM mirror.inventory i JOIN mirror.variants v ON v.id=i.variant_id JOIN mirror.products p ON p.id=v.product_id JOIN mirror.branches b ON b.id=i.branch_id WHERE i.tenant_id=$1 AND ($2='' OR i.branch_id=NULLIF($2,'')::uuid) ORDER BY p.name LIMIT 500`, t, current(r).BranchID)
}
func (s *Server) adjustInventory(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var b struct {
		VariantID string `json:"variantId"`
		BranchID  string `json:"branchId"`
		Delta     int    `json:"delta"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !validID(b.VariantID) || !validID(b.BranchID) || !branchAllowed(current(r), b.BranchID) || b.Delta == 0 || b.Delta > 100000 || b.Delta < -100000 {
		problem(w, 400, "invalid stock adjustment")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	_, e = tx.Exec(r.Context(), "INSERT INTO mirror.inventory(tenant_id,branch_id,variant_id,quantity) VALUES($1,$2,$3,0) ON CONFLICT DO NOTHING", t, b.BranchID, b.VariantID)
	if e == nil {
		_, e = tx.Exec(r.Context(), "UPDATE mirror.inventory SET quantity=quantity+$4 WHERE tenant_id=$1 AND branch_id=$2 AND variant_id=$3", t, b.BranchID, b.VariantID, b.Delta)
	}
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "inventory.adjust", b)
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
func (s *Server) transferInventory(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var b struct {
		VariantID string `json:"variantId"`
		From      string `json:"fromBranchId"`
		To        string `json:"toBranchId"`
		Qty       int    `json:"qty"`
	}
	if !decode(w, r, &b) {
		return
	}
	if !validID(b.VariantID) || !validID(b.From) || !validID(b.To) || b.From == b.To || b.Qty < 1 || b.Qty > 100000 {
		problem(w, 400, "invalid transfer")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	tag, e := tx.Exec(r.Context(), "UPDATE mirror.inventory SET quantity=quantity-$4 WHERE tenant_id=$1 AND branch_id=$2 AND variant_id=$3 AND quantity-blocked>=$4", t, b.From, b.VariantID, b.Qty)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 409, "insufficient stock")
		return
	}
	_, e = tx.Exec(r.Context(), "INSERT INTO mirror.inventory(tenant_id,branch_id,variant_id,quantity) VALUES($1,$2,$3,$4) ON CONFLICT(branch_id,variant_id) DO UPDATE SET quantity=mirror.inventory.quantity+EXCLUDED.quantity", t, b.To, b.VariantID, b.Qty)
	if e == nil {
		e = s.audit(r.Context(), tx, current(r), "inventory.transfer", b)
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
