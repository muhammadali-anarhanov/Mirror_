package storage

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"image"
	"image/png"
	"io"
	"net/http"
	"os"
	"testing"
	"time"
)

// Opt-in staging acceptance. This creates two uniquely named test objects and deletes
// them; it never changes bucket visibility or policies. Do not point at customer data.
func TestLiveSupabaseStorage(t *testing.T) {
	if os.Getenv("MIRROR_LIVE_SUPABASE_TEST") != "1" {
		t.Skip("set MIRROR_LIVE_SUPABASE_TEST=1 with explicit staging credentials")
	}
	u, k := os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if u == "" || k == "" {
		t.Fatal("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
	}
	pb, tb := os.Getenv("SUPABASE_PRODUCT_BUCKET"), os.Getenv("SUPABASE_TRYON_BUCKET")
	if pb == "" {
		pb = "product-images"
	}
	if tb == "" {
		tb = "tryon-images"
	}
	if pb == tb {
		t.Fatal("buckets must differ")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	c := New(u, k)
	if e := c.CheckBucket(ctx, pb, true); e != nil {
		t.Fatal(e)
	}
	if e := c.CheckBucket(ctx, tb, false); e != nil {
		t.Fatal(e)
	}
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	path := "acceptance/" + hex.EncodeToString(b) + ".png"
	var img bytes.Buffer
	_ = png.Encode(&img, image.NewRGBA(image.Rect(0, 0, 2, 2)))
	for _, bucket := range []string{pb, tb} {
		if e := c.Upload(ctx, bucket, path, "image/png", img.Bytes()); e != nil {
			t.Fatal(e)
		}
		defer func(bucket string) {
			cleanup, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			if e := c.Delete(cleanup, bucket, path); e != nil {
				t.Errorf("cleanup failed: %v", e)
			}
		}(bucket)
	}
	get := func(u string) int {
		t.Helper()
		r, e := http.NewRequestWithContext(ctx, "GET", u, nil)
		if e != nil {
			t.Fatal("invalid URL")
		}
		resp, e := c.HTTP.Do(r)
		if e != nil {
			t.Fatal("HTTP request failed")
		}
		defer resp.Body.Close()
		_, _ = io.Copy(io.Discard, resp.Body)
		return resp.StatusCode
	}
	if status := get(c.Public(pb, path)); status != 200 {
		t.Fatalf("public catalog read returned %d", status)
	}
	if status := get(c.Public(tb, path)); status >= 200 && status < 300 {
		t.Fatal("private customer object is publicly readable")
	}
	signed, e := c.Sign(ctx, tb, path, 5)
	if e != nil {
		t.Fatal(e)
	}
	if get(signed) != 200 {
		t.Fatal("signed private read failed")
	}
	if e = c.Delete(ctx, pb, path); e != nil {
		t.Fatal(e)
	}
	if e = c.Delete(ctx, tb, path); e != nil {
		t.Fatal(e)
	}
	if _, e = c.Sign(ctx, tb, path, 5); e == nil {
		t.Fatal("deleted private object could still be signed")
	}
}
