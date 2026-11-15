# Implementation phases and verification

Work performed on 2026-11-15. This is an incremental backend delivery; the remaining
items below are explicit release boundaries. No public deployment or real Supabase
acceptance test was completed.

## Phase 1 — Frontend audit

Created `docs/frontend-backend-integration.md`. Inspected routes, admin definitions,
forms, roles, demo records, authentication, application persistence, mirror camera,
cart/checkout payloads, MediaPipe and localization. No frontend styling or pages were
replaced. Found no AI/payment provider. Existing demo modules remain available.
Validation: source inspection; original package scripts contain no frontend test runner.

## Phase 2 — Foundation, database, containers

Created `backend/go.mod`, `go.sum`, `cmd/api/main.go`, `internal/config`,
`internal/database`, `migrations/001_core.sql`, `002_operations.sql`, migration embedding,
`backend/Dockerfile`, `backend/.dockerignore`, root `docker-compose.yml`, `.gitignore`,
root/backend/frontend environment examples. Go 1.26.0 matches the installed toolchain.
The modular monolith uses a standard-library HTTP router, pgx and JWT/bcrypt libraries.
Database and storage clients are separate from HTTP modules; feature handlers live in
`internal/server` without empty placeholder packages.
Validated migrations against real PostgreSQL 17, including replay; tested Docker build,
Compose migration ordering, private database networking and health checks.
Fixed a replay bug exposed when a database username matched the new schema name by
qualifying the migration tracking table. Enabled RLS on the tracking table as well.

## Phase 3 — Authentication and permissions

Created `internal/server/auth.go`, guards and configuration tests. Implemented bcrypt,
10-minute JWT access cookies, rotating SHA-256-hashed refresh tokens with seven-day
absolute sessions, session revocation, database-verified roles/status, tenant/branch
guards, exact CORS origin/CSRF checks and local process login throttling. User APIs can
create tenant accounts and activate/suspend accounts; brand suspension revokes sessions.
Modified existing AuthPage, AdminRoute and admin sign-out control. No browser token or
database credential storage. Production catalog page verifies BRAND_ADMIN through Go.
Tests: invalid login, refresh replay, logout, suspension, JWT tampering/expiry, forbidden
roles, cross-tenant product/image access, cross-branch stock operations and cookie CSRF.
Remaining: recovery email delivery, cross-replica gateway rate limiting, richer role
editing/delegation, integration of the remaining production admin pages.

## Phase 4 — Management and storage

Created `internal/server/products.go`, `management.go`, `images.go`,
`internal/storage/storage.go`. Implemented brand/branch/device creation and scoped reads,
application review, user management, products and variants, barcode/SKU metadata,
inventory adjustment/transfers, branch/device plan limits, product images and temporary
customer images. Products are archived to preserve order history. Images are immutable
random paths, validated/re-encoded JPEG/PNG, max 5 MiB/20 MP. Only explicitly approved
catalog uploads enter the public bucket. Temporary images are private, owner-scoped,
expire after 15 minutes, have signed URLs max 60 seconds, and use durable deletion jobs.
Bucket provisioning is an operator CLI command; visibility is checked before serving.
Tests: real PostgreSQL plus a local Supabase-shaped storage test server covers upload,
metadata, replacement, old-object cleanup, deletion, consent/approval rejection, owner
access, signing and expiry deletion. This does not verify a live Supabase project.
Remaining: live bucket provisioning/policy review and project acceptance with credentials.

## Phase 5 — Incremental frontend integration

Created `frontend/lib/api.ts`, same-origin `app/api/v1/[...path]/route.ts`,
`lib/admin/product-api.ts`. Modified mirror requests, AuthPage, production catalog guard,
admin record save/image picker/delete flow, catalog category options, sign-out and the
existing application route (forwards to Go when BACKEND_URL is set; preserves legacy
fallback otherwise). Product editor is enabled using NEXT_PUBLIC_ENABLE_LIVE_CATALOG.
Authenticated catalog includes actual stock, image URLs and variants; branch inventory
stays separate. Preview records are not presented as live catalog rows when enabled.
Tests: TypeScript and production build; live HTTP through Next proxy for login/cookies,
refresh/logout, tenant/branch/user/product creation, inventory/catalog contract,
application submission and cross-origin rejection. Production page HTTP checks passed
for anonymous denial, verified BRAND_ADMIN access and logout revocation.
Remaining: other admin forms/charts remain marked previews. Physical camera behavior,
touch/rotation, rendered image loading and six-language visual regression need a browser
and camera test. HTTP/build checks do not prove those behaviors.

## Phase 6 — Mirror/AI boundary

Preserved browser camera, segmentation, category/variant selection, cart and layouts.
Added explicit single-photo consent before AI submission and an idempotency header.
Implemented cart and cashier-request APIs with current stock/price validation and scoped
orders; cashier requests are not counted as purchases. Schema supports sessions, provider
requests and actual costs. No provider contract or credentials exist: `/try-on` returns
503 before storing an image or deducting credit. No invented AI endpoint/pricing.
Tests: unavailable-provider response, cart/checkout and actual activity API checks.
Remaining: actual AI adapter, provider job status flow, cost reconciliation and refunds.

## Phase 7 — Entitlements and activity

Created `internal/server/activity.go`. Seeded proposed configurable Starter/Growth/Studio
plans (99/249/699 USD monthly; requested limits), additional credit package definitions
with prices unset, manual platform plan changes and credit grants. Credits use unique
references and database transactions; concurrent duplicate deductions are tested.
Added monthly-window reset and expiry maintenance. Analytics reads database counts and
explicitly reports no sales data; notification and audit read APIs are scoped.
Tests: branch/device caps, plan change policy, concurrent idempotency, exhausted credits,
monthly reset, duplicate grant protection, expiry and application decisions.
Remaining: payment provider, automatic renewal, purchased credit checkout, actual POS
sales, richer event-driven notifications and full admin analytics adapters.

## Phase 8 — Verification and deployment preparation

Created `backend/docs/openapi.json`, `SUPABASE_SETUP.md`, `DEPLOYMENT.md`, config/server
tests and an opt-in live Supabase storage test. No secrets, commits, pushes or hosting
changes were made by this implementation.

| Check | Final result |
|---|---|
| `go test ./...` | Passed; DB suite skips unless TEST_DATABASE_URL is supplied |
| `go test -race ./... -count=1` with local TEST_DATABASE_URL | Passed against disposable databases on Docker PostgreSQL 17 |
| `go vet ./...` | Passed |
| PostgreSQL migration application and replay | Passed |
| Docker multi-stage image build | Passed |
| Docker Compose startup and DB health | Passed |
| API `/healthz` | Passed HTTP 200 after service readiness |
| `npx tsc --noEmit` | Passed |
| `npm run build` with live catalog enabled | Passed |
| Next.js proxy + Go HTTP smoke checks | Passed |
| Production catalog page session guard | Passed HTTP checks |
| Real Supabase PostgreSQL connection | Not run: no DATABASE_URL supplied |
| Live Supabase bucket/public/private/sign/delete acceptance | Skipped: no project credentials supplied |
| Rendered image/camera/browser regression | Not run |
| Public HTTPS deployment | Not run: hosting/project access not supplied |

Initial local failures were corrected/rechecked: migration search-path ambiguity,
JSON parameter encoding in non-prepared pgx mode, and smoke-script JSON-array parsing.
A health probe issued immediately after container recreation failed transiently; the
final probe waits for service health. Docker emitted a missing-buildx warning but used
its classic builder successfully. npm's initial dependency install reported six existing
dependency vulnerabilities (two low, four moderate); dependencies were not upgraded
under this backend task. Standalone npm audit cannot use this pnpm-only lockfile.

Required developer values: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
JWT_SECRET and FRONTEND_URL; backend hosting/public URL for frontend BACKEND_URL.
Do not enable customer-facing AI, billing or unintegrated admin modules until the
corresponding remaining work and live staging acceptance are complete.
