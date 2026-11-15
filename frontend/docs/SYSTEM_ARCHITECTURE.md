# MIRROR System Architecture

## Decision
Retain the existing Next.js App Router application as the initial modular monolith. The repository is already a single Next.js 16 project with reusable admin, marketing, and kiosk components; replacing it with the suggested Vite/Go split would be a high-cost rewrite with no current scale evidence. Keep browser UI, server-rendered pages, and API route handlers in this codebase, and extract services only when operational evidence requires it.

## Current stack
- Next.js 16.4, React 19, TypeScript, Tailwind v4, shadcn/ui, Lucide, Recharts, and MediaPipe Vision.
- Neon Postgres with Drizzle ORM (`drizzle-orm/node-postgres`) and a shared `pg.Pool` using `DATABASE_URL`.
- Neon Managed Better Auth is provisioned at the project level. Its user/session tables live in the `neon_auth` schema; application role and tenant membership data live in `public.app_memberships`.
- Vercel deployment configuration exists; `next.config.mjs` sets baseline headers. No Go API, worker, queue, object store, payment integration, migrations pipeline, or production AI provider adapter is present in the repository.

## Target module boundaries
- `app/`: public pages, role-specific panels, kiosk route, and versioned Route Handlers.
- `components/`: shared design system plus marketing, administration, and kiosk UI.
- `lib/auth/`: Neon Managed Better Auth server/client integration and session helpers.
- `lib/access/`: server-side permission resolution, brand/branch scoping, and guards.
- `lib/db/`: Drizzle schema and database client; keep schema definitions aligned with the live database.
- `lib/modules/<domain>/`: domain validation and queries for applications, catalog, inventory, devices, try-on, credits, subscriptions, notifications, analytics, and audit.
- `docs/`: contracts, architecture, security, deployment, and phased delivery.

## Request and trust boundaries
1. Public browsers may submit validated public application data and request a kiosk catalog.
2. Authenticated requests obtain their identity from the server-side Neon Auth session. Never accept actor ID, role, brand ID, or branch ID as proof from a request body or query string.
3. Resolve active membership from `public.app_memberships`; then check the requested resource's brand and branch against that membership. Platform-wide operations require `SUPER_ADMIN` plus an explicit permission.
4. Route Handlers call domain services; services validate input and use scoped Drizzle queries. Mutations write domain rows and audit events in the same database transaction where possible.
5. Provider credentials and AI calls stay in server-only adapters. Customer images stay temporary and outside logs.

## Tenant isolation
- The existing membership row has a role-dependent scope: SUPER_ADMIN has no brand/branch, BRAND_ADMIN has a brand and no branch, and STORE_ADMIN/STAFF have both.
- The current `app_memberships` primary key is `auth_user_id`, which permits only one membership per user. The product requirement allows a user to belong to multiple brands/branches; decide on a composite or surrogate membership key before enabling multi-membership, and migrate additively with tests.
- Every tenant-owned table must include tenant ownership (directly or through a resource relation), and every query must join/check that ownership. Neon RLS is currently disabled; application-level checks are mandatory unless a deliberate RLS design is later adopted.
- Branch-scoped roles must be constrained to their assigned branch, even if they alter URLs or payloads.

## Persistence and consistency
Use PostgreSQL transactions for application status transitions, inventory movements/transfers, credit reservation/reconciliation, and other financial state. Keep append-only event/ledger tables separate from mutable current-state tables. Use soft deletion for business records with historical value. Use object storage for private product media only after its access and retention policy is chosen.

## Integrations
- Neon Managed Better Auth: enabled for email/password; use its supported Next.js SDK rather than a second auth database.
- AI: define a provider-neutral adapter and add a provider only after account access, privacy terms, image flow, and cost semantics are confirmed.
- Payments, POS, mail, and object storage are not currently connected; expose explicit integration boundaries and report these as pending.

## Architecture risks and migration strategy
1. Existing admin pages simulate users, metrics, and writes in local component state; they must remain marked as previews until protected APIs exist.
2. Live database schema and `lib/database-schema.ts` drift: several live tables are missing from the Drizzle model, while auth is managed under `neon_auth`. Introspect before writing SQL or modeling existing columns.
3. Existing `app_memberships` only supports one membership per user; do not assume it satisfies multi-brand access.
4. No destructive rewrite is required. Preserve existing public application data and UI, add new tables/columns/indexes in separately reviewed additive migrations, and use compatibility reads until any later migration is explicitly approved.
5. Existing public route `/` is a personal portfolio; MIRROR marketing pages are served from dynamic routes. Product IA should make the MIRROR public site the intended marketing surface while preserving the founder page as a separate route, rather than silently deleting portfolio content.
