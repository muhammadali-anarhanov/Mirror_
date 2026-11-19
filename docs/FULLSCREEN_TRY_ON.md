MIRROR fullscreen realtime fitting

Catalog Try On now starts fitting in place on /mirror: after consent, the showroom background image is replaced by the full-screen camera preview and then the Decart AI video, while the catalog UI (categories, side products, product card, cart) stays on top. Stop (live badge or the product card button) restores the showroom background. The standalone page /mirror/try-on?productId=<catalog UUID> remains available. The dedicated page uses the existing authenticated Go catalog, garment and token endpoints. No iframe or legacy renderer is imported by the dedicated page.

The selected approved JPEG/PNG is fetched through /decart/garments/:id, validated and displayed from a local blob URL. The backend resolves the tenant and branch catalog image; client image URLs are never passed to Decart. The existing server-held provider key and short-lived token endpoint are retained.

Camera, token and SDK connection start only after the consent checkbox and Start AI Fitting click. Only onRemoteStream output is attached to the video. Errors stop the session without a fake garment fallback. Stop, Back to Catalog, unmount and pagehide clean up the session. Fullscreen is optional and browser-dependent. Sessions remain capped at 60 seconds with no automatic retry. The shopping basket survives navigation through tab-local session storage; existing cart API operations are retained.

Non-billable verification:
- TypeScript check.
- Decart controller and API tests.
- Go Decart and server tests using local mock servers.
- tests/browser-try-on.mjs uses the fixture SDK and fake camera, blocks all external requests, and verifies selected image bytes, consent gating, fullscreen entry/exit, remote stream assignment, stopped camera tracks, token errors and absence of iframe/canvas renderers.
  Run with MIRROR_TEST_TOOLS pointing to a package containing esbuild and playwright.

Still requires real-world testing after explicit paid-session approval: actual account model access, live remote video, visual accuracy of the selected garment, physical-camera permission prompts, mobile fullscreen behavior and network interruptions against the provider. No paid connection, push or deployment was performed.

Production build limitation in this environment: Turbopack failed while creating a worker/local port (EPERM), including the elevated retry. The webpack fallback failed parsing TypeScript --showConfig output. Standalone TypeScript checking passed. A clean production build remains unverified.
