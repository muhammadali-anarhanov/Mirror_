package server

import "testing"

func TestLoginLimitCountsOnlyFailures(t *testing.T) {
	s := &Server{attempts: map[string]attempt{}}
	key := "login:1.2.3.4:a@b.c"
	for i := 0; i < 100; i++ {
		if s.limited(key) {
			t.Fatal("checking the limit must not consume attempts")
		}
	}
	for i := 0; i < 20; i++ {
		s.rateLimit(key)
	}
	if !s.limited(key) {
		t.Fatal("20 failed attempts must lock the key")
	}
	if s.limited("login:1.2.3.4:other@b.c") {
		t.Fatal("other accounts behind the same proxy IP must not be locked")
	}
	s.resetLimit(key)
	if s.limited(key) {
		t.Fatal("successful login must clear failures")
	}
}
