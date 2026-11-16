# FASHN integration

Implemented 2026-11-16 after the initial CURRENT_PROJECT_AUDIT snapshot. No real provider request or key-validity test was performed. All generation tests use fixtures and local HTTP mocks.

## Configuration

From `backend/`, `go run ./cmd/api check-fashn-config` checks the loaded Config key for presence, reports whether paid submission is enabled, and reports whether general backend configuration is valid. It exits before connecting to PostgreSQL or FASHN. It never prints the key. Presence does not prove provider validity, available balance or account access.

Startup loads the first `.env` found in the current directory or `backend/.env`. Existing process environment wins, including empty values. Run from repository root or backend directory. Parser errors are redacted; `.env` remains excluded by Git and the backend Docker build context. Current backend/.env permissions were checked and deny group/other access. Production should inject secrets through its runtime environment.

- `FASHN_API_KEY`: backend only.
- `FASHN_ENABLE_PAID_REQUESTS`: defaults false; only exact `true` enables generation. It was **not enabled** during implementation. Obtain explicit approval before enabling paid tests.
- Existing `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and separate product/private result buckets are still required for the full application.
- Docker Compose accepts provider variables from its environment/root env file. It does not automatically load backend/.env into Compose; explicitly supply the appropriate env file when running Compose.

New additive migration: `backend/migrations/003_fashn.sql`. Apply through the existing migrate command to the intended database before serving. The implementation did not migrate or reset the user's configured database. Startup now checks for migration 003.

## API and UI flow

1. Authenticated branch-bound staff/store user selects a published in-stock garment and variant with an approved catalog image. v1.6 supports Top Body, Pants and Full Body; Head/Footwear are rejected.
2. Mirror UI takes a full camera frame or accepts a JPEG/PNG file up to 5 MiB. Camera segmentation is no longer required for generation. Product browsing never generates automatically. The explicit action confirms provider processing, paid generation and retention.
3. `POST /api/v1/try-on` accepts multipart `user_image`, `product_id`, `variant_id`, `consent=true`, plus UUID `Idempotency-Key`. The paid switch is checked before image/DB handling. A tenant credit is reserved transactionally before a single provider submission. Customer photo bytes are validated/re-encoded and sent as a data URI, without storing a local input image. The garment URL is derived server-side, never supplied by the browser.
4. The FASHN adapter submits one `tryon-v1.6` image, requesting base64 output. Prediction ID is persisted along with usage metadata. Submission returns HTTP 202 and `{id,status,expires_at}`; duplicate matching submissions return the same job without another generation. Reusing a key for another owner/input is rejected.
5. `GET /api/v1/try-on/{id}` checks job ownership/tenant/branch, polls provider status when its poll lease permits, and returns PENDING, SUCCEEDED or FAILED. `GET /api/v1/try-on?key=<uuid>` recovers a lost submission response without submitting again.
6. Existing one-minute maintenance polls up to ten persisted pending predictions each pass, including after restart or browser disconnect. UI polls every three seconds; a database lease limits normal provider polls to every three seconds and backs errors off for 45 seconds. No paid submission is retried by maintenance.
7. Completed base64 output is bounded, decoded, validated and re-encoded, then stored in the existing private Supabase bucket with owner-scoped metadata. An orphan deletion job is committed before upload; normal expiry uses existing cleanup. The result expires 15 minutes after session creation. Responses sign results for at most 60 seconds. Frontend displays the returned URL.
8. Browser sessionStorage holds only an opaque request key/job ID, not photos or credentials. “Check previous try-on” resumes status checks. Leaving the page does not cancel an already accepted provider job; switching categories/stopping camera cancels local waiting only.

## Failure and cost handling

Concurrent duplicate requests serialize through the subscription row and consume one app credit. A provider failure, definite API rejection, unusable output or expired known prediction refunds one spendable extra app credit with a unique ledger reference. Monthly usage remains a historical count of reservations; refunds are extra credits. Actual provider currency costs are not invented; `ai_usage.actual_cost_micros` stays unset.

Provider transport errors, server errors, malformed submission responses and a process crash around dispatch are ambiguous. These jobs retain their credit reservation and surface SUBMISSION_UNKNOWN (stale SUBMITTING becomes unknown after one minute). They are **never automatically resubmitted**. An operator must reconcile them with provider history and apply an audited credit adjustment if appropriate. There is no documented provider submission-idempotency guarantee or reconciliation API implemented here. A crash after provider acceptance but before prediction-ID persistence cannot be solved exactly once locally.

A lost browser response keeps its pre-generated request key. Lookup can recover an accepted job. If lookup remains absent/uncertain, the UI requires reconciliation instead of making a new charge. The session ID/key is scoped to the current browser tab; it is not an account-wide job history interface. If sessionStorage is cleared, the browser loses that recovery handle.

Provider response/error bodies, image bytes and credentials are not logged or returned. Credential-bearing HTTP redirects are rejected. Base64 result processing avoids fetching arbitrary provider URLs. FASHN's own retention differs from MIRROR's: see official privacy documentation; MIRROR's cleanup does not delete provider request history. Default polling is suitable for this initial integration; production traffic still needs deployment-specific concurrency/rate controls and operational monitoring.

## Verification

The actual backend/.env key was loaded successfully by the presence-only CLI with paid submission false. Go unit tests, PostgreSQL lifecycle tests and race checking use fake provider credentials. Integration tests apply/replay migrations in randomly named disposable databases on an isolated local PostgreSQL container. Existing application PostgreSQL tests also run there. Live Supabase acceptance remains opt-in and was not enabled. No FASHN balance, status or run request was sent to the real service.

Remaining live acceptance requires configured PostgreSQL and Supabase, migration 003, suitable users/inventory/images/credits, a browser/camera test, and explicit permission before any paid provider generation. Passing mocked tests is not proof that the real API key or provider integration works.

## Official contract references

- [FASHN v1.6 request and inputs](https://docs.fashn.ai/api-reference/tryon-v1-6)
- [Submission and status polling](https://docs.fashn.ai/api-overview/api-fundamentals)
- [Data retention and privacy](https://docs.fashn.ai/api-overview/data-retention-privacy)

### Final check results

- `go test -race ./... -count=1` with TEST_DATABASE_URL pointing exclusively to temporary local PostgreSQL: passed, including existing PostgreSQL tests, migration replay, mocked FASHN lifecycle, concurrent deduplication, lookup, owner isolation, expiry/refunds, ambiguous submission protection and definite rejection. New lifecycle coverage also passes with a single-connection backend pool.
- `go vet ./...`: passed.
- `./node_modules/.bin/tsc --noEmit --incremental false`: passed.
- `npm run build`: passed (Next.js 16.4.3).
- `git diff --check`: passed. `backend/.env` is ignored and untracked; no commit was created.
- Real key presence: confirmed; paid switch: false; general runtime configuration: incomplete. Missing names only: DATABASE_URL, JWT_SECRET, FRONTEND_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. These values were not filled in or guessed.
- Live FASHN and live Supabase: not tested. Physical camera/browser behavior: not tested.

An intermediate TypeScript failure in reconnect null handling was corrected and the checks above rerun successfully. No live runtime was started with the user's credentials.
