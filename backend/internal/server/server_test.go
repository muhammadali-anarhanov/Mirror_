package server

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"mirror/backend/internal/config"
	"mirror/backend/internal/database"
	"mirror/backend/internal/storage"
	"mirror/backend/migrations"
)

func TestValidation(t *testing.T) {
	var b bytes.Buffer
	_ = png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 2, 3)))
	data, mime, w, h, e := validateImage(append(b.Bytes(), []byte("unwanted trailer")...))
	if e != nil || mime != "image/png" || w != 2 || h != 3 || bytes.Contains(data, []byte("unwanted trailer")) {
		t.Fatal("valid image was not sanitized")
	}
	for _, bad := range [][]byte{[]byte("<svg onload='alert(1)'>"), []byte("not an image"), b.Bytes()[:30], make([]byte, maxImage+1)} {
		if _, _, _, _, e := validateImage(bad); e == nil {
			t.Fatal("invalid image accepted")
		}
	}
	p := Product{Name: "Shirt", SKU: "S1", Category: "Top Body", Price: 19.99, Status: "Published", Variants: []Variant{{Size: "M", Color: "Blue", SKU: "S1-M"}}}
	if !validProduct(p) {
		t.Fatal("valid product rejected")
	}
	p.Price = 19.999
	if validProduct(p) {
		t.Fatal("fractional cents accepted")
	}
	if branchAllowed(User{BranchID: "one"}, "two") {
		t.Fatal("cross branch access")
	}
}
func TestHTTPGuards(t *testing.T) {
	s := New(nil, config.Config{FrontendURL: "https://mirror.example", JWTSecret: strings.Repeat("x", 32)})
	for _, c := range []struct {
		method, path, origin string
		status               int
	}{{"POST", "/api/v1/products", "", 401}, {"POST", "/api/v1/decart/token", "", 401}, {"GET", "/api/v1/products", "https://evil.example", 403}, {"POST", "/api/v1/auth/login", "https://evil.example", 403}, {"GET", "/healthz", "", 503}} {
		r := httptest.NewRequest(c.method, c.path, nil)
		r.Header.Set("Origin", c.origin)
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, r)
		if w.Code != c.status {
			t.Fatalf("%s got %d want %d", c.path, w.Code, c.status)
		}
	}
	r := httptest.NewRequest("POST", "/api/v1/auth/logout", nil)
	r.AddCookie(&http.Cookie{Name: "mirror_access", Value: "invalid"})
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, r)
	if w.Code != 403 {
		t.Fatal("CSRF accepted")
	}
}
func testDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL required for PostgreSQL integration tests")
	}
	ctx := context.Background()
	admin, e := database.Open(ctx, dsn, 5)
	if e != nil {
		t.Fatal(e)
	}
	name := "mirror_test_" + strings.ReplaceAll(uuid(), "-", "")
	if _, e = admin.Exec(ctx, "CREATE DATABASE "+name); e != nil {
		admin.Close()
		t.Fatal(e)
	}
	u, e := url.Parse(dsn)
	if e != nil {
		t.Fatal(e)
	}
	u.Path = "/" + name
	p, e := database.Open(ctx, u.String(), 10)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { p.Close(); _, _ = admin.Exec(ctx, "DROP DATABASE "+name+" WITH (FORCE)"); admin.Close() })
	if e = database.Migrate(ctx, p, migrations.Files); e != nil {
		t.Fatal(e)
	}
	if e = database.Migrate(ctx, p, migrations.Files); e != nil {
		t.Fatal("migration replay", e)
	}
	return p
}
func TestPostgresAPI(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	var mu sync.Mutex
	objects := map[string][]byte{}
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/storage/v1/object/public/") {
			mu.Lock()
			defer mu.Unlock()
			data, ok := objects[strings.TrimPrefix(r.URL.Path, "/storage/v1/object/public/")]
			if !ok {
				w.WriteHeader(404)
				return
			}
			w.Header().Set("Content-Type", "image/png")
			_, _ = w.Write(data)
			return
		}
		if r.Header.Get("Authorization") != "Bearer test-service-key" {
			w.WriteHeader(401)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/storage/v1/bucket/") {
			bucket := strings.TrimPrefix(r.URL.Path, "/storage/v1/bucket/")
			jsonResponse(w, 200, map[string]any{"id": bucket, "public": bucket == "product-images"})
			return
		}
		mu.Lock()
		defer mu.Unlock()
		path := strings.TrimPrefix(r.URL.Path, "/storage/v1/object/")
		switch {
		case r.Method == "POST" && strings.HasPrefix(path, "sign/"):
			jsonResponse(w, 200, map[string]string{"signedURL": "/object/sign/" + strings.TrimPrefix(path, "sign/") + "?token=short-lived"})
		case r.Method == "POST":
			b, _ := io.ReadAll(r.Body)
			objects[path] = b
			jsonResponse(w, 200, map[string]string{"Key": path})
		case r.Method == "DELETE":
			var b struct {
				Prefixes []string `json:"prefixes"`
			}
			_ = json.NewDecoder(r.Body).Decode(&b)
			for _, p := range b.Prefixes {
				delete(objects, path+"/"+p)
			}
			jsonResponse(w, 200, []any{})
		default:
			w.WriteHeader(404)
		}
	}))
	defer fake.Close()
	s := New(db, config.Config{JWTSecret: strings.Repeat("j", 32), FrontendURL: "http://localhost:3000", SupabaseURL: fake.URL, ServiceKey: "test-service-key", ProductBucket: "product-images"})
	s.Storage = storage.New(fake.URL, "test-service-key")
	var tenantA, tenantB, branchA, branchB string
	mustScan := func(query string, args []any, dest ...any) {
		t.Helper()
		if e := db.QueryRow(ctx, query, args...).Scan(dest...); e != nil {
			t.Fatal(e)
		}
	}
	mustScan("INSERT INTO mirror.tenants(name) VALUES('Alpha') RETURNING id::text", nil, &tenantA)
	mustScan("INSERT INTO mirror.tenants(name) VALUES('Beta') RETURNING id::text", nil, &tenantB)
	for _, id := range []string{tenantA, tenantB} {
		if _, e := db.Exec(ctx, "INSERT INTO mirror.subscriptions(tenant_id,plan_id) VALUES($1,'starter')", id); e != nil {
			t.Fatal(e)
		}
	}
	mustScan("INSERT INTO mirror.branches(tenant_id,name) VALUES($1,'A') RETURNING id::text", []any{tenantA}, &branchA)
	mustScan("INSERT INTO mirror.branches(tenant_id,name) VALUES($1,'B') RETURNING id::text", []any{tenantB}, &branchB)
	hash, _ := bcrypt.GenerateFromPassword([]byte("test-password-123"), bcrypt.MinCost)
	if _, e := db.Exec(ctx, "INSERT INTO mirror.users(email,password_hash,role) VALUES('platform@example.com',$1,'SUPER_ADMIN')", string(hash)); e != nil {
		t.Fatal(e)
	}
	for _, u := range []struct{ email, tenant, branch, role string }{{"a@example.com", tenantA, "", "BRAND_ADMIN"}, {"b@example.com", tenantB, "", "BRAND_ADMIN"}, {"staff@example.com", tenantA, branchA, "STAFF"}, {"store@example.com", tenantA, branchA, "STORE_ADMIN"}} {
		if _, e := db.Exec(ctx, "INSERT INTO mirror.users(tenant_id,branch_id,email,password_hash,role) VALUES($1,NULLIF($2,'')::uuid,$3,$4,$5)", u.tenant, u.branch, u.email, string(hash), u.role); e != nil {
			t.Fatal(e)
		}
	}
	h := s.Handler()
	request := func(method, path string, b io.Reader, cookies []*http.Cookie, ctype string) *httptest.ResponseRecorder {
		t.Helper()
		r := httptest.NewRequest(method, "http://api"+path, b)
		r.Header.Set("Origin", s.Config.FrontendURL)
		r.Header.Set("Content-Type", ctype)
		for _, c := range cookies {
			r.AddCookie(c)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	jreq := func(method, path string, b any, cookies []*http.Cookie) *httptest.ResponseRecorder {
		v, _ := json.Marshal(b)
		return request(method, path, bytes.NewReader(v), cookies, "application/json")
	}
	check := func(w *httptest.ResponseRecorder, want int) {
		t.Helper()
		if w.Code != want {
			t.Fatalf("got %d want %d: %s", w.Code, want, w.Body.String())
		}
	}
	login := func(email, password string) []*http.Cookie {
		w := jreq("POST", "/api/v1/auth/login", map[string]string{"email": email, "password": password}, nil)
		check(w, 200)
		return w.Result().Cookies()
	}
	check(jreq("POST", "/api/v1/auth/login", map[string]string{"email": "a@example.com", "password": "bad"}, nil), 401)
	a, b, staff, store := login("a@example.com", "test-password-123"), login("b@example.com", "test-password-123"), login("staff@example.com", "test-password-123"), login("store@example.com", "test-password-123")
	platform := login("platform@example.com", "test-password-123")
	check(jreq("GET", "/api/v1/auth/me", nil, a), 200)
	check(jreq("GET", "/healthz", nil, nil), 200)
	w := jreq("POST", "/api/v1/auth/refresh", nil, a)
	check(w, 200)
	check(jreq("POST", "/api/v1/auth/refresh", nil, a), 401)
	a = w.Result().Cookies()
	check(jreq("POST", "/api/v1/products", map[string]any{"name": "invalid"}, a), 400)
	product := Product{Name: "Test shirt", SKU: "SHIRT", Category: "Top Body", Price: 42.50, Status: "Published", Variants: []Variant{{Size: "M", Color: "Blue", SKU: "SHIRT-M"}}}
	w = jreq("POST", "/api/v1/products", product, a)
	check(w, 201)
	if e := json.Unmarshal(w.Body.Bytes(), &product); e != nil {
		t.Fatal(e)
	}
	check(jreq("POST", "/api/v1/products", product, staff), 403)
	check(jreq("PUT", "/api/v1/products/"+product.ID, product, b), 404)
	w = jreq("GET", "/api/v1/products", nil, b)
	check(w, 200)
	if strings.Contains(w.Body.String(), product.ID) {
		t.Fatal("tenant leak")
	}
	check(jreq("POST", "/api/v1/inventory/adjust", map[string]any{"variantId": product.Variants[0].ID, "branchId": branchB, "delta": 2}, store), 400)
	check(jreq("POST", "/api/v1/inventory/adjust", map[string]any{"variantId": product.Variants[0].ID, "branchId": branchA, "delta": 2}, a), 200)
	check(jreq("POST", "/api/v1/branches", map[string]string{"name": "Too many"}, a), 409)
	for i := 0; i < 2; i++ {
		check(jreq("POST", "/api/v1/devices", map[string]any{"name": "Test device", "branchId": branchA, "configuration": map[string]string{"layout": "portrait"}}, a), 201)
	}
	check(jreq("POST", "/api/v1/devices", map[string]any{"name": "Over limit", "branchId": branchA}, a), 409)
	for _, path := range []string{"/api/v1/branches", "/api/v1/devices", "/api/v1/users", "/api/v1/inventory", "/api/v1/plans", "/api/v1/credit-packages", "/api/v1/subscription", "/api/v1/notifications", "/api/v1/audit-logs"} {
		check(jreq("GET", path, nil, a), 200)
	}
	check(jreq("PUT", "/api/v1/subscription", map[string]string{"planId": "growth"}, a), 403)
	check(jreq("PUT", "/api/v1/subscription?tenantId="+tenantA, map[string]string{"planId": "growth"}, platform), 200)
	check(jreq("POST", "/api/v1/branches", map[string]string{"name": "Second branch"}, a), 201)
	check(jreq("PUT", "/api/v1/subscription?tenantId="+tenantA, map[string]any{}, platform), 400)
	check(jreq("PUT", "/api/v1/subscription?tenantId="+tenantA, map[string]any{"extendDays": 30}, platform), 200)
	var expires time.Time
	mustScan("SELECT expires_at FROM mirror.subscriptions WHERE tenant_id=$1", []any{tenantA}, &expires)
	if time.Until(expires) < 50*24*time.Hour {
		t.Fatalf("subscription not extended: %v", expires)
	}
	// Restore the smaller allowance for credit-limit assertions later.
	if _, e := db.Exec(ctx, "UPDATE mirror.subscriptions SET plan_id='starter' WHERE tenant_id=$1", tenantA); e != nil {
		t.Fatal(e)
	}
	check(jreq("POST", "/api/v1/decart/token", map[string]any{"consent": true}, staff), 503)
	check(jreq("POST", "/api/v1/try-on", map[string]any{}, staff), 404)
	var img bytes.Buffer
	_ = png.Encode(&img, image.NewRGBA(image.Rect(0, 0, 4, 5)))
	upload := func(path string, cookies []*http.Cookie, fields map[string]string, data []byte) *httptest.ResponseRecorder {
		var body bytes.Buffer
		mw := multipart.NewWriter(&body)
		f, _ := mw.CreateFormFile("file", "test.png")
		_, _ = f.Write(data)
		for k, v := range fields {
			_ = mw.WriteField(k, v)
		}
		_ = mw.Close()
		method := "POST"
		if strings.HasPrefix(path, "/api/v1/images/") {
			method = "PUT"
		}
		return request(method, path, &body, cookies, mw.FormDataContentType())
	}
	check(upload("/api/v1/products/"+product.ID+"/images", nil, map[string]string{"approved": "true"}, img.Bytes()), 401)
	check(upload("/api/v1/products/"+product.ID+"/images", staff, map[string]string{"approved": "true"}, img.Bytes()), 403)
	check(upload("/api/v1/products/"+product.ID+"/images", a, map[string]string{}, img.Bytes()), 400)
	check(upload("/api/v1/products/"+product.ID+"/images", a, map[string]string{"approved": "true"}, []byte("<svg/>")), 400)
	w = upload("/api/v1/products/"+product.ID+"/images", a, map[string]string{"approved": "true"}, img.Bytes())
	check(w, 201)
	var im Image
	_ = json.Unmarshal(w.Body.Bytes(), &im)
	if im.URL == "" || im.Width != 4 || im.Size == 0 {
		t.Fatal("metadata missing")
	}
	check(jreq("GET", "/api/v1/images/"+im.ID, nil, a), 200)
	check(jreq("GET", "/api/v1/images/"+im.ID, nil, b), 404)
	var count int
	mustScan("SELECT count(*) FROM mirror.images WHERE id=$1", []any{im.ID}, &count)
	if count != 1 {
		t.Fatal("metadata not stored")
	}
	w = jreq("GET", "/api/v1/products?category=Top%20Body", nil, staff)
	check(w, 200)
	if !strings.Contains(w.Body.String(), im.URL) || !strings.Contains(w.Body.String(), `"inStock":true`) {
		t.Fatal("mirror catalog contract", w.Body.String())
	}
	w = jreq("GET", "/api/v1/decart/garments/"+product.ID, nil, staff)
	check(w, 200)
	if w.Header().Get("Content-Type") != "image/png" || w.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatal("invalid garment response headers")
	}
	decoded, err := png.Decode(bytes.NewReader(w.Body.Bytes()))
	if err != nil || decoded.Bounds().Dx() != 4 || decoded.Bounds().Dy() != 5 {
		t.Fatal("selected catalog garment bytes not returned")
	}
	check(jreq("GET", "/api/v1/decart/garments/"+product.ID, nil, b), 404)
	check(jreq("GET", "/api/v1/decart/garments/"+uuid(), nil, staff), 404)
	check(jreq("GET", "/api/v1/decart/garments/"+product.ID, nil, a), 200)
	// Fitting is independent of purchasing stock, but requires publication.
	check(jreq("POST", "/api/v1/inventory/adjust", map[string]any{"variantId": product.Variants[0].ID, "branchId": branchA, "delta": -2}, a), 200)
	check(jreq("GET", "/api/v1/decart/garments/"+product.ID, nil, staff), 200)
	check(jreq("POST", "/api/v1/inventory/adjust", map[string]any{"variantId": product.Variants[0].ID, "branchId": branchA, "delta": 2}, a), 200)
	product.Status = "Draft"
	check(jreq("PUT", "/api/v1/products/"+product.ID, product, a), 200)
	check(jreq("GET", "/api/v1/decart/garments/"+product.ID, nil, staff), 404)
	w = jreq("GET", "/api/v1/products", nil, staff)
	check(w, 200)
	if strings.Contains(w.Body.String(), product.ID) {
		t.Fatal("draft leaked to mirror catalog")
	}
	product.Status = "Published"
	check(jreq("PUT", "/api/v1/products/"+product.ID, product, a), 200)
	oldImage := im
	w = upload("/api/v1/images/"+im.ID, a, map[string]string{"approved": "true"}, img.Bytes())
	check(w, 201)
	_ = json.Unmarshal(w.Body.Bytes(), &im)
	if im.ID == oldImage.ID {
		t.Fatal("replacement reused immutable path")
	}
	s.Cleanup(ctx)
	mu.Lock()
	_, oldExists := objects[oldImage.Bucket+"/"+oldImage.Path]
	mu.Unlock()
	if oldExists {
		t.Fatal("replacement did not delete prior object")
	}
	check(jreq("DELETE", "/api/v1/images/"+im.ID, nil, a), 200)
	mu.Lock()
	_, exists := objects[im.Bucket+"/"+im.Path]
	mu.Unlock()
	if exists {
		t.Fatal("storage object not deleted")
	}
	check(upload("/api/v1/tryon-images", staff, map[string]string{"consent": "true"}, img.Bytes()), 404)
	// Existing private rows remain readable and cleanable after provider removal.
	private := Image{ID: uuid(), Bucket: "tryon-images", Path: tenantA + "/legacy.png"}
	_, e := db.Exec(ctx, `INSERT INTO mirror.images(id,tenant_id,owner_id,bucket,object_path,mime_type,size_bytes,width,height,kind,expires_at) SELECT $1,$2,id,$3,$4,'image/png',10,4,5,'tryon',now()+interval '15 minutes' FROM mirror.users WHERE email='staff@example.com'`, private.ID, tenantA, private.Bucket, private.Path)
	if e != nil {
		t.Fatal(e)
	}
	mu.Lock()
	objects[private.Bucket+"/"+private.Path] = img.Bytes()
	mu.Unlock()
	check(jreq("GET", "/api/v1/images/"+private.ID, nil, a), 404)
	check(jreq("POST", "/api/v1/images/"+private.ID+"/signed-url", nil, staff), 200)
	if _, e := db.Exec(ctx, "UPDATE mirror.images SET expires_at=now()-interval '1 second' WHERE id=$1", private.ID); e != nil {
		t.Fatal(e)
	}
	s.Cleanup(ctx)
	mustScan("SELECT count(*) FROM mirror.images WHERE id=$1", []any{private.ID}, &count)
	if count != 0 {
		t.Fatal("expired metadata retained")
	}
	mu.Lock()
	_, exists = objects[private.Bucket+"/"+private.Path]
	mu.Unlock()
	if exists {
		t.Fatal("expired object retained")
	}
	item := cartItem{product.ID, product.Variants[0].ID, 1}
	check(jreq("POST", "/api/v1/cart", item, staff), 200)
	check(jreq("POST", "/api/v1/orders/checkout", map[string]any{"items": []cartItem{item}}, staff), 201)
	check(jreq("GET", "/api/v1/analytics", nil, staff), 200)

	// Brand admins may run a kiosk only for a branch of their own brand.
	check(jreq("POST", "/api/v1/cart", item, a), 403)
	check(jreq("POST", "/api/v1/cart", map[string]any{"productId": item.ProductID, "variantId": item.VariantID, "qty": 1, "branchId": branchB}, a), 403)
	check(jreq("POST", "/api/v1/cart", map[string]any{"productId": item.ProductID, "variantId": item.VariantID, "qty": 1, "branchId": branchA}, a), 200)
	w = jreq("POST", "/api/v1/orders/checkout", map[string]any{"items": []cartItem{item}, "branchId": branchA}, a)
	check(w, 201)
	var order struct{ ID string }
	_ = json.Unmarshal(w.Body.Bytes(), &order)
	check(jreq("PATCH", "/api/v1/orders/"+order.ID, map[string]string{"status": "SOLD"}, staff), 400)
	check(jreq("PATCH", "/api/v1/orders/"+order.ID, map[string]string{"status": "COMPLETED"}, b), 404)
	var before, after int
	mustScan("SELECT quantity FROM mirror.inventory WHERE variant_id=$1 AND branch_id=$2", []any{item.VariantID, branchA}, &before)
	check(jreq("PATCH", "/api/v1/orders/"+order.ID, map[string]string{"status": "COMPLETED"}, staff), 200)
	mustScan("SELECT quantity FROM mirror.inventory WHERE variant_id=$1 AND branch_id=$2", []any{item.VariantID, branchA}, &after)
	if after != before-1 {
		t.Fatalf("sale did not reduce stock: %d -> %d", before, after)
	}
	check(jreq("PATCH", "/api/v1/orders/"+order.ID, map[string]string{"status": "CANCELLED"}, staff), 200)
	mustScan("SELECT quantity FROM mirror.inventory WHERE variant_id=$1 AND branch_id=$2", []any{item.VariantID, branchA}, &after)
	if after != before {
		t.Fatalf("undoing a sale did not restore stock: %d -> %d", before, after)
	}
	check(jreq("PATCH", "/api/v1/orders/"+order.ID, map[string]string{"status": "COMPLETED"}, staff), 200)

	// Fitting starts are counted from audit rows; analytics reports them and sales.
	if _, e := db.Exec(ctx, "INSERT INTO mirror.audit_logs(tenant_id,action,details) VALUES($1,'fitting.start',jsonb_build_object('productId',$2::text,'branchId',$3::text))", tenantA, product.ID, branchA); e != nil {
		t.Fatal(e)
	}
	w = jreq("GET", "/api/v1/analytics?days=7", nil, a)
	check(w, 200)
	var stats struct {
		TryonSessions   int
		CompletedOrders int
		CompletedValue  float64
		Series          []map[string]any
		TopProducts     []map[string]any
	}
	if e := json.Unmarshal(w.Body.Bytes(), &stats); e != nil || stats.TryonSessions != 1 || stats.CompletedOrders != 1 || stats.CompletedValue != 42.5 || len(stats.Series) != 7 || len(stats.TopProducts) != 1 {
		t.Fatalf("analytics: %v %s", e, w.Body.String())
	}
	w = jreq("GET", "/api/v1/analytics", nil, b)
	check(w, 200)
	if strings.Contains(w.Body.String(), product.ID) {
		t.Fatal("analytics tenant leak")
	}
	check(jreq("GET", "/api/v1/platform/stats", nil, a), 403)
	w = jreq("GET", "/api/v1/platform/stats?days=30", nil, platform)
	check(w, 200)
	if !strings.Contains(w.Body.String(), `"brands": 2`) && !strings.Contains(w.Body.String(), `"brands":2`) {
		t.Fatalf("platform stats: %s", w.Body.String())
	}
	w = jreq("GET", "/api/v1/brands", nil, platform)
	check(w, 200)
	if !strings.Contains(w.Body.String(), `"planId"`) {
		t.Fatalf("brands: %s", w.Body.String())
	}
	check(jreq("GET", "/api/v1/audit-logs?scope=platform", nil, platform), 200)

	// Passwords: own change needs the current password; admins reset within their brand.
	check(jreq("POST", "/api/v1/auth/password", map[string]string{"currentPassword": "wrong-password", "newPassword": "a-new-password-1"}, store), 403)
	check(jreq("POST", "/api/v1/auth/password", map[string]string{"currentPassword": "test-password-123", "newPassword": "short"}, store), 400)
	check(jreq("POST", "/api/v1/auth/password", map[string]string{"currentPassword": "test-password-123", "newPassword": "a-new-password-1"}, store), 200)
	check(jreq("GET", "/api/v1/auth/me", nil, store), 200)
	check(jreq("POST", "/api/v1/auth/login", map[string]string{"email": "store@example.com", "password": "test-password-123"}, nil), 401)
	store = login("store@example.com", "a-new-password-1")
	var staffID string
	mustScan("SELECT id::text FROM mirror.users WHERE email='staff@example.com'", nil, &staffID)
	check(jreq("POST", "/api/v1/users/"+staffID+"/password", map[string]string{"password": "reset-password-12"}, b), 404)
	check(jreq("POST", "/api/v1/users/"+staffID+"/password", map[string]string{"password": "reset-password-12"}, a), 200)
	check(jreq("GET", "/api/v1/auth/me", nil, staff), 401)
	staff = login("staff@example.com", "reset-password-12")

	// Branch edits and the kiosk heartbeat.
	check(jreq("PATCH", "/api/v1/branches/"+branchA, map[string]string{"name": "A renamed", "address": "Main st", "status": "ACTIVE"}, a), 200)
	check(jreq("PATCH", "/api/v1/branches/"+branchA, map[string]string{"name": "x", "status": "ACTIVE"}, b), 404)
	var deviceID string
	mustScan("SELECT id::text FROM mirror.devices WHERE tenant_id=$1 LIMIT 1", []any{tenantA}, &deviceID)
	check(jreq("POST", "/api/v1/devices/"+deviceID+"/heartbeat", nil, b), 404)
	check(jreq("POST", "/api/v1/devices/"+deviceID+"/heartbeat", nil, staff), 200)
	// Concurrent repeated request keys deduct exactly once.
	var wg sync.WaitGroup
	errch := make(chan error, 5)
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tx, e := db.Begin(ctx)
			if e != nil {
				errch <- e
				return
			}
			defer tx.Rollback(ctx)
			if e = ConsumeCredit(ctx, tx, tenantA, "same-request"); e == nil {
				e = tx.Commit(ctx)
			}
			errch <- e
		}()
	}
	wg.Wait()
	close(errch)
	for e := range errch {
		if e != nil {
			t.Fatal(e)
		}
	}
	mustScan("SELECT used FROM mirror.subscriptions WHERE tenant_id=$1", []any{tenantA}, &count)
	if count != 1 {
		t.Fatalf("duplicate credit deductions %d", count)
	}
	if _, e := db.Exec(ctx, "UPDATE mirror.subscriptions SET used=400 WHERE tenant_id=$1", tenantA); e != nil {
		t.Fatal(e)
	}
	tx, _ := db.Begin(ctx)
	if e := ConsumeCredit(ctx, tx, tenantA, "exhausted"); e == nil {
		t.Fatal("credit overrun accepted")
	}
	_ = tx.Rollback(ctx)
	if _, e := db.Exec(ctx, "UPDATE mirror.subscriptions SET period_end=now()-interval '1 day' WHERE tenant_id=$1", tenantA); e != nil {
		t.Fatal(e)
	}
	tx, _ = db.Begin(ctx)
	if e := ConsumeCredit(ctx, tx, tenantA, "new-month"); e != nil {
		t.Fatal(e)
	}
	if e := tx.Commit(ctx); e != nil {
		t.Fatal(e)
	}
	mustScan("SELECT used FROM mirror.subscriptions WHERE tenant_id=$1", []any{tenantA}, &count)
	if count != 1 {
		t.Fatal("monthly reset failed")
	}
	grant := map[string]any{"amount": 100, "reference": "manual-test-001"}
	check(jreq("POST", "/api/v1/credits?tenantId="+tenantA, grant, platform), 200)
	check(jreq("POST", "/api/v1/credits?tenantId="+tenantA, grant, platform), 200)
	mustScan("SELECT extra_credits FROM mirror.subscriptions WHERE tenant_id=$1", []any{tenantA}, &count)
	if count != 100 {
		t.Fatal("duplicate manual credit grant")
	}
	w = jreq("POST", "/api/v1/brands", map[string]string{"name": "Created via API"}, platform)
	check(w, 201)
	check(jreq("POST", "/api/v1/applications", map[string]any{"applicationType": "DEMO", "companyName": "Test company", "contactName": "Test person", "email": "test@example.com", "consent": true}, nil), 201)
	check(jreq("GET", "/api/v1/applications", nil, a), 403)
	w = jreq("GET", "/api/v1/applications", nil, platform)
	check(w, 200)
	var apps []struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &apps)
	check(jreq("PATCH", "/api/v1/applications/"+apps[0].ID, map[string]string{"status": "APPROVED"}, platform), 200)
	if _, e := db.Exec(ctx, "UPDATE mirror.subscriptions SET expires_at=now()-interval '1 minute' WHERE tenant_id=$1", tenantB); e != nil {
		t.Fatal(e)
	}
	if e := s.MaintainSubscriptions(ctx); e != nil {
		t.Fatal(e)
	}
	var subStatus string
	mustScan("SELECT status FROM mirror.subscriptions WHERE tenant_id=$1", []any{tenantB}, &subStatus)
	if subStatus != "EXPIRED" {
		t.Fatal("subscription did not expire")
	}
	if _, e := db.Exec(ctx, "UPDATE mirror.users SET status='SUSPENDED' WHERE email='b@example.com'"); e != nil {
		t.Fatal(e)
	}
	check(jreq("GET", "/api/v1/auth/me", nil, b), 401)
	check(jreq("POST", "/api/v1/auth/logout", nil, a), 200)
	check(jreq("GET", "/api/v1/auth/me", nil, a), 401)
}

func TestJWTExpiry(t *testing.T) {
	// An expired or tampered token must fail before consulting the database.
	s := New(nil, config.Config{JWTSecret: strings.Repeat("x", 32)})
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer invalid")
	if _, e := s.authenticate(r); e == nil {
		t.Fatal("tampered JWT accepted")
	}
	expired := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{Session: uuid(), RegisteredClaims: jwt.RegisteredClaims{Subject: uuid(), Issuer: "mirror", Audience: jwt.ClaimStrings{"mirror-api"}, ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute))}})
	raw, _ := expired.SignedString([]byte(s.Config.JWTSecret))
	r.Header.Set("Authorization", "Bearer "+raw)
	if _, e := s.authenticate(r); e == nil {
		t.Fatal("expired token accepted")
	}
}
