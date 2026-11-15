package server

import (
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"strings"
)

type Variant struct {
	ID      string `json:"id"`
	Size    string `json:"size"`
	Color   string `json:"color"`
	SKU     string `json:"sku,omitempty"`
	Barcode string `json:"barcode,omitempty"`
	InStock bool   `json:"inStock"`
}
type Product struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Category      string    `json:"category"`
	Price         float64   `json:"price"`
	OriginalPrice *float64  `json:"originalPrice,omitempty"`
	SKU           string    `json:"sku"`
	Barcode       string    `json:"barcode"`
	Status        string    `json:"status"`
	Image         string    `json:"image"`
	Variants      []Variant `json:"variants"`
	Stock         int       `json:"stock"`
}

func validProduct(p Product) bool {
	if strings.TrimSpace(p.Name) == "" || len(p.Name) > 160 || len(p.Description) > 4000 || len(p.SKU) == 0 || len(p.SKU) > 100 || len(p.Barcode) > 100 || !contains([]string{"Top Body", "Full Body", "Head", "Pants", "Footwear"}, p.Category) || !contains([]string{"Published", "Draft", "Archived", "Blocked"}, p.Status) || !validPrice(p.Price) {
		return false
	}
	if p.OriginalPrice != nil && (!validPrice(*p.OriginalPrice) || *p.OriginalPrice <= p.Price) {
		return false
	}
	if len(p.Variants) == 0 || len(p.Variants) > 100 {
		return false
	}
	seen := map[string]bool{}
	ids := map[string]bool{}
	for _, v := range p.Variants {
		if v.Size == "" || len(v.Size) > 30 || v.Color == "" || len(v.Color) > 60 || v.SKU == "" || len(v.SKU) > 100 || len(v.Barcode) > 100 || seen[v.SKU] || (v.ID != "" && (!validID(v.ID) || ids[v.ID])) {
			return false
		}
		seen[v.SKU] = true
		ids[v.ID] = true
	}
	return true
}
func validPrice(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0) && v >= 0 && v <= 1000000 && math.Abs(v*100-math.Round(v*100)) < 0.00001
}
func (s *Server) products(w http.ResponseWriter, r *http.Request)      { s.listProducts(w, r, false) }
func (s *Server) adminProducts(w http.ResponseWriter, r *http.Request) { s.listProducts(w, r, true) }
func (s *Server) listProducts(w http.ResponseWriter, r *http.Request, admin bool) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	u := current(r)
	if admin && u.BranchID != "" {
		problem(w, 403, "brand catalog access required")
		return
	}
	rows, e := s.DB.Query(r.Context(), `SELECT p.id::text,p.name,p.description,p.category,p.price_cents,p.original_price_cents,p.sku,p.barcode,p.status,COALESCE((SELECT object_path FROM mirror.images i WHERE i.product_id=p.id AND approved ORDER BY created_at DESC LIMIT 1),''),COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'size',v.size,'color',v.color,'sku',v.sku,'barcode',v.barcode,'inStock',EXISTS(SELECT 1 FROM mirror.inventory i WHERE i.variant_id=v.id AND i.tenant_id=$1 AND ($3='' OR i.branch_id=NULLIF($3,'')::uuid) AND i.quantity>i.blocked))) FROM mirror.variants v WHERE v.product_id=p.id AND v.active),'[]'::jsonb),COALESCE((SELECT SUM(i.quantity-i.blocked) FROM mirror.inventory i JOIN mirror.variants v ON v.id=i.variant_id WHERE v.product_id=p.id AND v.active AND i.tenant_id=$1 AND ($3='' OR i.branch_id=NULLIF($3,'')::uuid)),0) FROM mirror.products p WHERE p.tenant_id=$1 AND ($2='' OR p.category=$2) AND ($4 OR p.status='Published') ORDER BY p.created_at DESC LIMIT 500`, t, r.URL.Query().Get("category"), u.BranchID, admin)
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer rows.Close()
	out := []Product{}
	for rows.Next() {
		var p Product
		var price int
		var old *int
		var path string
		var variants []byte
		if e = rows.Scan(&p.ID, &p.Name, &p.Description, &p.Category, &price, &old, &p.SKU, &p.Barcode, &p.Status, &path, &variants, &p.Stock); e != nil {
			s.dbError(w, e)
			return
		}
		p.Price = float64(price) / 100
		if old != nil {
			v := float64(*old) / 100
			p.OriginalPrice = &v
		}
		if path != "" {
			p.Image = s.Storage.Public(s.Config.ProductBucket, path)
		}
		if e = json.Unmarshal(variants, &p.Variants); e != nil {
			s.dbError(w, e)
			return
		}
		out = append(out, p)
	}
	if e = rows.Err(); e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, out)
}
func (s *Server) saveProduct(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	var p Product
	if !decode(w, r, &p) {
		return
	}
	if !validProduct(p) {
		problem(w, 400, "invalid product or variants")
		return
	}
	id := r.PathValue("id")
	created := id == ""
	if created {
		id = uuid()
	} else if !validID(id) {
		problem(w, 400, "invalid product ID")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var old *int
	if p.OriginalPrice != nil {
		v := int(math.Round(*p.OriginalPrice * 100))
		old = &v
	}
	price := int(math.Round(p.Price * 100))
	if created {
		_, e = tx.Exec(r.Context(), "INSERT INTO mirror.products(id,tenant_id,name,description,category,price_cents,original_price_cents,sku,barcode,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", id, t, p.Name, p.Description, p.Category, price, old, p.SKU, p.Barcode, p.Status)
	} else {
		tag, err := tx.Exec(r.Context(), "UPDATE mirror.products SET name=$3,description=$4,category=$5,price_cents=$6,original_price_cents=$7,sku=$8,barcode=$9,status=$10 WHERE id=$1 AND tenant_id=$2", id, t, p.Name, p.Description, p.Category, price, old, p.SKU, p.Barcode, p.Status)
		e = err
		if e == nil && tag.RowsAffected() != 1 {
			problem(w, 404, "product not found")
			return
		}
	}
	if e != nil {
		s.dbError(w, e)
		return
	}
	_, e = tx.Exec(r.Context(), "UPDATE mirror.variants SET active=false WHERE product_id=$1 AND tenant_id=$2", id, t)
	if e != nil {
		s.dbError(w, e)
		return
	}
	for i := range p.Variants {
		v := &p.Variants[i]
		if v.ID == "" {
			v.ID = uuid()
			_, e = tx.Exec(r.Context(), "INSERT INTO mirror.variants(id,tenant_id,product_id,size,color,sku,barcode) VALUES($1,$2,$3,$4,$5,$6,$7)", v.ID, t, id, v.Size, v.Color, v.SKU, v.Barcode)
		} else {
			tag, err := tx.Exec(r.Context(), "UPDATE mirror.variants SET size=$4,color=$5,sku=$6,barcode=$7,active=true WHERE id=$1 AND tenant_id=$2 AND product_id=$3", v.ID, t, id, v.Size, v.Color, v.SKU, v.Barcode)
			e = err
			if e == nil && tag.RowsAffected() != 1 {
				e = errors.New("unknown variant")
			}
		}
		if e != nil {
			s.dbError(w, e)
			return
		}
	}
	if e = s.audit(r.Context(), tx, current(r), "product.save", map[string]string{"id": id}); e != nil {
		s.dbError(w, e)
		return
	}
	if e = tx.Commit(r.Context()); e != nil {
		s.dbError(w, e)
		return
	}
	p.ID = id
	status := 200
	if created {
		status = 201
	}
	jsonResponse(w, status, p)
}
func (s *Server) deleteProduct(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	id := r.PathValue("id")
	if !ok || !validID(id) {
		problem(w, 400, "invalid scope or ID")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	tag, e := tx.Exec(r.Context(), "UPDATE mirror.products SET status='Archived' WHERE id=$1 AND tenant_id=$2", id, t)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if tag.RowsAffected() != 1 {
		problem(w, 404, "product not found")
		return
	}
	_, e = tx.Exec(r.Context(), "INSERT INTO mirror.storage_jobs(bucket,object_path) SELECT bucket,object_path FROM mirror.images WHERE product_id=$1 AND tenant_id=$2 ON CONFLICT DO NOTHING", id, t)
	if e != nil {
		s.dbError(w, e)
		return
	}
	_, e = tx.Exec(r.Context(), "DELETE FROM mirror.images WHERE product_id=$1 AND tenant_id=$2", id, t)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if e = s.audit(r.Context(), tx, current(r), "product.archive", map[string]string{"id": id}); e != nil {
		s.dbError(w, e)
		return
	}
	if e = tx.Commit(r.Context()); e != nil {
		s.dbError(w, e)
		return
	}
	s.Cleanup(r.Context())
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
