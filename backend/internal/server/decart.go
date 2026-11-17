package server

import (
	"context"
	"errors"
	"io"
	"mirror/backend/internal/decart"
	"net/http"
	"strconv"
	"time"
)

func (s *Server) decartToken(w http.ResponseWriter, r *http.Request) {
	if s.Config.DecartAPIKey == "" || !s.Config.DecartEnableRealtime {
		problem(w, 503, "Decart realtime is disabled; configure DECART_API_KEY and enable DECART_ENABLE_REALTIME only after paid-session approval")
		return
	}
	u := current(r)
	if !validID(u.TenantID) || (u.BranchID == "" && u.Role != "BRAND_ADMIN") || (u.BranchID != "" && !validID(u.BranchID)) {
		problem(w, 403, "a signed-in catalog session is required")
		return
	}
	var input struct {
		Consent bool `json:"consent"`
	}
	if !decode(w, r, &input) {
		return
	}
	if !input.Consent {
		problem(w, 400, "explicit paid realtime consent is required")
		return
	}
	if !s.rateLimit("decart:user:"+u.ID) || !s.rateLimit("decart:tenant:"+u.TenantID) {
		problem(w, 429, "Decart session limit reached; try later")
		return
	}
	// FRONTEND_URL may list several origins; Decart needs exactly one, the caller's.
	origin := r.Header.Get("Origin")
	if !s.Config.AllowedOrigin(origin) {
		origin = ""
		if o := s.Config.Origins(); len(o) > 0 {
			origin = o[0]
		}
	}
	token, err := s.Decart.CreateToken(r.Context(), origin)
	if err != nil {
		var provider *decart.ProviderError
		if errors.As(err, &provider) {
			// Never return provider bodies: they can contain credentials or request data.
			jsonResponse(w, 502, map[string]any{"error": "Decart token creation was rejected; check API key, model access and account billing", "providerStatus": provider.Status})
			return
		}
		problem(w, 502, "Decart token service unavailable or returned an invalid response")
		return
	}
	jsonResponse(w, 200, map[string]any{"apiKey": token.APIKey, "expiresAt": token.ExpiresAt, "model": decart.Model, "maxSessionSeconds": decart.MaxSessionSeconds})
}

// Only fetch an approved image from the signed-in tenant's catalog. No arbitrary
// browser URL is accepted, redirects are prohibited, and bytes are validated.
func (s *Server) decartGarment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "private, no-store")
	u := current(r)
	id := r.PathValue("id")
	if !validID(id) || !validID(u.TenantID) || (u.BranchID == "" && u.Role != "BRAND_ADMIN") || (u.BranchID != "" && !validID(u.BranchID)) {
		problem(w, 403, "a signed-in catalog session and product are required")
		return
	}
	if !s.rateLimit("decart:image:" + u.ID) {
		problem(w, 429, "too many garment requests; try later")
		return
	}
	if s.Config.SupabaseURL == "" {
		problem(w, 503, "catalog image storage is not configured")
		return
	}
	var path string
	err := s.DB.QueryRow(r.Context(), `SELECT i.object_path FROM mirror.images i JOIN mirror.products p ON p.id=i.product_id AND p.tenant_id=i.tenant_id WHERE p.id=$1 AND p.tenant_id=$2 AND p.status='Published' AND p.category IN ('Top Body','Pants','Full Body','Head','Footwear') AND i.kind='product' AND i.approved AND EXISTS(SELECT 1 FROM mirror.variants v WHERE v.product_id=p.id AND v.tenant_id=p.tenant_id AND v.active) ORDER BY i.created_at DESC LIMIT 1`, id, u.TenantID).Scan(&path)
	if err != nil {
		s.dbError(w, err)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, "GET", s.Storage.Public(s.Config.ProductBucket, path), nil)
	if err != nil {
		problem(w, 422, "invalid catalog image URL")
		return
	}
	client := &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, err := client.Do(req)
	if err != nil {
		problem(w, 422, "catalog garment image could not be downloaded")
		return
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		problem(w, 422, "catalog garment image returned HTTP "+strconv.Itoa(res.StatusCode))
		return
	}
	raw, err := io.ReadAll(io.LimitReader(res.Body, maxImage+1))
	if err != nil {
		problem(w, 422, "catalog image could not be read")
		return
	}
	image, mime, _, _, err := validateImage(raw)
	if err != nil {
		problem(w, 422, "garment image must be a valid JPEG or PNG, up to 5 MiB and 20 MP")
		return
	}
	w.Header().Set("Content-Type", mime)
	w.WriteHeader(200)
	_, _ = w.Write(image)
}
