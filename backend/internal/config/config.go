package config

import (
	"errors"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	DatabaseURL, SupabaseURL, ServiceKey, ProductBucket, TryonBucket, JWTSecret, Port, FrontendURL string
	Production                                                                                     bool
	MaxConns                                                                                       int32
}

func Load() (Config, error) {
	c := Config{DatabaseURL: os.Getenv("DATABASE_URL"), SupabaseURL: strings.TrimRight(os.Getenv("SUPABASE_URL"), "/"), ServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"), ProductBucket: env("SUPABASE_PRODUCT_BUCKET", "product-images"), TryonBucket: env("SUPABASE_TRYON_BUCKET", "tryon-images"), JWTSecret: os.Getenv("JWT_SECRET"), Port: env("PORT", "8080"), FrontendURL: strings.TrimRight(os.Getenv("FRONTEND_URL"), "/"), Production: os.Getenv("APP_ENV") == "production", MaxConns: 5}
	if c.DatabaseURL == "" || len(c.JWTSecret) < 32 || c.FrontendURL == "" {
		return c, errors.New("DATABASE_URL, JWT_SECRET (32+ bytes), FRONTEND_URL are required")
	}
	u, e := url.Parse(c.FrontendURL)
	if e != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.Path != "" || u.RawQuery != "" {
		return c, errors.New("FRONTEND_URL must be an exact origin")
	}
	if c.Production && u.Scheme != "https" {
		return c, errors.New("production frontend requires HTTPS")
	}
	d, e := url.Parse(c.DatabaseURL)
	if e != nil {
		return c, e
	}
	if c.Production && d.Query().Get("sslmode") != "verify-full" {
		return c, errors.New("production DATABASE_URL must use sslmode=verify-full")
	}
	if (c.SupabaseURL == "") != (c.ServiceKey == "") {
		return c, errors.New("configure both Supabase URL and service role key")
	}
	if c.SupabaseURL != "" {
		u, e = url.Parse(c.SupabaseURL)
		if e != nil || u.Scheme != "https" || u.Host == "" {
			return c, errors.New("Supabase URL must use HTTPS")
		}
	}
	if c.ProductBucket == c.TryonBucket {
		return c, errors.New("storage buckets must differ")
	}
	if n := os.Getenv("DB_MAX_CONNS"); n != "" {
		v, e := strconv.Atoi(n)
		if e != nil || v < 1 || v > 50 {
			return c, errors.New("DB_MAX_CONNS must be 1..50")
		}
		c.MaxConns = int32(v)
	}
	return c, nil
}
func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
