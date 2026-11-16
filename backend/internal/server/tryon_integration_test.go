package server

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"image"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"

	"mirror/backend/internal/config"
	"mirror/backend/internal/database"
	"mirror/backend/internal/fashn"
	"mirror/backend/internal/storage"
)

type fakeTryonProvider struct {
	submitErr error
	calls     atomic.Int32
	fail      bool
}

func (f *fakeTryonProvider) Submit(_ context.Context, photo, garment, category string) (string, error) {
	f.calls.Add(1)
	if f.submitErr != nil {
		return "", f.submitErr
	}
	return "fixture-prediction", nil
}
func (f *fakeTryonProvider) Status(_ context.Context, id string) (fashn.Prediction, error) {
	if f.fail {
		return fashn.Prediction{ID: id, Status: "failed"}, nil
	}
	var b bytes.Buffer
	_ = png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 2, 3)))
	return fashn.Prediction{ID: id, Status: "completed", Output: []string{"data:image/png;base64," + base64.StdEncoding.EncodeToString(b.Bytes())}}, nil
}
func TestFashnDatabaseLifecycle(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	tenantID, branchID, userID, productID, variantID := uuid(), uuid(), uuid(), uuid(), uuid()
	for _, q := range []struct {
		sql  string
		args []any
	}{
		{"INSERT INTO mirror.tenants(id,name) VALUES($1,'Test brand')", []any{tenantID}},
		{"INSERT INTO mirror.branches(id,tenant_id,name) VALUES($1,$2,'Test branch')", []any{branchID, tenantID}},
		{"INSERT INTO mirror.users(id,tenant_id,branch_id,email,password_hash,role) VALUES($1,$2,$3,'staff@example.test','unused','STAFF')", []any{userID, tenantID, branchID}},
		{"INSERT INTO mirror.subscriptions(tenant_id,plan_id) VALUES($1,'starter')", []any{tenantID}},
		{"INSERT INTO mirror.products(id,tenant_id,name,category,price_cents,sku,status) VALUES($1,$2,'Shirt','Top Body',1000,'shirt','Published')", []any{productID, tenantID}},
		{"INSERT INTO mirror.variants(id,tenant_id,product_id,size,color,sku) VALUES($1,$2,$3,'M','Blue','shirt-m')", []any{variantID, tenantID, productID}},
		{"INSERT INTO mirror.inventory(tenant_id,branch_id,variant_id,quantity) VALUES($1,$2,$3,10)", []any{tenantID, branchID, variantID}},
		{"INSERT INTO mirror.images(id,tenant_id,owner_id,product_id,bucket,object_path,mime_type,size_bytes,width,height,approved,kind) VALUES($1,$2,$3,$4,'product-images','test.png','image/png',20,2,3,true,'product')", []any{uuid(), tenantID, userID, productID}},
	} {
		if _, err := db.Exec(ctx, q.sql, q.args...); err != nil {
			t.Fatal(err)
		}
	}
	fakeStorage := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/storage/v1/bucket/tryon-images" {
			jsonResponse(w, 200, map[string]any{"id": "tryon-images", "public": false})
			return
		}
		if r.URL.Path == "/storage/v1/object/sign/tryon-images/"+tenantID+"/never" {
			t.Error("unexpected object")
		}
		if len(r.URL.Path) > 24 && r.URL.Path[:24] == "/storage/v1/object/sign/" {
			jsonResponse(w, 200, map[string]string{"signedURL": "/object/sign/result?token=fixture"})
			return
		}
		if r.Method == "POST" {
			_, _ = io.Copy(io.Discard, r.Body)
			jsonResponse(w, 200, map[string]string{})
			return
		}
		w.WriteHeader(404)
	}))
	defer fakeStorage.Close()
	s := New(db, config.Config{FashnAPIKey: "fixture", FashnPaidRequests: true, ServiceKey: "fixture-storage", ProductBucket: "product-images", TryonBucket: "tryon-images"})
	single, err := database.Open(ctx, db.Config().ConnString(), 1)
	if err != nil {
		t.Fatal(err)
	}
	defer single.Close()
	s.DB = single
	s.Storage = storage.New(fakeStorage.URL, "fixture-storage")
	provider := &fakeTryonProvider{}
	s.Fashn = provider
	u := User{ID: userID, TenantID: tenantID, BranchID: branchID, Role: "STAFF"}
	request := func(key string) *httptest.ResponseRecorder {
		var b bytes.Buffer
		mw := multipart.NewWriter(&b)
		_ = mw.WriteField("product_id", productID)
		_ = mw.WriteField("variant_id", variantID)
		_ = mw.WriteField("consent", "true")
		part, _ := mw.CreateFormFile("user_image", "person.png")
		_ = png.Encode(part, image.NewRGBA(image.Rect(0, 0, 2, 3)))
		_ = mw.Close()
		r := httptest.NewRequest("POST", "/api/v1/try-on", &b)
		r.Header.Set("Content-Type", mw.FormDataContentType())
		r.Header.Set("Idempotency-Key", key)
		r = r.WithContext(context.WithValue(r.Context(), userKey{}, u))
		w := httptest.NewRecorder()
		s.tryon(w, r)
		return w
	}
	key := uuid()
	w := request(key)
	if w.Code != 202 {
		t.Fatalf("submit status %d: %s", w.Code, w.Body.String())
	}
	w = request(key)
	if w.Code != 200 || provider.calls.Load() != 1 {
		t.Fatalf("duplicate dispatched: status %d calls %d", w.Code, provider.calls.Load())
	}
	var id string
	if err := db.QueryRow(ctx, "SELECT id::text FROM mirror.tryon_sessions WHERE idempotency_key=$1", key).Scan(&id); err != nil {
		t.Fatal(err)
	}
	s.pollTryon(ctx, id)
	var status string
	var used, extra int
	if err := db.QueryRow(ctx, "SELECT status FROM mirror.tryon_sessions WHERE id=$1", id).Scan(&status); err != nil || status != "SUCCEEDED" {
		t.Fatalf("result not persisted: %s %v", status, err)
	}
	r := httptest.NewRequest("GET", "/api/v1/try-on/"+id, nil)
	r.SetPathValue("id", id)
	r = r.WithContext(context.WithValue(r.Context(), userKey{}, u))
	w = httptest.NewRecorder()
	s.tryonStatus(w, r)
	if w.Code != 200 || !bytes.Contains(w.Body.Bytes(), []byte("result_image_url")) {
		t.Fatalf("missing signed result: %d %s", w.Code, w.Body.String())
	}
	other := u
	other.ID = uuid()
	r = r.WithContext(context.WithValue(r.Context(), userKey{}, other))
	w = httptest.NewRecorder()
	s.tryonStatus(w, r)
	if w.Code != 404 {
		t.Fatal("cross-user session accessible")
	}
	lookup := httptest.NewRequest("GET", "/api/v1/try-on?key="+key, nil)
	lookup = lookup.WithContext(context.WithValue(lookup.Context(), userKey{}, u))
	w = httptest.NewRecorder()
	s.tryonLookup(w, lookup)
	if w.Code != 200 || !bytes.Contains(w.Body.Bytes(), []byte(id)) || provider.calls.Load() != 1 {
		t.Fatal("submission lookup failed")
	}
	concurrentKey := uuid()
	var wg sync.WaitGroup
	results := make(chan int, 4)
	for range 4 {
		wg.Add(1)
		go func() { defer wg.Done(); results <- request(concurrentKey).Code }()
	}
	wg.Wait()
	close(results)
	for code := range results {
		if code != 200 && code != 202 {
			t.Fatalf("concurrent request returned %d", code)
		}
	}
	if provider.calls.Load() != 2 {
		t.Fatal("concurrent duplicate submitted more than once")
	}
	if _, err := db.Exec(ctx, "UPDATE mirror.tryon_sessions SET expires_at=now()-interval '1 second' WHERE idempotency_key=$1", concurrentKey); err != nil {
		t.Fatal(err)
	}
	s.PollTryons(ctx)

	provider.fail = true
	key = uuid()
	w = request(key)
	if w.Code != 202 {
		t.Fatal("second submit failed")
	}
	_ = db.QueryRow(ctx, "SELECT id::text FROM mirror.tryon_sessions WHERE idempotency_key=$1", key).Scan(&id)
	s.pollTryon(ctx, id)
	s.finishTryon(ctx, id, "PROVIDER_FAILED", nil, "")
	if err := db.QueryRow(ctx, "SELECT used,extra_credits FROM mirror.subscriptions WHERE tenant_id=$1", tenantID).Scan(&used, &extra); err != nil || used != 3 || extra != 2 {
		t.Fatalf("refund not idempotent: used=%d extra=%d", used, extra)
	}
	provider.submitErr = errors.New("fixture timeout")
	key = uuid()
	w = request(key)
	if w.Code != 202 {
		t.Fatal("uncertain submission not preserved")
	}
	before := provider.calls.Load()
	w = request(key)
	if w.Code != 200 || provider.calls.Load() != before || !bytes.Contains(w.Body.Bytes(), []byte("SUBMISSION_UNKNOWN")) {
		t.Fatal("uncertain submission retried")
	}
	provider.submitErr = fashn.ErrRejected
	w = request(uuid())
	if w.Code != 202 || !bytes.Contains(w.Body.Bytes(), []byte("PROVIDER_REJECTED")) {
		t.Fatal("definite rejection not handled")
	}

}
