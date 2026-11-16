// Package fashn implements the documented FASHN single-task API. It never logs
// credentials, request bodies, images or provider error bodies.
package fashn

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"time"
)

var ErrDisabled = errors.New("paid AI requests are disabled")
var ErrRejected = errors.New("provider rejected the request before generation")
var predictionID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,200}$`)

type Prediction struct {
	ID     string          `json:"id"`
	Status string          `json:"status"`
	Output []string        `json:"output"`
	Error  json.RawMessage `json:"error"`
}

type Provider interface {
	Submit(context.Context, string, string, string) (string, error)
	Status(context.Context, string) (Prediction, error)
}

type Client struct {
	key     string
	enabled bool
	base    string
	http    *http.Client
}

func New(key string, enabled bool) *Client {
	return &Client{key: key, enabled: enabled, base: "https://api.fashn.ai/v1", http: &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
}
func (c *Client) request(ctx context.Context, method, path string, body any) (Prediction, error) {
	var out Prediction
	if c.key == "" {
		return out, errors.New("AI provider is not configured")
	}
	var buf bytes.Buffer
	if body != nil {
		if json.NewEncoder(&buf).Encode(body) != nil {
			return out, errors.New("invalid provider request")
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, c.base+path, &buf)
	if err != nil {
		return out, errors.New("invalid provider request")
	}
	req.Header.Set("Authorization", "Bearer "+c.key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return out, errors.New("provider request could not be confirmed; do not automatically resubmit")
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != 408 {
			return out, ErrRejected
		}
		return out, errors.New("provider request could not be confirmed")
	}
	// One base64 image, bounded independently of provider responses.
	if json.NewDecoder(io.LimitReader(resp.Body, 8<<20)).Decode(&out) != nil {
		return Prediction{}, errors.New("invalid provider response")
	}
	if len(out.Error) > 0 && string(out.Error) != "null" && out.Status != "failed" {
		return Prediction{}, errors.New("provider reported an error")
	}
	return out, nil
}
func (c *Client) Submit(ctx context.Context, modelImage, garmentImage, category string) (string, error) {
	if !c.enabled {
		return "", ErrDisabled
	}
	if category != "tops" && category != "bottoms" && category != "one-pieces" {
		return "", errors.New("unsupported garment category")
	}
	p, err := c.request(ctx, "POST", "/run", map[string]any{"model_name": "tryon-v1.6", "inputs": map[string]any{"model_image": modelImage, "garment_image": garmentImage, "category": category, "mode": "balanced", "num_samples": 1, "output_format": "png", "return_base64": true}})
	if err != nil {
		return "", err
	}
	if !predictionID.MatchString(p.ID) {
		return "", errors.New("provider returned an invalid prediction ID")
	}
	return p.ID, nil
}
func (c *Client) Status(ctx context.Context, id string) (Prediction, error) {
	if !predictionID.MatchString(id) {
		return Prediction{}, errors.New("invalid prediction ID")
	}
	p, err := c.request(ctx, "GET", "/status/"+url.PathEscape(id), nil)
	if err != nil {
		return p, err
	}
	if p.ID != id {
		return Prediction{}, errors.New("provider prediction mismatch")
	}
	switch p.Status {
	case "starting", "in_queue", "processing", "completed", "failed":
		return p, nil
	}
	return Prediction{}, errors.New("unknown provider status")
}
