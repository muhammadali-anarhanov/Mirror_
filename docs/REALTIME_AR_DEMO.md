# Real-time 2D AR clothing demo

Implemented 2026-11-16. This is a real local webcam-to-Pose-Landmarker-to-canvas overlay; it does not use FASHN, store camera frames, call the backend for tracking, or generate a paid image.

## Physical webcam test

1. Open http://localhost:3000/mirror in the existing STAFF session. Refresh if an older page is still displayed.
2. At the top of the product panel, keep **Live 2D clothing overlay** checked and choose **Blue crew-neck** or **Coral striped tee**. Choosing a shirt starts the existing webcam flow; allow camera permission.
3. Face the camera in good light. Stand far enough back to show both shoulders and both hips. The status changes from model loading/searching to **Torso tracked — live 2D shirt overlay**.
4. Move left/right, lean, tilt your shoulders and move slightly closer/farther. The shirt should stay on your torso and change position/scale/rotation. Switch shirts while moving; the pose model is not restarted.
5. Move out of frame: the garment clears and the status asks you to show shoulders/hips. Return to frame: tracking reacquires. Stopping the camera clears the overlay.
6. Uncheck the live overlay to return to the existing optional background-removal/camera mode. Catalog, upload, cart and separate FASHN controls remain available. Background removal is temporarily disabled while AR uses the raw video to maintain a single, correct coordinate system.

## Implementation

- `frontend/components/pose-garment-overlay.tsx`: one CPU Pose Landmarker instance in VIDEO mode, one person, inference throttled to approximately 20 FPS, requestAnimationFrame loop, resize-aware high-DPI canvas, bounded smoothing, tracking status, retry and cleanup. Both shirt images preload; switching only updates the selected image ref.
- `frontend/lib/pose-overlay.ts`: normalized landmarks 11/12 (shoulders), 23/24 (hips) projected through the same object-fit/letterboxing/crop and horizontal mirror as the displayed webcam. An affine transform maps calibrated shirt shoulder anchors and the hem/hip axis to the user's torso. Low-confidence, missing, invalid and nearly side-on poses do not draw a shirt. Lost poses clear immediately rather than leaving a floating garment.
- `frontend/public/ar-shirts/blue-shirt.svg` and `coral-shirt.svg`: original deterministic, transparent front-view vector shirts. 600x720 viewBox; shoulder anchors (150,100)/(450,100), hem midpoint (300,660). They are explicit local demo assets, not the catalog's Oxford shirt and not AI-generated images. Corners are transparent; the torso is opaque. The code stretches/rotates these assets onto the inferred torso.
- `frontend/public/models/pose_landmarker_lite.task`: official pinned Pose Landmarker Lite model, 5777746 bytes, SHA256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`. Served locally by Next.js. The existing pinned MediaPipe 1.2.2 WASM runtime is loaded from jsDelivr.
- `frontend/components/mirror-room.tsx`: two-shirt controls, selection-triggered camera start, AR enable/disable, status target and canvas integration. FASHN result view pauses the live overlay and remains separate.
- `frontend/app/globals.css`: shared raw-video/canvas viewport, stacking above video and below interface, responsive desktop/portrait/landscape AR area and controls.
- `frontend/tests/pose-overlay.test.mjs`, `frontend/package.json`: repeatable geometry regression command.

The two SVG assets were authored directly as calibrated vector artwork. No image-generation API was used.

## Automated verification

- `cd frontend && npm run test:overlay`: 11 tests passed. Shoulder/hem anchoring, translation, mirrored movement, rotation, scale, contain letterboxing, cover cropping, confidence rejection, invalid points, side-on rejection and smoothing.
- `cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false`: passed.
- `cd frontend && npm run build`: passed, Next.js 16.4.3 production build.
- Headless Chrome with an animated public MediaPipe person-image fixture streamed through a synthetic webcam: **actual Pose Landmarker inference**, not injected landmarks. The shirt rendered on the detected torso (over 10000 nontransparent canvas pixels); source-right movement moved the rendered shirt left by about 95 canvas pixels, confirming mirrored alignment. Shirt switching changed rendered colors without reloading the model. Scaling/rotation, portrait/landscape resizing, lost-person clearing, reacquisition and camera-stop clearing passed. No uncaught page exceptions and zero FASHN submissions.
- Transparency was checked by rasterizing each actual SVG in Chrome: corner alpha=0, torso alpha=255.
- The real physical camera was not accessible in automated testing. Perform the physical test above; automated synthetic-stream inference does not establish quality on every webcam/person/device.

The temporary browser test scripts/screenshots are in `/tmp/mirror-browser-check/` on this machine. The moving person source is Google's public `pose.jpg` sample, used only as a test stream and not added to the app or represented as physical-camera evidence.

## Limits

This is a flat 2D affine overlay: no cloth physics, 3D draping, body measurements, arm occlusion, or photorealistic fitting. Sleeves do not articulate with elbows; arms may pass behind the drawn shirt. Best results are one front-facing person, shoulders/hips visible, good light, slow movement. CPU speed and webcam resolution affect FPS/lag; extreme side poses or occlusion hide the garment. Initial WASM loading requires network access. The shirt presets are not automatically derived from uploaded catalog photos.

No credentials, backend code/configuration, users, database tables or storage settings were changed for this feature. The existing backend process was not restarted. FASHN paid generation remains disabled; no migration, paid request, push or deployment occurred.

Sources: [official Pose Landmarker Web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker?tab=Web), [pinned official model](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task), [public person-image test fixture](https://storage.googleapis.com/mediapipe-assets/pose.jpg).

## Existing-feature preservation check

The existing browser regression was rerun with live AR disabled, selecting the segmentation canvas explicitly now that two canvases exist. Staff login, live catalog image/selection, optional person segmentation, raw-camera fallback, photo preview without camera, three viewport layouts, disabled paid-generation gate, browser-mocked FASHN submission/polling/result, blocked-model fallback and retry all passed. No uncaught page exceptions were observed. This did not run paid generation or restart the backend.
