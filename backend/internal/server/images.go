package server

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"strings"
	"time"
)

const maxImage = 5 << 20

type Image struct {
	ID        string     `json:"id"`
	ProductID string     `json:"productId,omitempty"`
	Bucket    string     `json:"bucket"`
	Path      string     `json:"objectPath"`
	MIME      string     `json:"mimeType"`
	Size      int        `json:"sizeBytes"`
	Width     int        `json:"width"`
	Height    int        `json:"height"`
	Approved  bool       `json:"approved"`
	Kind      string     `json:"kind"`
	Expires   *time.Time `json:"expiresAt,omitempty"`
	URL       string     `json:"url,omitempty"`
}

func validateImage(data []byte) ([]byte, string, int, int, error) {
	if len(data) == 0 || len(data) > maxImage {
		return nil, "", 0, 0, errImage{}
	}
	mime := http.DetectContentType(data)
	if mime != "image/png" && mime != "image/jpeg" {
		return nil, "", 0, 0, errImage{}
	}
	c, format, e := image.DecodeConfig(bytes.NewReader(data))
	if e != nil || c.Width < 1 || c.Height < 1 || c.Width > 8192 || c.Height > 8192 || int64(c.Width)*int64(c.Height) > 20000000 {
		return nil, "", 0, 0, errImage{}
	}
	img, _, e := image.Decode(bytes.NewReader(data))
	if e != nil {
		return nil, "", 0, 0, e
	}
	var out bytes.Buffer
	// Re-encode to discard metadata, EXIF and appended payloads.
	if format == "png" {
		e = png.Encode(&out, img)
	} else {
		e = jpeg.Encode(&out, img, &jpeg.Options{Quality: 90})
	}
	if e != nil || out.Len() > maxImage {
		return nil, "", 0, 0, errImage{}
	}
	return out.Bytes(), mime, c.Width, c.Height, nil
}

type errImage struct{}

func (errImage) Error() string { return "invalid image (JPEG/PNG, maximum 5 MiB, 20 MP)" }
func (s *Server) uploadImage(w http.ResponseWriter, r *http.Request) {
	t, ok := tenant(r)
	if !ok {
		problem(w, 400, "tenantId required")
		return
	}
	if s.Config.ServiceKey == "" {
		problem(w, 503, "Supabase storage is not configured")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxImage+(1<<20))
	if e := r.ParseMultipartForm(maxImage + (1 << 20)); e != nil {
		problem(w, 413, "invalid or oversized upload")
		return
	}
	defer r.MultipartForm.RemoveAll()
	kind := "product"
	if strings.HasSuffix(r.URL.Path, "/tryon-images") {
		kind = "tryon"
	}
	if kind == "tryon" && r.FormValue("consent") != "true" {
		problem(w, 400, "explicit consent is required")
		return
	}
	if kind == "tryon" {
		if e := s.Storage.CheckBucket(r.Context(), s.Config.TryonBucket, false); e != nil {
			problem(w, 503, "private storage bucket is not safely configured")
			return
		}
	}
	if kind == "product" && r.FormValue("approved") != "true" {
		problem(w, 400, "only approved catalog images may be uploaded")
		return
	}
	productID := r.PathValue("id")
	replace := r.Method == "PUT"
	var existing Image
	if replace {
		var e error
		existing, e = s.getImage(r)
		if e != nil {
			s.dbError(w, e)
			return
		}
		if existing.Kind != "product" {
			problem(w, 403, "temporary images cannot be replaced")
			return
		}
		productID = existing.ProductID
	}
	if kind == "product" {
		if !validID(productID) {
			problem(w, 400, "invalid product ID")
			return
		}
		var exists bool
		e := s.DB.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM mirror.products WHERE id=$1 AND tenant_id=$2 AND status<>'Archived')", productID, t).Scan(&exists)
		if e != nil {
			s.dbError(w, e)
			return
		}
		if !exists {
			problem(w, 404, "product not found")
			return
		}
	}
	file, header, e := r.FormFile("file")
	if e != nil {
		problem(w, 400, "file is required")
		return
	}
	defer file.Close()
	data, e := io.ReadAll(io.LimitReader(file, maxImage+1))
	if e != nil {
		problem(w, 400, "cannot read image")
		return
	}
	data, mime, width, height, e := validateImage(data)
	if e != nil {
		problem(w, 400, e.Error())
		return
	}
	declared := header.Header.Get("Content-Type")
	if declared != "" && declared != mime && declared != "application/octet-stream" {
		problem(w, 400, "declared type does not match file contents")
		return
	}
	id := uuid()
	bucket := s.Config.ProductBucket
	var expiry *time.Time
	if kind == "tryon" {
		bucket = s.Config.TryonBucket
		v := time.Now().Add(15 * time.Minute)
		expiry = &v
		productID = ""
	}
	ext := ".png"
	if mime == "image/jpeg" {
		ext = ".jpg"
	}
	path := t + "/" + id + ext
	// Durable orphan cleanup precedes upload, covering process crashes and DB failure.
	_, e = s.DB.Exec(r.Context(), "INSERT INTO mirror.storage_jobs(bucket,object_path,run_after) VALUES($1,$2,now()+interval '1 hour')", bucket, path)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if e = s.Storage.Upload(r.Context(), bucket, path, mime, data); e != nil {
		problem(w, 502, "storage upload failed")
		return
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	if replace {
		var locked string
		e = tx.QueryRow(r.Context(), "SELECT object_path FROM mirror.images WHERE id=$1 AND tenant_id=$2 FOR UPDATE", existing.ID, t).Scan(&locked)
		if e != nil {
			s.dbError(w, e)
			return
		}
		if locked != existing.Path {
			problem(w, 409, "image changed; retry")
			return
		}
		_, e = tx.Exec(r.Context(), "INSERT INTO mirror.storage_jobs(bucket,object_path) VALUES($1,$2) ON CONFLICT DO NOTHING", existing.Bucket, locked)
		if e != nil {
			s.dbError(w, e)
			return
		}
		_, e = tx.Exec(r.Context(), "DELETE FROM mirror.images WHERE id=$1 AND tenant_id=$2", existing.ID, t)
		if e != nil {
			s.dbError(w, e)
			return
		}
	}
	_, e = tx.Exec(r.Context(), "INSERT INTO mirror.images(id,tenant_id,owner_id,product_id,bucket,object_path,mime_type,size_bytes,width,height,approved,kind,expires_at) VALUES($1,$2,$3,NULLIF($4,'')::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13)", id, t, current(r).ID, productID, bucket, path, mime, len(data), width, height, kind == "product", kind, expiry)
	if e != nil {
		s.dbError(w, e)
		return
	}
	_, e = tx.Exec(r.Context(), "DELETE FROM mirror.storage_jobs WHERE bucket=$1 AND object_path=$2", bucket, path)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if e = s.audit(r.Context(), tx, current(r), "image.upload", map[string]string{"id": id, "kind": kind}); e != nil {
		s.dbError(w, e)
		return
	}
	if e = tx.Commit(r.Context()); e != nil {
		s.dbError(w, e)
		return
	}
	out := Image{ID: id, ProductID: productID, Bucket: bucket, Path: path, MIME: mime, Size: len(data), Width: width, Height: height, Approved: kind == "product", Kind: kind, Expires: expiry}
	if kind == "product" {
		out.URL = s.Storage.Public(bucket, path)
	}
	jsonResponse(w, 201, out)
}
func (s *Server) getImage(r *http.Request) (Image, error) {
	var i Image
	t, ok := tenant(r)
	if !ok || !validID(r.PathValue("id")) {
		return i, errImage{}
	}
	u := current(r)
	e := s.DB.QueryRow(r.Context(), `SELECT id::text,COALESCE(product_id::text,''),bucket,object_path,mime_type,size_bytes,width,height,approved,kind,expires_at FROM mirror.images WHERE id=$1 AND tenant_id=$2 AND (kind='product' OR owner_id=$3) AND (expires_at IS NULL OR expires_at>now())`, r.PathValue("id"), t, u.ID).Scan(&i.ID, &i.ProductID, &i.Bucket, &i.Path, &i.MIME, &i.Size, &i.Width, &i.Height, &i.Approved, &i.Kind, &i.Expires)
	return i, e
}
func (s *Server) image(w http.ResponseWriter, r *http.Request) {
	i, e := s.getImage(r)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if i.Kind == "product" {
		i.URL = s.Storage.Public(i.Bucket, i.Path)
	}
	jsonResponse(w, 200, i)
}
func (s *Server) signImage(w http.ResponseWriter, r *http.Request) {
	i, e := s.getImage(r)
	if e != nil {
		s.dbError(w, e)
		return
	}
	seconds := 60
	if i.Expires != nil {
		if left := int(time.Until(*i.Expires).Seconds()); left < seconds {
			seconds = left
		}
	}
	if seconds < 1 {
		problem(w, 410, "image expired")
		return
	}
	v, e := s.Storage.Sign(r.Context(), i.Bucket, i.Path, seconds)
	if e != nil {
		problem(w, 502, "could not sign image")
		return
	}
	jsonResponse(w, 200, map[string]any{"url": v, "expiresIn": seconds})
}
func (s *Server) deleteImage(w http.ResponseWriter, r *http.Request) {
	i, e := s.getImage(r)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if i.Kind == "product" && !contains([]string{"SUPER_ADMIN", "BRAND_ADMIN"}, current(r).Role) {
		problem(w, 403, "permission denied")
		return
	}
	t, _ := tenant(r)
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var path string
	e = tx.QueryRow(r.Context(), "SELECT object_path FROM mirror.images WHERE id=$1 AND tenant_id=$2 FOR UPDATE", i.ID, t).Scan(&path)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if e = s.Storage.Delete(r.Context(), i.Bucket, path); e != nil {
		problem(w, 502, "storage deletion failed; retry")
		return
	}
	_, e = tx.Exec(r.Context(), "DELETE FROM mirror.images WHERE id=$1 AND tenant_id=$2", i.ID, t)
	if e != nil {
		s.dbError(w, e)
		return
	}
	if e = s.audit(r.Context(), tx, current(r), "image.delete", map[string]string{"id": i.ID}); e != nil {
		s.dbError(w, e)
		return
	}
	if e = tx.Commit(r.Context()); e != nil {
		s.dbError(w, e)
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
func (s *Server) Cleanup(ctx context.Context) {
	if s.Config.ServiceKey == "" {
		return
	}
	tx, e := s.DB.Begin(ctx)
	if e != nil {
		return
	}
	defer tx.Rollback(ctx)
	_, e = tx.Exec(ctx, "INSERT INTO mirror.storage_jobs(bucket,object_path) SELECT bucket,object_path FROM mirror.images WHERE expires_at<=now() ON CONFLICT DO NOTHING")
	if e != nil {
		return
	}
	rows, e := tx.Query(ctx, "SELECT id::text,bucket,object_path FROM mirror.storage_jobs WHERE run_after<=now() ORDER BY run_after LIMIT 50 FOR UPDATE SKIP LOCKED")
	if e != nil {
		return
	}
	type job struct{ id, bucket, path string }
	jobs := []job{}
	for rows.Next() {
		var j job
		if e = rows.Scan(&j.id, &j.bucket, &j.path); e != nil {
			rows.Close()
			return
		}
		jobs = append(jobs, j)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return
	}
	for _, j := range jobs {
		if s.Storage.Delete(ctx, j.bucket, j.path) != nil {
			_, e = tx.Exec(ctx, "UPDATE mirror.storage_jobs SET attempts=attempts+1,run_after=now()+interval '1 minute' WHERE id=$1", j.id)
		} else {
			_, e = tx.Exec(ctx, "DELETE FROM mirror.images WHERE bucket=$1 AND object_path=$2", j.bucket, j.path)
			if e == nil {
				_, e = tx.Exec(ctx, "DELETE FROM mirror.storage_jobs WHERE id=$1", j.id)
			}
		}
		if e != nil {
			return
		}
	}
	_ = tx.Commit(ctx)
}
