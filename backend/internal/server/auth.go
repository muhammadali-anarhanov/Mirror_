package server

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type claims struct {
	Session string `json:"sid"`
	jwt.RegisteredClaims
}

func (s *Server) authenticate(r *http.Request) (User, error) {
	var u User
	t := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if t == "" {
		if c, e := r.Cookie("mirror_access"); e == nil {
			t = c.Value
		}
	}
	c := &claims{}
	_, e := jwt.ParseWithClaims(t, c, func(t *jwt.Token) (any, error) { return []byte(s.Config.JWTSecret), nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired(), jwt.WithIssuer("mirror"), jwt.WithAudience("mirror-api"))
	if e != nil || !validID(c.Subject) || !validID(c.Session) {
		return u, errors.New("invalid session")
	}
	e = s.DB.QueryRow(r.Context(), `SELECT u.id::text,COALESCE(u.tenant_id::text,''),COALESCE(u.branch_id::text,''),u.email,u.role,u.status FROM mirror.users u JOIN mirror.sessions s ON s.user_id=u.id LEFT JOIN mirror.tenants t ON t.id=u.tenant_id WHERE u.id=$1 AND s.id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' AND (u.tenant_id IS NULL OR t.status='ACTIVE')`, c.Subject, c.Session).Scan(&u.ID, &u.TenantID, &u.BranchID, &u.Email, &u.Role, &u.Status)
	u.SessionID = c.Session
	return u, e
}
func randomToken() string {
	b := make([]byte, 32)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	return hex.EncodeToString(b)
}
func hashToken(v string) string { b := sha256.Sum256([]byte(v)); return hex.EncodeToString(b[:]) }
func (s *Server) cookies(w http.ResponseWriter, u User, refresh string) {
	now := time.Now()
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{u.SessionID, jwt.RegisteredClaims{Subject: u.ID, Issuer: "mirror", Audience: jwt.ClaimStrings{"mirror-api"}, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(10 * time.Minute))}})
	access, _ := t.SignedString([]byte(s.Config.JWTSecret))
	for _, c := range []*http.Cookie{{Name: "mirror_access", Value: access, Path: "/", MaxAge: 600}, {Name: "mirror_refresh", Value: refresh, Path: "/api/v1/auth", MaxAge: 7 * 86400}} {
		c.HttpOnly = true
		c.Secure = s.Config.Production
		c.SameSite = http.SameSiteLaxMode
		http.SetCookie(w, c)
	}
}
func (s *Server) clearCookies(w http.ResponseWriter) {
	for _, v := range []struct{ name, path string }{{"mirror_access", "/"}, {"mirror_refresh", "/api/v1/auth"}} {
		http.SetCookie(w, &http.Cookie{Name: v.name, Path: v.path, MaxAge: -1, HttpOnly: true, Secure: s.Config.Production, SameSite: http.SameSiteLaxMode})
	}
}
func (s *Server) rateLimit(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	if len(s.attempts) > 10000 {
		for k, v := range s.attempts {
			if now.After(v.Until) {
				delete(s.attempts, k)
			}
		}
		if len(s.attempts) > 10000 {
			return false
		}
	}
	v := s.attempts[key]
	if now.After(v.Until) {
		v = attempt{Until: now.Add(15 * time.Minute)}
	}
	v.Count++
	s.attempts[key] = v
	return v.Count <= 20
}

// limited reports whether key is locked without consuming an attempt.
func (s *Server) limited(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.attempts[key]
	return ok && time.Now().Before(v.Until) && v.Count >= 20
}
func (s *Server) resetLimit(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.attempts, key)
}
func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	var b struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decode(w, r, &b) {
		return
	}
	// Requests arrive through the Next proxy, so the IP is shared by all users:
	// key on account too and count failures only.
	key := "login:" + host + ":" + strings.ToLower(strings.TrimSpace(b.Email))
	if s.limited(key) {
		problem(w, 429, "try again later")
		return
	}
	if len(b.Password) > 72 {
		s.rateLimit(key)
		problem(w, 401, "invalid credentials")
		return
	}
	var u User
	var hash string
	e := s.DB.QueryRow(r.Context(), `SELECT u.id::text,COALESCE(u.tenant_id::text,''),COALESCE(u.branch_id::text,''),u.email,u.role,u.status,u.password_hash FROM mirror.users u LEFT JOIN mirror.tenants t ON t.id=u.tenant_id WHERE u.email=$1 AND u.status='ACTIVE' AND (u.tenant_id IS NULL OR t.status='ACTIVE')`, strings.ToLower(strings.TrimSpace(b.Email))).Scan(&u.ID, &u.TenantID, &u.BranchID, &u.Email, &u.Role, &u.Status, &hash)
	if e != nil {
		hash = "$2a$12$000000000000000000000uC.RMpig5YHYe/ZxYp7bF6xNg4br0gG6"
	}
	pwerr := bcrypt.CompareHashAndPassword([]byte(hash), []byte(b.Password))
	if e != nil || pwerr != nil {
		s.rateLimit(key)
		problem(w, 401, "invalid credentials")
		return
	}
	s.resetLimit(key)
	u.SessionID = uuid()
	refresh := randomToken()
	_, e = s.DB.Exec(r.Context(), "INSERT INTO mirror.sessions(id,user_id,refresh_hash,expires_at) VALUES($1,$2,$3,now()+interval '7 days')", u.SessionID, u.ID, hashToken(refresh))
	if e != nil {
		s.dbError(w, e)
		return
	}
	s.cookies(w, u, refresh)
	jsonResponse(w, 200, map[string]any{"user": u})
}
func (s *Server) refresh(w http.ResponseWriter, r *http.Request) {
	c, e := r.Cookie("mirror_refresh")
	if e != nil {
		problem(w, 401, "refresh required")
		return
	}
	next := randomToken()
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		s.dbError(w, e)
		return
	}
	defer tx.Rollback(r.Context())
	var u User
	e = tx.QueryRow(r.Context(), `UPDATE mirror.sessions s SET refresh_hash=$1 FROM mirror.users u LEFT JOIN mirror.tenants t ON t.id=u.tenant_id WHERE s.user_id=u.id AND s.refresh_hash=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='ACTIVE' AND (u.tenant_id IS NULL OR t.status='ACTIVE') RETURNING u.id::text,COALESCE(u.tenant_id::text,''),COALESCE(u.branch_id::text,''),u.email,u.role,u.status,s.id::text`, hashToken(next), hashToken(c.Value)).Scan(&u.ID, &u.TenantID, &u.BranchID, &u.Email, &u.Role, &u.Status, &u.SessionID)
	if e != nil {
		problem(w, 401, "invalid refresh token")
		return
	}
	if e = tx.Commit(r.Context()); e != nil {
		s.dbError(w, e)
		return
	}
	s.cookies(w, u, next)
	jsonResponse(w, 200, map[string]any{"user": u})
}
func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if c, e := r.Cookie("mirror_refresh"); e == nil {
		if _, e = s.DB.Exec(r.Context(), "UPDATE mirror.sessions SET revoked_at=now() WHERE refresh_hash=$1", hashToken(c.Value)); e != nil {
			s.dbError(w, e)
			return
		}
	}
	if u, e := s.authenticate(r); e == nil {
		if _, e = s.DB.Exec(r.Context(), "UPDATE mirror.sessions SET revoked_at=now() WHERE id=$1", u.SessionID); e != nil {
			s.dbError(w, e)
			return
		}
	}
	s.clearCookies(w)
	jsonResponse(w, 200, map[string]bool{"ok": true})
}
