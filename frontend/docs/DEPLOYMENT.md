# MIRROR Deployment

## Current deployment shape
The repository is a Next.js 16 App Router application intended for Vercel. It uses Neon Postgres through the project integration and a pooled `DATABASE_URL`; current preview service is `pnpm exec next dev --hostname 0.0.0.0` on port 3000. Docker Compose, Go services, a background worker, CI pipeline, database migration runner, production monitoring, and backup automation are not present in this repository.

## Runtime configuration
Managed Neon provides `NEON_AUTH_BASE_URL`; add `NEON_AUTH_COOKIE_SECRET` through the Vercel project environment variable flow before integrating the server auth SDK. It must be a random value of at least 32 characters and differ between environments. Keep database and provider secrets server-only. Never print or commit environment values.

Expected application variables as features are connected:
- `DATABASE_URL` — pooled Neon Postgres URL, already supplied by the Neon integration.
- `NEON_AUTH_BASE_URL` — Managed Better Auth endpoint, already supplied by Neon.
- `NEON_AUTH_COOKIE_SECRET` — secure cookie-signing secret required by the Neon Next.js server SDK; currently absent from the project variable inventory.
- Provider/storage/payment credentials — only after the corresponding integration is explicitly connected; never place in client-visible `NEXT_PUBLIC_*` variables.

## Local and preview workflow
- Install using the repository lockfile (`pnpm install --frozen-lockfile`).
- Run the Next dev server through the registered `virtual-fitting-room` service.
- Keep `.env.development.local` local to the environment; do not commit it or copy values into shared setup recipes.
- Run focused type/lint/tests for the changed feature; use `pnpm build` as a separate production validation when required. Do not use a production build as preview startup.

## Database changes
- Inspect the live Neon schema before querying or migrating existing tables.
- Apply small additive DDL through the Neon MCP, one SQL statement per call, then update the Drizzle model and verify the live schema.
- Do not run destructive SQL or drop/rename populated structures without explicit review and an approved backup/rollback plan.
- Database setup for preview and production must be reproducible and environment-specific; do not apply seed/sample tenant records to production.

## Production readiness checklist
- Configure distinct production and preview secrets, exact trusted origins, and production auth settings.
- Verify all role/tenant protections and public/private route boundaries.
- Verify the deployment's Vercel project points to the expected repository/root directory and production branch.
- Confirm migrations, rollback procedure, point-in-time restore, retention, and scheduled backups.
- Confirm monitoring/alerting for auth failures, database saturation, failed try-on requests, provider costs, and offline devices.
- Review response headers, CSP reports, rate limits, upload limits, privacy notice, data retention, and incident contacts.
- Complete a controlled pilot with verified branch/device configuration and provider terms before enabling customer image processing or billing.

## Not yet production-ready
Authentication is not wired into the app; admin UI remains sample-only; subscription prices and billing are not connected; the AI provider and credit ledger are not implemented; no backup/restore or CI workflow is verified. Do not claim production readiness until these gates pass.
