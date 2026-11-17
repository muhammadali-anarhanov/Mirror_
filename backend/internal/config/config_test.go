package config

import (
	"strings"
	"testing"
)

func TestProductionConfig(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://user:pass@db.example:5432/postgres?sslmode=verify-full")
	t.Setenv("JWT_SECRET", "test-secret-with-at-least-32-bytes-long")
	t.Setenv("FRONTEND_URL", "https://mirror.example")
	t.Setenv("APP_ENV", "production")
	t.Setenv("SUPABASE_URL", "")
	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", "")
	t.Setenv("SUPABASE_PRODUCT_BUCKET", "product-images")
	t.Setenv("DB_MAX_CONNS", "5")
	if _, e := Load(); e != nil {
		t.Fatal(e)
	}
	t.Setenv("DATABASE_URL", "postgres://user:pass@db.example/db?sslmode=disable")
	if _, e := Load(); e == nil {
		t.Fatal("production plaintext connection accepted")
	}
	t.Setenv("DATABASE_URL", "postgres://user:pass@db.example/db?sslmode=verify-full")
	t.Setenv("FRONTEND_URL", "https://mirror.example/path")
	if _, e := Load(); e == nil {
		t.Fatal("non-origin CORS config accepted")
	}
}

func TestDatabaseURLValidationIsRedacted(t *testing.T) {
	for _, raw := range []string{"", "not-a-url", "https://user:secret@db.example/app", "postgres://user:secret@/app", "postgres://user:secret@db.example", "postgres://user:secret@db.example/<database>", "postgres://user:%xx@db.example/app"} {
		err := ValidateDatabaseURL(raw)
		if err == nil {
			t.Fatal("invalid database URL accepted")
		}
		if strings.Contains(err.Error(), "secret") || strings.Contains(err.Error(), raw) && raw != "" && raw != "not-a-url" {
			t.Fatal("database credentials disclosed")
		}
	}
	if err := ValidateDatabaseURL("postgresql://user:fixture@127.0.0.1:5432/app?sslmode=disable"); err != nil {
		t.Fatal(err)
	}
}
