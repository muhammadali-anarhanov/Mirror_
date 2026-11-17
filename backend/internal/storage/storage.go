package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	URL, Key string
	HTTP     *http.Client
}

func (c *Client) CheckBucket(ctx context.Context, bucket string, public bool) error {
	b, e := c.request(ctx, "GET", "bucket/"+url.PathEscape(bucket), nil, "application/json")
	if e != nil {
		return e
	}
	var v struct {
		Public bool   `json:"public"`
		ID     string `json:"id"`
	}
	if e = json.Unmarshal(b, &v); e != nil {
		return e
	}
	if v.ID != bucket || v.Public != public {
		return errors.New("storage bucket visibility is unsafe or incorrect")
	}
	return nil
}

func New(u, k string) *Client { return &Client{u, k, &http.Client{Timeout: 30 * time.Second}} }
func (c *Client) request(ctx context.Context, method, path string, body []byte, ctype string) ([]byte, error) {
	if c.URL == "" || c.Key == "" {
		return nil, errors.New("storage is not configured")
	}
	r, e := http.NewRequestWithContext(ctx, method, c.URL+"/storage/v1/"+path, bytes.NewReader(body))
	if e != nil {
		return nil, e
	}
	r.Header.Set("apikey", c.Key)
	r.Header.Set("Authorization", "Bearer "+c.Key)
	r.Header.Set("Content-Type", ctype)
	resp, e := c.HTTP.Do(r)
	if e != nil {
		return nil, errors.New("storage request failed")
	}
	defer resp.Body.Close()
	b, e := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if e != nil {
		return nil, e
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var details struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}

		_ = json.Unmarshal(b, &details)

		return nil, fmt.Errorf(
			"storage %s %s: HTTP %d, error: %s, message: %s",
			method,
			path,
			resp.StatusCode,
			details.Error,
			details.Message,
		)
	}
	return b, nil
}
func object(bucket, path string) string {
	return url.PathEscape(bucket) + "/" + strings.Join(escapeParts(path), "/")
}
func escapeParts(s string) []string {
	p := strings.Split(s, "/")
	for i := range p {
		p[i] = url.PathEscape(p[i])
	}
	return p
}
func (c *Client) Upload(ctx context.Context, bucket, path, mime string, b []byte) error {
	_, e := c.request(ctx, "POST", "object/"+object(bucket, path), b, mime)
	return e
}
func (c *Client) Delete(ctx context.Context, bucket, path string) error {
	b, _ := json.Marshal(map[string]any{"prefixes": []string{path}})
	_, e := c.request(ctx, "DELETE", "object/"+url.PathEscape(bucket), b, "application/json")
	return e
}
func (c *Client) Public(bucket, path string) string {
	return c.URL + "/storage/v1/object/public/" + object(bucket, path)
}
func (c *Client) Sign(ctx context.Context, bucket, path string, seconds int) (string, error) {
	b, _ := json.Marshal(map[string]int{"expiresIn": seconds})
	out, e := c.request(ctx, "POST", "object/sign/"+object(bucket, path), b, "application/json")
	if e != nil {
		return "", e
	}
	var v struct {
		SignedURL string `json:"signedURL"`
	}
	if e = json.Unmarshal(out, &v); e != nil || v.SignedURL == "" {
		return "", errors.New("invalid signing response")
	}
	if !strings.HasPrefix(v.SignedURL, "/object/sign/") {
		return "", errors.New("unexpected signed URL path")
	}
	return c.URL + "/storage/v1" + v.SignedURL, nil
}

// Provision is an explicit operator command, never a public endpoint.
func (c *Client) Provision(ctx context.Context, bucket string, public bool) error {
	b, _ := json.Marshal(map[string]any{"id": bucket, "name": bucket, "public": public, "file_size_limit": 5242880, "allowed_mime_types": []string{"image/jpeg", "image/png"}})
	if _, e := c.request(ctx, "GET", "bucket/"+url.PathEscape(bucket), nil, "application/json"); e == nil {
		_, e = c.request(ctx, "PUT", "bucket/"+url.PathEscape(bucket), b, "application/json")
		return e
	}
	_, e := c.request(ctx, "POST", "bucket", b, "application/json")
	return e
}
