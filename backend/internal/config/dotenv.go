package config

import (
	"errors"
	"github.com/joho/godotenv"
	"os"
)

// LoadDotEnv loads the first local environment file found. Existing process values,
// including deliberately empty ones, win. Never include parser errors or values in logs.
// Run from backend/ or the repository root; production normally injects environment.
func LoadDotEnv() error {
	for _, path := range []string{".env", "backend/.env"} {
		_, err := os.Stat(path)
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err != nil {
			return errors.New("cannot access local environment file")
		}
		if godotenv.Load(path) != nil {
			return errors.New("cannot parse local environment file (contents hidden)")
		}
		return nil
	}
	return nil
}
