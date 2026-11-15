# Deploying MIRROR

## Local development

Keep the existing `frontend/` directory. Copy root `.env.example` to `.env`; generate
POSTGRES_PASSWORD and JWT_SECRET, set FRONTEND_URL=http://localhost:3000. The root file
is for Compose interpolation; Compose deliberately uses its private local PostgreSQL,
not your production DATABASE_URL. Do not expose database ports.

```sh
docker compose up --build -d
docker compose ps
curl --fail http://localhost:8080/healthz
cd frontend
# Set BACKEND_URL=http://localhost:8080 in frontend/.env.local.
npm install --package-lock=false
npm run dev
```

Use the committed pnpm lockfile with its configured pnpm version for reproducible
installs when available. npm commands above are the tested fallback in this environment.
Local PostgreSQL works offline **after** images/modules are cached. Image storage still
requires Supabase; missing keys produce explicit 503 errors, never fake successful uploads.
Use `docker compose run --rm -e BOOTSTRAP_EMAIL -e BOOTSTRAP_PASSWORD api bootstrap`
for initial admin provisioning. Seed brand/branch/users through API calls described in
SUPABASE_SETUP.md and backend/docs/openapi.json. No default login/password exists.

## Production database and storage

Complete [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Production uses Supabase PostgreSQL
and its two storage buckets. Set APP_ENV=production, verified database TLS and an exact
HTTPS frontend origin. Do not deploy the local Compose PostgreSQL to a public port.
Use a migration owner to run `api migrate` as a release job once per release. Runtime
role needs schema USAGE and appropriate table DML, but no DDL or CREATEDB. The schema
has RLS enabled with no browser policies; the runtime role must be a trusted backend
owner/BYPASSRLS role (or have separately reviewed backend-only policies). All Go queries
enforce tenant/branch scope. Never expose that role through Supabase REST.

## Backend on Render (Docker web service)

1. Push the reviewed repository to your Git provider; no commit/push was made here.
2. In Render create a Web Service from the repository; select Docker, root `backend`,
   Dockerfile `./Dockerfile`, and a region near Supabase. Use an always-on service for
   retention cleanup; scale-to-zero requires an independent cleanup scheduler.
3. Inject every backend variable from SUPABASE_SETUP.md through service secrets. Set
   FRONTEND_URL to the intended stable frontend domain; never wildcard credentialed CORS.
   Render supplies PORT; the API binds `0.0.0.0:$PORT`. Mount CA files if required.
4. Configure pre-deploy command `/app/api migrate` where supported, or run the built
   image's `migrate` command in a release job with the migration-owner DATABASE_URL.
5. Run `/app/api storage-setup` once with storage credentials. Review storage policies.
   Run `/app/api bootstrap` once with the initial admin secrets, then remove them.
6. Health check path: `/healthz`. Require HTTPS through the host's TLS termination.
   Deploy, inspect JSON startup logs and confirm public `curl --fail https://.../healthz`.
7. Configure restart-on-failure and SIGTERM grace of at least 10 seconds. The image
   runs as an unprivileged user; use read-only filesystem and temporary /tmp where supported.

Equivalent Docker hosts can run `docker build -t mirror-api ./backend`, then inject
secrets at runtime. Keep the internal HTTP port behind the host's HTTPS proxy. Never
copy `.env` into images or pass keys through Docker build args. No automatic deployment
was performed; account, project and hosting credentials are not available.

## Frontend on Vercel

Import the same repository, set root directory `frontend`, framework Next.js, and use
the repository's package manager. Set server-only BACKEND_URL to the backend HTTPS
origin and NEXT_PUBLIC_API_BASE_URL=/api/v1. This is a Next.js deployment, not a static
export: the same-origin API proxy and application route need a server runtime.
Do not set DATABASE_URL on the frontend when using Go application submission.

Use one stable production domain matching FRONTEND_URL. Preview deployments need a
separate staging backend configured with their exact origin. Login stores HttpOnly,
Secure, SameSite=Lax cookies through the proxy; browsers never store bearer tokens in
localStorage. Cookies have no Domain attribute. Configure provider request body limits
for the 5 MiB image API; if a host's proxy limit is smaller, use a suitable reverse proxy
or reduce the upload limit. Do not bypass the Go upload validation with privileged SDKs.

## Operational checks

- Monitor health, HTTP errors, DB pool capacity, oldest storage deletion job and backup
  restore results. Logs omit request bodies, passwords, signed URLs and query strings.
- Enable Supabase managed DB backups/PITR according to your plan. Schedule restore drills.
  Database backups do not replace object backups. Catalog images may need separate
  backups; exclude temporary customer images from application backup jobs.
- Keep secrets in the host secret manager; rotate service/JWT/DB credentials after
  exposure. JWT secret rotation signs out current sessions. Expired sessions can be
  pruned by an operator job. Add gateway rate limits across replicas; in-process login
  limits cover one instance and deliberately do not trust arbitrary forwarded IP headers.
- Run `go test ./...`, `go vet ./...`, the PostgreSQL race suite, Docker health checks,
  `npx tsc --noEmit`, and `npm run build` before release. Perform live staging Supabase
  and browser acceptance checks before enabling catalog use for customers.

## Current release boundaries

This is an incremental backend MVP, not a completed production rollout. Authentication,
catalog/inventory, storage, subscription entitlement primitives and real activity APIs
exist. Mirror camera/cart layout and demo functionality are preserved. The live product
editor is opt-in via NEXT_PUBLIC_ENABLE_LIVE_CATALOG=true; the production catalog page
requires a server-verified BRAND_ADMIN session. Other production admin preview gates remain. Other
admin dashboards/workflows still display explicitly marked sample data and require API
adapters and server-verified page authorization before being opened in production.
Account recovery needs email delivery. There is no AI provider contract, provider pricing,
POS or payment integration; AI returns 503 without collecting an image or charging.
Credits can be manually granted; subscription renewal is manual. Proposed plan prices
are business settings in DB, not confirmed market prices or active charges. A full
provider job dispatcher, actual-cost reconciliation/refunds, billing and remaining admin
workflow integration are follow-up work; do not advertise them as active services.
