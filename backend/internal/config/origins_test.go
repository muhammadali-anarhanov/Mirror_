package config

import "testing"

func TestAllowedOriginList(t *testing.T) {
	c := Config{FrontendURL: "https://mirror.example, https://www.mirror.example"}
	for _, o := range []string{"https://mirror.example", "https://www.mirror.example"} {
		if !c.AllowedOrigin(o) {
			t.Fatalf("%s must be allowed", o)
		}
	}
	for _, o := range []string{"", "https://evil.example", "http://mirror.example", "https://mirror.example, https://www.mirror.example"} {
		if c.AllowedOrigin(o) {
			t.Fatalf("%q must be rejected", o)
		}
	}
}
