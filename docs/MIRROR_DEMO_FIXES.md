# Smart Mirror demo fixes — 2026-11-16

## Actual findings and changes

- The real staff catalog API returned one product. Its Supabase public image returned HTTP 200, image/png, 803070 bytes. The old UI rendered images only for previous/next products, so neither existed in a one-product catalog. The selected garment now always has a visible thumbnail, selection button, selected-variant caption and unavailable-image fallback. Product selection never submits generation.
- The configured MediaPipe model and both WASM resources returned HTTP 200. Browser initialization reached TensorFlow Lite inference. The selected selfie model returns one foreground confidence mask, but code read confidenceMasks[1]; this missing second channel caused the generic failure banner. It now uses mask 0. The canvas was also always hidden by CSS; a ready cutout now displays. Background removal is optional, raw-camera fallback stays usable, and retry/status controls are in the product panel. This is person segmentation, not pose tracking or clothing fitting.
- Upload controls were absolutely positioned over the camera while product details occupied a separate overlapping layer. Upload, local photo preview, camera/photo source explanation, recovery control and the AI button now share a scrollable product panel. Desktop reserves a right column; small viewports use a lower panel. The selected photo can be removed to return to camera capture. Camera access/segmentation is not required when uploading a photo.
- The UI explicitly states that AI try-on creates a separate still image and that live garment overlay is not implemented. Disabled-generation responses now explain that no image was generated or credit used, rather than displaying backend environment-variable instructions.

## Verification

- Real staff login and authenticated PostgreSQL/Supabase-backed catalog through the existing Next proxy: passed.
- Real garment image fetch and rendered thumbnail: passed. A single garment is visible and selectable.
- Headless Chrome with synthetic video device: camera startup, actual MediaPipe model/WASM inference and one foreground mask passed. No model/WASM download failure was observed.
- Optional background-removal disable preserves visible raw video: passed.
- Deliberately blocking the model preserves raw video and exposes an actionable retry; removing that block and clicking retry recovers inference: passed.
- Local photo preview and enabled AI action with the camera off: passed.
- Product panel within viewport and uploader contained in that panel at 1440x1000, 390x844 and 844x390: passed; long content scrolls inside the panel.
- Browser-only MOCK job workflow: exactly one intercepted multipart POST containing user_image, product_id and variant_id, followed by status polling and a mock result image: passed. This was not a live provider job or AI-generated output.
- Existing Go race suite and PostgreSQL API/FASHN lifecycle tests with a fake provider and a separate disposable local test database: passed. Go vet passed. The temporary test database container was stopped afterward.
- TypeScript and production build checks passed during verification; final results are recorded below.
- Live backend generation gate: an authenticated empty POST returned HTTP 503. FASHN_ENABLE_PAID_REQUESTS remains false on the running backend. No paid request, real provider job, real AI result or key-validity test occurred.
- No uncaught browser page exceptions in the passing regression run. MediaPipe emitted nonfatal native delegate/GPU diagnostics; these were not treated as segmentation failures. Physical-camera/person quality still needs the user's browser check; a synthetic video test does not prove garment fitting or person-cutout quality on their hardware.

An automated failure-recovery check initially found retry hidden behind navigation/camera layers. Moving status into the panel with a callback-mounted portal resolved both obstruction and the race where the camera started before the catalog finished loading. The full browser regression then passed.

## Demo now

Refresh http://localhost:3000/mirror after staff login. The selected shirt is in the details panel. Choose a size, use the live camera or scroll the panel to upload a consented JPEG/PNG, and inspect the local preview. Turn off optional background removal if necessary. A try-on request currently shows the explicit disabled-generation message; never describe it as a successful AI result.

The original backend process on port 8080 was not restarted. No credentials or backend configuration were changed. The frontend remains on port 3000. Backend health, existing public/private storage and database data were preserved; browser checks did not mutate products, stock or orders. Authentication tests create ordinary login sessions only. No push or deployment occurred.

## One future real AI test — only after explicit authorization

1. First correct and validate the broken DATABASE_URL in backend/.env using a read-only connection check. Do not restart the working backend while that file is invalid. Confirm all required runtime values and existing migration/bucket readiness.
2. Obtain explicit permission for ONE paid FASHN generation and for the required backend restart. Keep the flag false until then. Use the existing single-output tryon-v1.6 path (num_samples=1); the current user instruction authorizes no paid request.
3. Under that authorization, temporarily enable FASHN_ENABLE_PAID_REQUESTS=true and start/restart only with validated configuration. Use the branch STAFF session, the published in-stock shirt with its approved image, and one consented person photo with a visible body. The garment image used in automated UI tests is not a valid person-photo acceptance test.
4. Click Virtual try on once and accept the single-photo confirmation. Wait for that same job's status/result. Do not click again or resubmit after a timeout or SUBMISSION_UNKNOWN; reconcile the existing job first. Browsing products does not generate automatically.
5. Record whether the real provider job succeeds and a real generated result displays. Mock success is not live acceptance. Restore the paid flag to false and restart safely after the controlled test.

Official model reference: [MediaPipe Selfie Segmentation model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf). The model's foreground mask does not implement a garment overlay.

## Final verification

Final TypeScript check and production build both passed after the status-target mounting fix. The full browser regression passed, including model-load failure/retry recovery and zero uncaught page exceptions. The original backend process remained unchanged and /healthz returned HTTP 200. The paid generation gate remained disabled; no credentials were edited and no real FASHN request was made.
