package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDotEnv(t *testing.T) {
	t.Chdir(t.TempDir())
	t.Setenv("DATABASE_URL", "postgres://test@localhost/db")
	t.Setenv("JWT_SECRET", strings.Repeat("x", 32))
	t.Setenv("FRONTEND_URL", "http://localhost:3000")
	t.Setenv("APP_ENV", "development")
	t.Setenv("SUPABASE_URL", "")
	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", "")
	t.Setenv("FASHN_ENABLE_PAID_REQUESTS", "false")
	// Restore this variable even though the dotenv loader, rather than Setenv, sets it.
	t.Setenv("FASHN_API_KEY", "restore-me")
	os.Unsetenv("FASHN_API_KEY")
	if err := os.Mkdir("backend", 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join("backend", ".env"), []byte("FASHN_API_KEY='fixture-only'\nFASHN_ENABLE_PAID_REQUESTS=true\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := LoadDotEnv(); err != nil {
		t.Fatal("dotenv loading failed")
	}
	c, err := Load()
	if err != nil {
		t.Fatal("config loading failed")
	}
	if c.FashnAPIKey != "fixture-only" || c.FashnPaidRequests {
		t.Fatal("dotenv not loaded or process environment overwritten")
	}
	t.Setenv("FASHN_API_KEY", "process-fixture")
	if LoadDotEnv() != nil || os.Getenv("FASHN_API_KEY") != "process-fixture" {
		t.Fatal("process key overwritten")
	}
	if err := os.WriteFile(".env", []byte("INVALID KEY = \"unterminated"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := LoadDotEnv(); err == nil || strings.Contains(err.Error(), "unterminated") {
		t.Fatal("unsafe parse error")
	}
}
