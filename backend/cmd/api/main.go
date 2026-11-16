package main

import (
	"context"
	"errors"
	"golang.org/x/crypto/bcrypt"
	"log/slog"
	"mirror/backend/internal/config"
	"mirror/backend/internal/database"
	"mirror/backend/internal/server"
	"mirror/backend/migrations"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if e := run(); e != nil {
		slog.Error("startup failed", "error", e.Error())
		os.Exit(1)
	}
}
func run() error {
	if e := config.LoadDotEnv(); e != nil {
		return e
	}
	if len(os.Args) > 1 && os.Args[1] == "check-fashn-config" {
		checked, configErr := config.Load()
		if checked.FashnAPIKey == "" {
			return errors.New("FASHN_API_KEY is not configured")
		}
		missing := []string{}
		for _, setting := range []struct{ name, value string }{{"DATABASE_URL", checked.DatabaseURL}, {"JWT_SECRET", checked.JWTSecret}, {"FRONTEND_URL", checked.FrontendURL}, {"SUPABASE_URL", checked.SupabaseURL}, {"SUPABASE_SERVICE_ROLE_KEY", checked.ServiceKey}} {
			if setting.value == "" {
				missing = append(missing, setting.name)
			}
		}
		slog.Info("FASHN_API_KEY loaded (value hidden)", "paid_requests_enabled", checked.FashnPaidRequests, "runtime_config_valid", configErr == nil, "missing_settings", missing)
		return nil
	}
	c, e := config.Load()
	if e != nil {
		return e
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()
	startup, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	db, e := database.Open(startup, c.DatabaseURL, c.MaxConns)
	if e != nil {
		return errors.New("database connection failed; check DATABASE_URL and TLS configuration")
	}
	defer db.Close()
	mode := "serve"
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}
	s := server.New(db, c)
	switch mode {
	case "migrate":
		return database.Migrate(ctx, db, migrations.Files)
	case "bootstrap":
		email := strings.ToLower(strings.TrimSpace(os.Getenv("BOOTSTRAP_EMAIL")))
		pw := os.Getenv("BOOTSTRAP_PASSWORD")
		if email == "" || len(pw) < 12 || len(pw) > 72 {
			return errors.New("set BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD (12..72 bytes)")
		}
		h, e := bcrypt.GenerateFromPassword([]byte(pw), 12)
		if e != nil {
			return e
		}
		_, e = db.Exec(ctx, "INSERT INTO mirror.users(email,password_hash,role) VALUES($1,$2,'SUPER_ADMIN')", email, string(h))
		return e
	case "storage-setup":
		if e = s.Storage.Provision(ctx, c.ProductBucket, true); e != nil {
			return e
		}
		return s.Storage.Provision(ctx, c.TryonBucket, false)
	case "cleanup":
		s.Cleanup(ctx)
		return nil
	case "serve":
	default:
		return errors.New("unknown command")
	}
	var migrated bool
	if c.ServiceKey != "" {
		if e = s.Storage.CheckBucket(ctx, c.ProductBucket, true); e != nil {
			return e
		}
		if e = s.Storage.CheckBucket(ctx, c.TryonBucket, false); e != nil {
			return e
		}
	}
	if e = db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM public.mirror_schema_migrations WHERE version='003_fashn.sql')").Scan(&migrated); e != nil || !migrated {
		return errors.New("run migrations before starting API")
	}
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			cleanup, cancel := context.WithTimeout(ctx, 45*time.Second)
			if e := s.MaintainSubscriptions(cleanup); e != nil {
				slog.Error("subscription maintenance failed")
			}
			s.Cleanup(cleanup)
			s.PollTryons(cleanup)
			cancel()
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
		}
	}()
	srv := &http.Server{Addr: ":" + c.Port, Handler: s.Handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 60 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdown)
	}()
	slog.Info("listening", "port", c.Port)
	e = srv.ListenAndServe()
	if errors.Is(e, http.ErrServerClosed) {
		return nil
	}
	return e
}
