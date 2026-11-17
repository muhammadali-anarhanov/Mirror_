# Local MIRROR demo setup — 2026-11-16

Storage authentication passed. HTTP 400 on an individual missing bucket was diagnosed from its response as Bucket not found. Created product-images (public) and tryon-images (private), with JPEG/PNG and 5 MiB limits. No pre-existing storage object policies were present. No existing application or storage data was deleted.

## Running services

- Frontend: http://localhost:3000
- Login: http://localhost:3000/login
- Smart Mirror: http://localhost:3000/mirror
- Live product editor: http://localhost:3000/brand/products
- Backend health: http://localhost:8080/healthz

Use localhost consistently. Next.js is bound to localhost so its mutation-origin check agrees with FRONTEND_URL. An initial binding to 0.0.0.0 caused proxy login HTTP 403; restarting with localhost fixed it without application code changes.

## Accounts and catalog

New demo-only data: initial super-admin, MIRROR Development Demo brand, Demo Showroom branch, brand-admin and branch-staff accounts, one published DEMO - Pale Blue Oxford Shirt with an M / Sky blue variant and stock 10, and its approved catalog image. These are labeled sample records persisted through the real database/API, not real retail inventory or AI output.

Generated credentials are only in backend/.env.demo, mode 0600, Git-ignored. Do not copy passwords into chat, source control, screenshots or logs. Use DEMO_STAFF_EMAIL / DEMO_STAFF_PASSWORD for login followed by /mirror. Use DEMO_BRAND_EMAIL / DEMO_BRAND_PASSWORD for /brand/products. Bootstrap credentials provide platform-admin API access; many platform-admin UI modules remain demo previews.

## Verified

- Backend /healthz: HTTP 200.
- Frontend login and mirror pages: HTTP 200.
- Login and HttpOnly session flow through the Next.js proxy.
- Staff catalog loads the real PostgreSQL-backed demo garment, approved Supabase image and in-stock variant.
- Public catalog image fetch: HTTP 200.
- Consent-based private upload using a non-person fixture: passed.
- Owner-signed private image fetch: HTTP 200.
- Anonymous public-path fetch of the private image: denied (HTTP 400).
- Private fixture left to existing expiry/cleanup; no pre-existing object was deleted.
- Go tests and race-enabled database integration tests: passed. AI job success, failure, deduplication, lookup and credit handling used only a fake provider/storage and a separate disposable local PostgreSQL container; that container was stopped afterward.
- Live paid-generation safety gate: HTTP 503; provider generation disabled.

## Limits

## Restart if needed

From backend/: go run ./cmd/api

From frontend/: npm run dev -- --hostname localhost --port 3000