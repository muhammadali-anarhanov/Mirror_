# MIRROR Implementation Roadmap

Work in vertical slices. Each phase preserves existing public and kiosk behavior unless a migration has been reviewed. A phase is complete only when tests and data/security behavior match the UI.

## Phase 1 — Repository and architecture audit
**Status: Complete.** Preserve the Next.js modular monolith. Record live Neon schema, current routes, demo-only surfaces, security gaps, and migration risks.

## Phase 2 — Foundation and design system
**Status: In progress.** The MIRROR marketing homepage is now the public root, and the existing personal portfolio is preserved at `/founder`.
Unify semantic tokens, responsive admin shell, route IA, locale infrastructure, and shared forms/tables/states. Keep public marketing content, founder introduction, admin, and kiosk as distinct experiences.

## Phase 3 — Authentication, memberships, and access controls
Integrate Neon Managed Better Auth SDK, secure session cookie configuration, role/membership lookup, server guards, and sign-in/out/recovery. Review the single-membership-per-user constraint before enabling multi-tenant assignments. Test 401/403 and tenant/branch isolation.

## Phase 4 — Brand, branch, catalog, inventory, and devices
Add validated database-backed CRUD one domain at a time. Start with applications and product catalog; then variants, branch availability, stock movements/transfers, employees, and devices. Every mutation is transactional where necessary and audited.

## Phase 5 — Kiosk and try-on boundary
Connect the kiosk to an authorized branch catalog. Finish explicit camera consent, portrait/landscape layouts, reset/exit, offline/failure states, and temporary image handling. Define a provider-neutral adapter before enabling an AI vendor.

## Phase 6 — AI requests and credit ledger
Implement request idempotency, credit reservation/reconciliation, provider usage/cost tracking, failure releases, configurable limits, and thresholds. Validate privacy and pricing terms before sending images.

## Phase 7 — Subscriptions and hardware rental
Model configurable plans and limits. Add invoices/payment state only after Stripe or another payment integration is explicitly connected; keep hardware rental separate from SaaS and AI consumption.

## Phase 8 — Analytics, notifications, and audit
Use defined events for platform, brand, and branch analytics. Separate try-on activity from POS-confirmed purchases. Add scoped notifications and append-only audit filters/export.

## Phase 9 — Public site and application workflow
Make the MIRROR product site the canonical public marketing surface, preserve a distinct founder page, finish application review states, and ensure submitted applications appear only in the authorized platform queue.

## Phase 10 — Security, testing, deployment, and pilot
Complete auth, isolation, lifecycle, inventory, credit, billing, responsive, keyboard, multilingual/RTL, and end-to-end tests. Verify migration/backup/restore, headers, logging/monitoring, and a controlled hardware/provider pilot.

## Current gaps and next slice
- Public application persistence exists; its admin review workflow is not protected or database-backed in the UI.
- Admin screens still use illustrative local data and a URL-controlled role preview.
- The auth provider is provisioned, but session verification and server-side authorization are not integrated.
- `app_memberships` currently supports one membership per auth user; the product's many-brand/many-branch goal needs a reviewed migration.
- The next implementation slice is auth/session integration and protected application review. The managed auth cookie secret must be configured before server SDK code is added.

## Per-phase report
Record changed modules, tests run and results, migrations applied, access-control checks, remaining integration dependencies, and the next slice. Never convert an unavailable check into a passing claim.
