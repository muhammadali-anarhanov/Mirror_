package server

import (
	"context"
	"encoding/json"
	"mirror/backend/internal/config"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestDecartAuthAndDefaultDisabled(t *testing.T) {
	s := New(nil, config.Config{FrontendURL: "http://localhost:3000"})
	req := httptest.NewRequest("POST", "/api/v1/decart/token", strings.NewReader(`{"consent":true}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, req)
	if w.Code != 401 {
		t.Fatalf("anonymous token request: %d", w.Code)
	}
	w = httptest.NewRecorder()
	s.decartToken(w, req.WithContext(context.WithValue(req.Context(), userKey{}, User{})))
	if w.Code != 503 {
		t.Fatalf("disabled token request: %d", w.Code)
	}
}
func TestDecartConsentAndBranchRequired(t *testing.T) {
	s := New(nil, config.Config{DecartAPIKey: "fixture-key", DecartEnableRealtime: true})
	for _, tc := range []struct {
		user   User
		body   string
		status int
	}{{User{}, `{"consent":true}`, 403}, {User{ID: "user", TenantID: "11111111-1111-4111-8111-111111111111", BranchID: "22222222-2222-4222-8222-222222222222"}, `{"consent":false}`, 400}} {
		req := httptest.NewRequest("POST", "/api/v1/decart/token", strings.NewReader(tc.body))
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), userKey{}, tc.user))
		w := httptest.NewRecorder()
		s.decartToken(w, req)
		if w.Code != tc.status {
			t.Errorf("got %d want %d", w.Code, tc.status)
		}
	}
}

func TestDecartEndpointTokenResponseAndRateLimit(t *testing.T) {
	calls := 0
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		json.NewEncoder(w).Encode(map[string]any{"apiKey": "ek_fixture", "expiresAt": time.Now().Add(time.Minute).Format(time.RFC3339), "privateExtra": "never forward"})
	}))
	defer provider.Close()
	s := New(nil, config.Config{DecartAPIKey: "fixture-permanent", DecartEnableRealtime: true, FrontendURL: "http://localhost:3000"})
	s.Decart.BaseURL = provider.URL
	u := User{ID: "user", TenantID: "11111111-1111-4111-8111-111111111111", BranchID: "22222222-2222-4222-8222-222222222222"}
	for i := 0; i < 21; i++ {
		req := httptest.NewRequest("POST", "/api/v1/decart/token", strings.NewReader(`{"consent":true}`))
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(context.WithValue(req.Context(), userKey{}, u))
		w := httptest.NewRecorder()
		s.decartToken(w, req)
		if i < 20 {
			if w.Code != 200 {
				t.Fatalf("token response %d", w.Code)
			}
			var body map[string]any
			json.Unmarshal(w.Body.Bytes(), &body)
			if len(body) != 4 || body["apiKey"] != "ek_fixture" || body["model"] != "lucy-vton-latest" || body["maxSessionSeconds"] != float64(60) {
				t.Fatal("unexpected token response")
			}
		} else if w.Code != 429 {
			t.Fatal("missing rate limit")
		}
		if strings.Contains(w.Body.String(), "fixture-permanent") || strings.Contains(w.Body.String(), "privateExtra") {
			t.Fatal("unsafe response")
		}
	}
	if calls != 20 {
		t.Fatal("limited request reached provider")
	}
}
