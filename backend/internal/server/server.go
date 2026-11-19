package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"mirror/backend/internal/config"
	"mirror/backend/internal/decart"
	"mirror/backend/internal/storage"
)

type Server struct {
	Decart   *decart.Client
	DB       *pgxpool.Pool
	Config   config.Config
	Storage  *storage.Client
	mu       sync.Mutex
	attempts map[string]attempt
}
type attempt struct {
	Count int
	Until time.Time
}
type User struct {
	ID        string `json:"id"`
	TenantID  string `json:"tenantId"`
	BranchID  string `json:"branchId"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	SessionID string `json:"-"`
}
type userKey struct{}

func current(r *http.Request) User { return r.Context().Value(userKey{}).(User) }
func New(db *pgxpool.Pool, c config.Config) *Server {
	return &Server{Decart: decart.New(c.DecartAPIKey), DB: db, Config: c, Storage: storage.New(c.SupabaseURL, c.ServiceKey), attempts: make(map[string]attempt)}
}
func uuid() string {
	b := make([]byte, 16)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	v := hex.EncodeToString(b)
	return v[:8] + "-" + v[8:12] + "-" + v[12:16] + "-" + v[16:20] + "-" + v[20:]
}
func validID(v string) bool {
	if len(v) != 36 {
		return false
	}
	for i, c := range v {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
		} else if !strings.ContainsRune("0123456789abcdefABCDEF", c) {
			return false
		}
	}
	return true
}
func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func problem(w http.ResponseWriter, status int, msg string) {
	jsonResponse(w, status, map[string]string{"error": msg})
}
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		problem(w, 415, "JSON is required")
		return false
	}
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 20000))
	d.DisallowUnknownFields()
	if e := d.Decode(v); e != nil {
		problem(w, 400, "invalid request")
		return false
	}
	var extra any
	if e := d.Decode(&extra); e == nil || !errors.Is(e, ioEOF) {
		problem(w, 400, "invalid JSON body")
		return false
	}
	return true
}

var ioEOF = io.EOF

func (s *Server) dbError(w http.ResponseWriter, e error) {
	if errors.Is(e, pgx.ErrNoRows) {
		problem(w, 404, "record not found")
		return
	}
	slog.Error("database operation failed", "type", errorType(e))
	problem(w, 409, "operation could not be completed")
}
func errorType(e error) string {
	if e == nil {
		return "none"
	}
	var p *pgconn.PgError
	if errors.As(e, &p) {
		return "postgres:" + p.Code + ":" + p.Message
	}
	return "database_or_storage_error"
}
func (s *Server) auth(next http.HandlerFunc, roles ...string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, e := s.authenticate(r)
		if e != nil {
			problem(w, 401, "authentication required")
			return
		}
		if len(roles) > 0 && !contains(roles, u.Role) {
			problem(w, 403, "permission denied")
			return
		}
		ctx := context.WithValue(r.Context(), userKey{}, u)
		// The UI never sends ?tenantId=; with a single active tenant the scope is unambiguous.
		if u.Role == "SUPER_ADMIN" && r.URL.Query().Get("tenantId") == "" && s.DB != nil {
			var ids []string
			if rows, e := s.DB.Query(r.Context(), "SELECT id::text FROM mirror.tenants WHERE status='ACTIVE' LIMIT 2"); e == nil {
				for rows.Next() {
					var id string
					if rows.Scan(&id) == nil {
						ids = append(ids, id)
					}
				}
				rows.Close()
			}
			if len(ids) == 1 {
				ctx = context.WithValue(ctx, defaultTenantKey{}, ids[0])
			}
		}
		next(w, r.WithContext(ctx))
	}
}

type defaultTenantKey struct{}

func contains(a []string, v string) bool {
	for _, x := range a {
		if x == v {
			return true
		}
	}
	return false
}
func tenant(r *http.Request) (string, bool) {
	u := current(r)
	if u.Role == "SUPER_ADMIN" {
		v := r.URL.Query().Get("tenantId")
		if v == "" {
			v, _ = r.Context().Value(defaultTenantKey{}).(string)
		}
		return v, validID(v)
	}
	return u.TenantID, validID(u.TenantID)
}
func branchAllowed(u User, id string) bool { return u.BranchID == "" || u.BranchID == id }
func (s *Server) Handler() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if s.DB == nil || s.DB.Ping(ctx) != nil {
			problem(w, 503, "database unavailable")
			return
		}
		jsonResponse(w, 200, map[string]string{"status": "ok"})
	})
	m.HandleFunc("POST /api/v1/auth/login", s.login)
	m.HandleFunc("POST /api/v1/auth/refresh", s.refresh)
	m.HandleFunc("POST /api/v1/auth/logout", s.logout)
	m.HandleFunc("POST /api/v1/auth/password", s.auth(s.changePassword))
	m.HandleFunc("GET /api/v1/platform/stats", s.auth(s.platformStats, "SUPER_ADMIN"))
	m.HandleFunc("GET /api/v1/auth/me", s.auth(func(w http.ResponseWriter, r *http.Request) { jsonResponse(w, 200, map[string]any{"user": current(r)}) }))
	m.HandleFunc("POST /api/v1/applications", s.application)
	m.HandleFunc("GET /api/v1/applications", s.auth(func(w http.ResponseWriter, r *http.Request) {
		s.list(w, r, "SELECT to_jsonb(a) FROM mirror.applications a ORDER BY created_at DESC LIMIT 500")
	}, "SUPER_ADMIN"))
	m.HandleFunc("PATCH /api/v1/applications/{id}", s.auth(s.reviewApplication, "SUPER_ADMIN"))
	m.HandleFunc("GET /api/v1/products", s.auth(s.products))
	m.HandleFunc("GET /api/v1/admin/products", s.auth(s.adminProducts))
	m.HandleFunc("POST /api/v1/products", s.auth(s.saveProduct, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("PUT /api/v1/products/{id}", s.auth(s.saveProduct, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("DELETE /api/v1/products/{id}", s.auth(s.deleteProduct, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("POST /api/v1/products/{id}/images", s.auth(s.uploadImage, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("PUT /api/v1/images/{id}", s.auth(s.uploadImage, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("GET /api/v1/images/{id}", s.auth(s.image))
	m.HandleFunc("DELETE /api/v1/images/{id}", s.auth(s.deleteImage, "SUPER_ADMIN", "BRAND_ADMIN", "STORE_ADMIN", "STAFF"))
	m.HandleFunc("POST /api/v1/images/{id}/signed-url", s.auth(s.signImage))
	m.HandleFunc("GET /api/v1/brands", s.auth(s.brands, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("POST /api/v1/brands", s.auth(s.createBrand, "SUPER_ADMIN"))
	m.HandleFunc("PATCH /api/v1/brands/{id}", s.auth(s.updateBrand, "SUPER_ADMIN"))
	m.HandleFunc("GET /api/v1/branches", s.auth(s.branches))
	m.HandleFunc("POST /api/v1/branches", s.auth(s.createBranch, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("PATCH /api/v1/branches/{id}", s.auth(s.updateBranch, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("GET /api/v1/devices", s.auth(s.devices))
	m.HandleFunc("POST /api/v1/devices/{id}/heartbeat", s.auth(s.deviceHeartbeat))
	m.HandleFunc("POST /api/v1/devices", s.auth(s.createDevice, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("GET /api/v1/users", s.auth(s.users, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("POST /api/v1/users", s.auth(s.createUser, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("PATCH /api/v1/users/{id}", s.auth(s.updateUser, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("POST /api/v1/users/{id}/password", s.auth(s.resetUserPassword, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("GET /api/v1/inventory", s.auth(s.inventory))
	m.HandleFunc("POST /api/v1/inventory/adjust", s.auth(s.adjustInventory, "SUPER_ADMIN", "BRAND_ADMIN", "STORE_ADMIN"))
	m.HandleFunc("POST /api/v1/inventory/transfers", s.auth(s.transferInventory, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("GET /api/v1/plans", s.auth(s.plans))
	m.HandleFunc("GET /api/v1/credit-packages", s.auth(func(w http.ResponseWriter, r *http.Request) {
		s.list(w, r, "SELECT to_jsonb(p) FROM mirror.credit_packages p WHERE active ORDER BY credits")
	}, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("GET /api/v1/subscription", s.auth(s.subscription, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("PUT /api/v1/subscription", s.auth(s.changePlan, "SUPER_ADMIN", "BRAND_ADMIN"))
	m.HandleFunc("POST /api/v1/credits", s.auth(s.addCredits, "SUPER_ADMIN"))
	m.HandleFunc("POST /api/v1/decart/token", s.auth(s.decartToken))
	m.HandleFunc("GET /api/v1/decart/garments/{id}", s.auth(s.decartGarment))
	m.HandleFunc("POST /api/v1/cart", s.auth(s.cart))
	m.HandleFunc("POST /api/v1/orders/checkout", s.auth(s.checkout))
	m.HandleFunc("GET /api/v1/orders", s.auth(s.orders))
	m.HandleFunc("PATCH /api/v1/orders/{id}", s.auth(s.updateOrder))
	m.HandleFunc("GET /api/v1/analytics", s.auth(s.analytics))
	m.HandleFunc("GET /api/v1/notifications", s.auth(s.notifications))
	m.HandleFunc("PATCH /api/v1/notifications/{id}", s.auth(s.readNotification))
	m.HandleFunc("GET /api/v1/audit-logs", s.auth(s.auditLogs, "SUPER_ADMIN", "BRAND_ADMIN"))
	return s.middleware(m)
}
func (s *Server) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Request-ID", uuid())
		defer func() {
			if recover() != nil {
				slog.Error("request panic")
				problem(w, 500, "internal error")
			}
			slog.Info("request", "method", r.Method, "duration_ms", time.Since(start).Milliseconds())
		}()
		origin := r.Header.Get("Origin")
		if origin != "" && !s.Config.AllowedOrigin(origin) {
			problem(w, 403, "origin not allowed")
			return
		}
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		if r.Method != "GET" && r.Method != "HEAD" {
			if _, e := r.Cookie("mirror_access"); e == nil && !s.Config.AllowedOrigin(origin) {
				problem(w, 403, "origin required for cookie requests")
				return
			}
			if _, e := r.Cookie("mirror_refresh"); e == nil && !s.Config.AllowedOrigin(origin) {
				problem(w, 403, "origin required for cookie requests")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
func (s *Server) audit(ctx context.Context, tx pgx.Tx, u User, action string, details any) error {
	b, _ := json.Marshal(details)
	_, e := tx.Exec(ctx, "INSERT INTO mirror.audit_logs(tenant_id,actor_id,action,details) VALUES(NULLIF($1,'')::uuid,$2,$3,$4)", u.TenantID, u.ID, action, string(b))
	return e
}
