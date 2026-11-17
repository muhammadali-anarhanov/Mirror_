package decart

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestTokenContractAndPrivacy(t *testing.T) {
	calls := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != "POST" || r.URL.Path != "/v1/client/tokens" || r.Header.Get("X-API-KEY") != "fixture-private-key" {
			t.Error("wrong provider contract")
		}
		var body struct {
			ExpiresIn      int      `json:"expiresIn"`
			AllowedModels  []string `json:"allowedModels"`
			AllowedOrigins []string `json:"allowedOrigins"`
			Constraints    struct {
				Realtime struct {
					MaxSessionDuration int `json:"maxSessionDuration"`
				} `json:"realtime"`
			} `json:"constraints"`
		}
		if json.NewDecoder(r.Body).Decode(&body) != nil || body.ExpiresIn != 60 || len(body.AllowedModels) != 1 || body.AllowedModels[0] != Model || len(body.AllowedOrigins) != 1 || body.AllowedOrigins[0] != "http://localhost:3000" || body.Constraints.Realtime.MaxSessionDuration != 30 {
			t.Error("token not scoped")
		}
		json.NewEncoder(w).Encode(Token{APIKey: "ek_fixture", ExpiresAt: time.Now().Add(time.Minute).UTC().Format(time.RFC3339)})
	}))
	defer upstream.Close()
	c := New("fixture-private-key")
	c.BaseURL = upstream.URL
	token, err := c.CreateToken(context.Background(), "http://localhost:3000")
	if err != nil || token.APIKey != "ek_fixture" || calls != 1 {
		t.Fatalf("token contract failed: %v", err)
	}
}
func TestTokenFailureNeverRetriesOrLeaks(t *testing.T) {
	calls := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		http.Error(w, "fixture-private-key provider secret", 403)
	}))
	defer upstream.Close()
	c := New("fixture-private-key")
	c.BaseURL = upstream.URL
	_, err := c.CreateToken(context.Background(), "http://localhost:3000")
	if err == nil || calls != 1 || strings.Contains(err.Error(), "fixture-private-key") {
		t.Fatal("unsafe provider error/retry")
	}
}
func TestRejectPermanentKeyEchoAndExpiredToken(t *testing.T) {
	for _, token := range []Token{{APIKey: "fixture-private-key", ExpiresAt: time.Now().Add(time.Minute).Format(time.RFC3339)}, {APIKey: "ek_fixture", ExpiresAt: time.Now().Add(-time.Minute).Format(time.RFC3339)}} {
		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { json.NewEncoder(w).Encode(token) }))
		c := New("fixture-private-key")
		c.BaseURL = upstream.URL
		if _, err := c.CreateToken(context.Background(), "http://localhost:3000"); err == nil {
			t.Error("unsafe token accepted")
		}
		upstream.Close()
	}
}
