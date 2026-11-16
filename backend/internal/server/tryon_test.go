package server

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/png"
	"mirror/backend/internal/config"
	"net/http/httptest"
	"testing"
)

func TestTryonSafetyAndOutput(t *testing.T) {
	s := New(nil, config.Config{FashnAPIKey: "fixture-only"})
	w := httptest.NewRecorder()
	s.tryon(w, httptest.NewRequest("POST", "/api/v1/try-on", nil))
	if w.Code != 503 {
		t.Fatal("paid gate failed before database/image processing")
	}
	var b bytes.Buffer
	_ = png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 2, 3)))
	output := "data:image/png;base64," + base64.StdEncoding.EncodeToString(b.Bytes())
	if data, mime, err := decodeTryonOutput(output); err != nil || len(data) == 0 || mime != "image/png" {
		t.Fatal("valid generated image rejected")
	}
	for _, bad := range []string{"https://evil.example/result.png", "data:image/svg+xml;base64,xxx", "data:image/png;base64,bad"} {
		if _, _, err := decodeTryonOutput(bad); err == nil {
			t.Fatal("unsafe output accepted")
		}
	}
	if garmentCategory("Head") != "" || garmentCategory("Footwear") != "" || garmentCategory("Top Body") != "tops" {
		t.Fatal("incorrect garment mapping")
	}
}
