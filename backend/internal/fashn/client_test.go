package fashn

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestClientProtocolAndPaidGate(t *testing.T) {
	var calls atomic.Int32
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Header.Get("Authorization") != "Bearer fixture-key" {
			t.Error("missing authorization")
		}
		if r.Method == "POST" {
			var b struct {
				Model  string `json:"model_name"`
				Inputs struct {
					Category string `json:"category"`
					Samples  int    `json:"num_samples"`
					Base64   bool   `json:"return_base64"`
				} `json:"inputs"`
			}
			if json.NewDecoder(r.Body).Decode(&b) != nil || b.Model != "tryon-v1.6" || b.Inputs.Category != "tops" || b.Inputs.Samples != 1 || !b.Inputs.Base64 {
				t.Error("wrong provider payload")
			}
			_, _ = w.Write([]byte(`{"id":"prediction-1","error":null}`))
			return
		}
		if r.URL.Path != "/status/prediction-1" {
			t.Error("wrong status path")
		}
		_, _ = w.Write([]byte(`{"id":"prediction-1","status":"completed","output":["data:image/png;base64,fixture"],"error":null}`))
	}))
	defer fake.Close()
	c := New("fixture-key", false)
	c.base = fake.URL
	if _, err := c.Submit(context.Background(), "photo", "garment", "tops"); err != ErrDisabled || calls.Load() != 0 {
		t.Fatal("disabled submission reached network")
	}
	c.enabled = true
	id, err := c.Submit(context.Background(), "photo", "garment", "tops")
	if err != nil || id != "prediction-1" {
		t.Fatal("submit failed")
	}
	p, err := c.Status(context.Background(), id)
	if err != nil || p.Status != "completed" {
		t.Fatal("poll failed")
	}
	if _, err = c.Status(context.Background(), "../steal"); err == nil {
		t.Fatal("unsafe ID accepted")
	}
	if _, err = c.Submit(context.Background(), "photo", "garment", "Head"); err == nil {
		t.Fatal("unsupported category accepted")
	}
}
func TestProviderErrorRedaction(t *testing.T) {
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(401)
		_, _ = w.Write([]byte(`{"message":"fixture-key image-secret"}`))
	}))
	defer fake.Close()
	c := New("fixture-key", true)
	c.base = fake.URL
	_, err := c.Submit(context.Background(), "image-secret", "garment", "tops")
	if err == nil || strings.Contains(err.Error(), "fixture-key") || strings.Contains(err.Error(), "image-secret") {
		t.Fatal("provider error leaked secrets")
	}
}
func TestNoCredentialRedirect(t *testing.T) {
	var leaked atomic.Bool
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { leaked.Store(true) }))
	defer target.Close()
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, target.URL, 307) }))
	defer fake.Close()
	c := New("fixture-key", true)
	c.base = fake.URL
	if _, err := c.Submit(context.Background(), "photo", "garment", "tops"); err == nil || leaked.Load() {
		t.Fatal("credential-bearing redirect followed")
	}
}
