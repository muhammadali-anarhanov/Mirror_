package server

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"mirror/backend/internal/fashn"
)

type tryonJob struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"`
	Error     string    `json:"error,omitempty"`
	ResultURL string    `json:"result_image_url,omitempty"`
	ExpiresAt time.Time `json:"expires_at"`
}

func garmentCategory(category string) string {
	switch category {
	case "Top Body":
		return "tops"
	case "Pants":
		return "bottoms"
	case "Full Body":
		return "one-pieces"
	}
	return ""
}

func (s *Server) tryon(w http.ResponseWriter, r *http.Request) {
	if s.Config.FashnAPIKey == "" || !s.Config.FashnPaidRequests {
		jsonResponse(w, 503, map[string]any{"error": "AI generation is disabled; configure FASHN_API_KEY and explicitly enable paid requests", "submitted": false})
		return
	}
	u := current(r)
	if u.BranchID == "" {
		problem(w, 403, "branch session required")
		return
	}
	if s.Config.ServiceKey == "" {
		jsonResponse(w, 503, map[string]any{"error": "private result storage is not configured", "submitted": false})
		return
	}
	key := r.Header.Get("Idempotency-Key")
	if !validID(key) {
		problem(w, 400, "UUID Idempotency-Key required")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxImage+(1<<20))
	if r.ParseMultipartForm(maxImage+(1<<20)) != nil {
		problem(w, 413, "invalid or oversized upload")
		return
	}
	defer r.MultipartForm.RemoveAll()
	product, variant := r.FormValue("product_id"), r.FormValue("variant_id")
	if !validID(product) || !validID(variant) || r.FormValue("consent") != "true" {
		problem(w, 400, "product, variant and explicit consent required")
		return
	}
	file, _, err := r.FormFile("user_image")
	if err != nil {
		problem(w, 400, "user_image is required")
		return
	}
	defer file.Close()
	raw, err := io.ReadAll(io.LimitReader(file, maxImage+1))
	if err != nil {
		problem(w, 400, "cannot read photo")
		return
	}
	image, mime, _, _, err := validateImage(raw)
	if err != nil {
		problem(w, 400, "invalid photo; JPEG/PNG up to 5 MiB and 20 MP required")
		return
	}
	sum := sha256.Sum256(append([]byte(product+variant), image...))
	fingerprint := hex.EncodeToString(sum[:])
	tx, err := s.DB.Begin(r.Context())
	if err != nil {
		s.dbError(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	// Lock the tenant's subscription before checking the idempotency key, serializing
	// concurrent submissions from this tenant. Never resend a committed job.
	var locked string
	err = tx.QueryRow(r.Context(), "SELECT tenant_id::text FROM mirror.subscriptions WHERE tenant_id=$1 FOR UPDATE", u.TenantID).Scan(&locked)
	if err != nil {
		problem(w, 409, "active subscription required")
		return
	}
	var prior, owner, hash string
	err = tx.QueryRow(r.Context(), "SELECT id::text,user_id::text,request_hash FROM mirror.tryon_sessions WHERE tenant_id=$1 AND idempotency_key=$2", u.TenantID, key).Scan(&prior, &owner, &hash)
	if err == nil {
		if owner != u.ID || hash != fingerprint {
			problem(w, 409, "idempotency key already used for a different request")
			return
		}
		_ = tx.Rollback(r.Context())
		s.writeTryon(w, r, prior, 200)
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		s.dbError(w, err)
		return
	}
	var category, path string
	err = tx.QueryRow(r.Context(), `SELECT p.category,(SELECT object_path FROM mirror.images WHERE product_id=p.id AND tenant_id=p.tenant_id AND kind='product' AND approved ORDER BY created_at DESC LIMIT 1) FROM mirror.products p JOIN mirror.variants v ON v.product_id=p.id AND v.tenant_id=p.tenant_id JOIN mirror.inventory i ON i.variant_id=v.id AND i.tenant_id=p.tenant_id WHERE p.id=$1 AND p.tenant_id=$2 AND v.id=$3 AND v.active AND p.status='Published' AND i.branch_id=$4 AND i.quantity>i.blocked`, product, u.TenantID, variant, u.BranchID).Scan(&category, &path)
	if err != nil {
		problem(w, 409, "published in-stock garment with approved image required")
		return
	}
	category = garmentCategory(category)
	if category == "" {
		problem(w, 422, "AI try-on currently supports tops, pants and full-body garments")
		return
	}
	if s.Storage.CheckBucket(r.Context(), s.Config.TryonBucket, false) != nil {
		jsonResponse(w, 503, map[string]any{"error": "private result bucket is not safely configured", "submitted": false})
		return
	}
	id := uuid()
	_, err = tx.Exec(r.Context(), `INSERT INTO mirror.tryon_sessions(id,tenant_id,user_id,branch_id,product_id,variant_id,idempotency_key,status,consent_at,request_hash,error_code) VALUES($1,$2,$3,$4,$5,$6,$7,'PENDING',now(),$8,'SUBMITTING')`, id, u.TenantID, u.ID, u.BranchID, product, variant, key, fingerprint)
	if err == nil {
		err = ConsumeCredit(r.Context(), tx, u.TenantID, id)
	}
	if err != nil {
		problem(w, 409, "try-on credit or subscription unavailable")
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		s.dbError(w, err)
		return
	}
	// Do not tie an accepted submission to a disconnected browser. The bounded
	// request is sent exactly once; an ambiguous timeout is never retried.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 40*time.Second)
	defer cancel()
	prediction, err := s.Fashn.Submit(ctx, "data:"+mime+";base64,"+base64.StdEncoding.EncodeToString(image), s.Storage.Public(s.Config.ProductBucket, path), category)
	if err != nil {
		if errors.Is(err, fashn.ErrRejected) {
			s.finishTryon(ctx, id, "PROVIDER_REJECTED", nil, "")
			s.writeTryon(w, r, id, 202)
			return
		}
		_, _ = s.DB.Exec(ctx, "UPDATE mirror.tryon_sessions SET error_code='SUBMISSION_UNKNOWN',updated_at=now() WHERE id=$1", id)
		s.writeTryon(w, r, id, 202)
		return
	}
	tx, err = s.DB.Begin(ctx)
	if err != nil {
		problem(w, 503, "submission reconciliation required; do not resubmit")
		return
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, "UPDATE mirror.tryon_sessions SET provider_request_id=$2,error_code='',updated_at=now() WHERE id=$1", id, prediction)
	if err == nil {
		_, err = tx.Exec(ctx, "INSERT INTO mirror.ai_usage(session_id,provider,provider_request_id) VALUES($1,'fashn',$2)", id, prediction)
	}
	if err == nil {
		err = tx.Commit(ctx)
	}
	if err != nil {
		problem(w, 503, "submission reconciliation required; do not resubmit")
		return
	}
	s.writeTryon(w, r, id, 202)
}

func (s *Server) writeTryon(w http.ResponseWriter, r *http.Request, id string, code int) {
	u := current(r)
	var job tryonJob
	var imageID *string
	err := s.DB.QueryRow(r.Context(), `SELECT id::text,status,error_code,expires_at,result_image_id::text FROM mirror.tryon_sessions WHERE id=$1 AND tenant_id=$2 AND user_id=$3 AND branch_id=$4`, id, u.TenantID, u.ID, u.BranchID).Scan(&job.ID, &job.Status, &job.Error, &job.ExpiresAt, &imageID)
	if err != nil {
		s.dbError(w, err)
		return
	}
	if time.Now().After(job.ExpiresAt) {
		problem(w, 410, "try-on session expired")
		return
	}
	if imageID != nil && job.Status == "SUCCEEDED" {
		var bucket, path string
		err = s.DB.QueryRow(r.Context(), "SELECT bucket,object_path FROM mirror.images WHERE id=$1 AND tenant_id=$2 AND owner_id=$3 AND expires_at>now()", *imageID, u.TenantID, u.ID).Scan(&bucket, &path)
		if err != nil {
			problem(w, 410, "result image expired")
			return
		}
		seconds := min(60, int(time.Until(job.ExpiresAt).Seconds()))
		if seconds < 1 {
			problem(w, 410, "result image expired")
			return
		}
		job.ResultURL, err = s.Storage.Sign(r.Context(), bucket, path, seconds)
		if err != nil {
			problem(w, 502, "result image temporarily unavailable")
			return
		}
	}
	jsonResponse(w, code, job)
}

// Lookup by the client-generated key recovers a submission whose HTTP response
// was lost, without issuing a second paid request.
func (s *Server) tryonLookup(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if !validID(key) {
		problem(w, 400, "invalid request key")
		return
	}
	u := current(r)
	var id string
	err := s.DB.QueryRow(r.Context(), "SELECT id::text FROM mirror.tryon_sessions WHERE idempotency_key=$1 AND tenant_id=$2 AND user_id=$3 AND branch_id=$4", key, u.TenantID, u.ID, u.BranchID).Scan(&id)
	if err != nil {
		s.dbError(w, err)
		return
	}
	s.pollTryon(r.Context(), id)
	s.writeTryon(w, r, id, 200)
}

func (s *Server) tryonStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !validID(id) {
		problem(w, 400, "invalid session ID")
		return
	}
	u := current(r)
	var allowed bool
	err := s.DB.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM mirror.tryon_sessions WHERE id=$1 AND tenant_id=$2 AND user_id=$3 AND branch_id=$4)", id, u.TenantID, u.ID, u.BranchID).Scan(&allowed)
	if err != nil {
		s.dbError(w, err)
		return
	}
	if !allowed {
		problem(w, 404, "session not found")
		return
	}
	s.pollTryon(r.Context(), id)
	s.writeTryon(w, r, id, 200)
}

// PollTryons recovers persisted predictions even when the browser disconnects.
// Submission uncertainty is intentionally never retried automatically.
func (s *Server) PollTryons(ctx context.Context) {
	// A crash during submission cannot safely be retried. Surface it for operator
	// reconciliation, preserving both the reservation and evidence.
	_, _ = s.DB.Exec(ctx, "UPDATE mirror.tryon_sessions SET error_code='SUBMISSION_UNKNOWN',updated_at=now() WHERE status='PENDING' AND provider_request_id IS NULL AND error_code='SUBMITTING' AND created_at<now()-interval '1 minute'")
	expired, err := s.DB.Query(ctx, "SELECT id::text FROM mirror.tryon_sessions WHERE status='PENDING' AND provider_request_id IS NOT NULL AND expires_at<=now() LIMIT 10")
	if err != nil {
		return
	}
	var expiredIDs []string
	for expired.Next() {
		var id string
		if expired.Scan(&id) != nil {
			expired.Close()
			return
		}
		expiredIDs = append(expiredIDs, id)
	}
	expired.Close()
	for _, id := range expiredIDs {
		s.finishTryon(ctx, id, "RESULT_EXPIRED", nil, "")
	}

	rows, err := s.DB.Query(ctx, "SELECT id::text FROM mirror.tryon_sessions WHERE status='PENDING' AND provider_request_id IS NOT NULL AND expires_at>now() AND next_poll_at<=now() ORDER BY next_poll_at LIMIT 10")
	if err != nil {
		return
	}
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) != nil {
			rows.Close()
			return
		}
		ids = append(ids, id)
	}
	rows.Close()
	for _, id := range ids {
		s.pollTryon(ctx, id)
	}
}
func (s *Server) pollTryon(ctx context.Context, id string) {
	// Claim a poll lease to prevent browser/background/multi-replica races.
	var prediction string
	err := s.DB.QueryRow(ctx, `UPDATE mirror.tryon_sessions SET next_poll_at=now()+interval '45 seconds' WHERE id=$1 AND status='PENDING' AND provider_request_id IS NOT NULL AND expires_at>now() AND next_poll_at<=now() RETURNING provider_request_id`, id).Scan(&prediction)
	if err != nil {
		return
	}
	p, err := s.Fashn.Status(ctx, prediction)
	if err != nil {
		return
	}
	switch p.Status {
	case "failed":
		s.finishTryon(ctx, id, "PROVIDER_FAILED", nil, "")
	case "completed":
		if len(p.Output) != 1 {
			s.finishTryon(ctx, id, "INVALID_PROVIDER_OUTPUT", nil, "")
			return
		}
		data, mime, err := decodeTryonOutput(p.Output[0])
		if err != nil {
			s.finishTryon(ctx, id, "INVALID_PROVIDER_OUTPUT", nil, "")
			return
		}
		s.finishTryon(ctx, id, "", data, mime)
	default:
		_, _ = s.DB.Exec(ctx, "UPDATE mirror.tryon_sessions SET next_poll_at=now()+interval '3 seconds' WHERE id=$1 AND status='PENDING'", id)
	}
}
func decodeTryonOutput(output string) ([]byte, string, error) {
	prefix := "data:image/png;base64,"
	if strings.HasPrefix(output, "data:image/jpeg;base64,") {
		prefix = "data:image/jpeg;base64,"
	}
	if !strings.HasPrefix(output, prefix) || len(output) > 7<<20 {
		return nil, "", errImage{}
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(output, prefix))
	if err != nil {
		return nil, "", errImage{}
	}
	b, mime, _, _, err := validateImage(raw)
	return b, mime, err
}
func (s *Server) finishTryon(ctx context.Context, id, code string, data []byte, mime string) {
	var imageID, path string
	if code == "" {
		// Commit orphan cleanup before opening the result transaction. This also
		// works with DB_MAX_CONNS=1; no nested pool acquisition while holding a tx.
		var tenantID string
		if s.DB.QueryRow(ctx, "SELECT tenant_id::text FROM mirror.tryon_sessions WHERE id=$1 AND status='PENDING' AND expires_at>now()", id).Scan(&tenantID) != nil {
			return
		}
		if s.Storage.CheckBucket(ctx, s.Config.TryonBucket, false) != nil {
			return
		}
		imageID = uuid()
		ext := ".png"
		if mime == "image/jpeg" {
			ext = ".jpg"
		}
		path = tenantID + "/" + imageID + ext
		if _, err := s.DB.Exec(ctx, "INSERT INTO mirror.storage_jobs(bucket,object_path,run_after) VALUES($1,$2,now()+interval '1 hour')", s.Config.TryonBucket, path); err != nil {
			return
		}
	}

	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return
	}
	defer tx.Rollback(ctx)
	var tenantID, userID, status string
	var expires time.Time
	err = tx.QueryRow(ctx, "SELECT tenant_id::text,user_id::text,status,expires_at FROM mirror.tryon_sessions WHERE id=$1 FOR UPDATE", id).Scan(&tenantID, &userID, &status, &expires)
	if err != nil || status != "PENDING" || (code == "" && time.Now().After(expires)) {
		return
	}
	if code != "" {
		// Restore one spendable credit exactly once, without changing a past month's
		// usage counters. A refund is an extra credit and has an idempotent ledger entry.
		tag, e := tx.Exec(ctx, "INSERT INTO mirror.credit_ledger(tenant_id,reference,delta) VALUES($1,$2,1) ON CONFLICT DO NOTHING", tenantID, "refund:"+id)
		if e != nil {
			return
		}
		if tag.RowsAffected() == 1 {
			if _, e = tx.Exec(ctx, "UPDATE mirror.subscriptions SET extra_credits=extra_credits+1 WHERE tenant_id=$1", tenantID); e != nil {
				return
			}
		}
		_, err = tx.Exec(ctx, "UPDATE mirror.tryon_sessions SET status='FAILED',error_code=$2,updated_at=now() WHERE id=$1", id, code)
	} else {
		if s.Storage.Upload(ctx, s.Config.TryonBucket, path, mime, data) != nil {
			return
		}
		_, _, width, height, e := validateImage(data)
		if e != nil {
			return
		}
		_, err = tx.Exec(ctx, `INSERT INTO mirror.images(id,tenant_id,owner_id,bucket,object_path,mime_type,size_bytes,width,height,kind,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'tryon',$10)`, imageID, tenantID, userID, s.Config.TryonBucket, path, mime, len(data), width, height, expires)
		if err == nil {
			_, err = tx.Exec(ctx, "UPDATE mirror.tryon_sessions SET status='SUCCEEDED',error_code='',result_image_id=$2,updated_at=now() WHERE id=$1", id, imageID)
		}
		if err == nil {
			_, err = tx.Exec(ctx, "DELETE FROM mirror.storage_jobs WHERE bucket=$1 AND object_path=$2", s.Config.TryonBucket, path)
		}
	}
	if err == nil {
		_ = tx.Commit(ctx)
	}
}
