// Package decart implements the token contract in @decartai/sdk 0.2.14.
// It never opens a realtime session or retries requests.
package decart

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

const Model = "lucy-vton-latest"
const MaxSessionSeconds = 60

type Client struct {
	Key, BaseURL string
	HTTP         *http.Client
}
type Token struct {
	APIKey    string `json:"apiKey"`
	ExpiresAt string `json:"expiresAt"`
}
type ProviderError struct{ Status int }

func (e *ProviderError) Error() string { return "Decart rejected token creation (response hidden)" }
func New(key string) *Client {
	return &Client{Key: key, BaseURL: "https://api.decart.ai", HTTP: &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
}
func (c *Client) CreateToken(ctx context.Context, origin string) (Token, error) {
	if c.Key == "" {
		return Token{}, errors.New("Decart key missing")
	}
	body, _ := json.Marshal(map[string]any{"expiresIn": 60, "allowedModels": []string{Model}, "allowedOrigins": []string{origin}, "constraints": map[string]any{"realtime": map[string]int{"maxSessionDuration": MaxSessionSeconds}}})
	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/v1/client/tokens", bytes.NewReader(body))
	if err != nil {
		return Token{}, errors.New("invalid Decart request")
	}
	req.Header.Set("X-API-KEY", c.Key)
	req.Header.Set("Content-Type", "application/json")
	res, err := c.HTTP.Do(req)
	if err != nil {
		return Token{}, errors.New("Decart token service unavailable")
	}
	defer res.Body.Close()
	if res.StatusCode != 200 && res.StatusCode != 201 {
		return Token{}, &ProviderError{Status: res.StatusCode}
	}
	var token Token
	if json.NewDecoder(io.LimitReader(res.Body, 16384)).Decode(&token) != nil || token.APIKey == "" || token.APIKey == c.Key || strings.HasPrefix(token.APIKey, "dct_") {
		return Token{}, errors.New("invalid Decart token response")
	}
	expiry, err := time.Parse(time.RFC3339, token.ExpiresAt)
	if err != nil || !expiry.After(time.Now()) || expiry.After(time.Now().Add(2*time.Minute)) {
		return Token{}, errors.New("invalid Decart token expiry")
	}
	return token, nil
}
