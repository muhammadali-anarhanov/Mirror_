# Decart Lucy realtime fitting

Decart Lucy V-TON is MIRROR's only virtual fitting provider. The catalog Try On action opens `/mirror/try-on?productId=<UUID>`. The dedicated top-level page displays only the remote AI video returned by the native SDK's WebRTC connection. It fills the available viewport and supports the browser Fullscreen API.

The existing authenticated Go endpoints are `POST /api/v1/decart/token` and `GET /api/v1/decart/garments/{id}`. The garment endpoint resolves an approved, published, in-stock image from the signed-in tenant and branch catalog in Supabase Storage. It rejects arbitrary client URLs, redirects, oversized data and unsupported images. The main API credential stays on the backend; the browser receives a short-lived client token only after explicit consent.

Keep `DECART_ENABLE_REALTIME=false` until explicit paid-session approval. `DECART_API_KEY` is backend-only. Never put secrets in `NEXT_PUBLIC_` settings. Merely opening the fitting page loads catalog metadata and garment bytes; it does not request a camera, token or provider session. User consent and Start AI Fitting are required. Each session has a 60-second ceiling, no automatic retries and cleanup on Stop, Back to Catalog, pagehide or unmount. Provider errors stop fitting without substitute clothing or fake success.

All historical SQL migration files and ledger names remain unchanged. Historical prediction columns and private image rows remain compatible, but no legacy prediction polling or submission runs. Generic expired-image cleanup remains so old private data can expire normally. Product uploads, authentication, PostgreSQL, Supabase Storage, cart operations and admin routes are retained.

Non-billable verification commands:

```sh
cd backend
go test ./...
go vet ./...
# Optional isolated PostgreSQL integration suite:
TEST_DATABASE_URL=<local-disposable-postgres-uri> go test ./internal/server -count=1
cd ../frontend
npm test
npx tsc --noEmit
MIRROR_TEST_TOOLS=/tmp/mirror-validation node tests/browser-try-on.mjs
```

The browser test requires esbuild, Playwright and Chrome. Its SDK and video are explicit fixtures, its camera is synthetic, and external requests are blocked. It does not prove real AI garment quality. Live Decart model access, video quality, physical camera permissions and mobile fullscreen still need real-world acceptance after paid-session approval. No live session, commit, push or deployment is part of this change.
