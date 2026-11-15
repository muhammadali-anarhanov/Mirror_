# MIRROR Database Schema

## Live Neon inventory (audited)
The connected Neon database currently contains these tables:

- `neon_auth`: `user`, `session`, `account`, `verification`, plus managed-auth organization/invitation/member/JWKS/config tables.
- `public`: `applications`, `application_events`, `brands`, `branches`, `app_memberships`, and `audit_logs`.

The live integration schema reports RLS disabled and no policies on these tables. Do not query or expose auth secrets, password hashes, tokens, or customer images. Do not use `SELECT *` for auth tables.

## Current public tables
### `applications`
UUID primary key; application type constrained to DEMO/PARTNERSHIP/CONTACT; company, contact, and email required; optional phone, country, website, branch estimate, message; status defaults to NEW and has a constrained lifecycle; nullable assignee; created/updated timestamps. The API validates submissions and inserts an initial event transactionally.

### `application_events`
UUID primary key; application ID, optional actor UUID, event type, optional prior/new status and note, JSONB details, timestamp. Treat as append-only in application behavior. Confirm/add the live foreign key and event query indexes through an additive migration after schema review.

### `brands`
UUID ID; name/slug/contact/description/status, creator, block metadata, and timestamps. Status includes suspension-related state without deleting the tenant.

### `branches`
UUID ID; required brand ID, name, slug, address, city, country, timezone, status, creator, timestamps; unique `(brand_id, slug)`.

### `app_memberships`
`auth_user_id` UUID primary key, role, optional `brand_id`/`branch_id`, ACTIVE/SUSPENDED status, JSONB permissions, creator, timestamps. A check constraint enforces the role/scope combinations. The primary key currently limits each auth user to one membership; multi-membership needs a reviewed additive migration.

### `audit_logs`
UUID ID, optional actor, action, resource type/id, JSONB details, timestamp. The current table has no tenant/branch context columns, no indexes beyond primary key, and no database-level append-only enforcement; expand before relying on it for complete audit history.

## Application schema alignment
`lib/database-schema.ts` currently defines only `applications` and `application_events`. Keep it synchronized with the live schema before making queries. The source of truth for existing table columns, nullability, constraints, and indexes is the live Neon schema, not an inferred TypeScript definition.

## Target normalized domains
Add only when a feature is implemented, through small additive migrations:

- Catalog: `products`, `product_variants`, `product_images`, and branch availability.
- Inventory: `branch_inventory`, `inventory_movements`, and `stock_transfers` with immutable movement records.
- Devices: `devices`, heartbeat/activity events, and configuration history.
- Try-on: `tryon_sessions`, `tryon_events`, and `ai_requests` with idempotency keys and no default customer-image persistence.
- Credits: `credit_accounts` plus append-only `credit_ledger`; reserve, consume, release, refund, and expiry events are distinct ledger entries.
- Commercial: configurable `subscription_plans`, `subscriptions`, invoices/payments from an explicitly connected provider, and optional `hardware_assets`/`hardware_rentals`.
- Operations: notifications, integration configuration references (never raw secrets), audit events, role/permission definitions, and application review events.

Every tenant-owned row must carry `brand_id` or be reachable through a constrained relation. Branch-owned data must carry `branch_id`. Use UUID primary keys, unique constraints for tenant-scoped slugs/SKUs, foreign keys where referential integrity is required, timestamps, status checks, and indexes for authorization joins and common filters. Use `deleted_at` only on entities whose history must be retained.

## Key invariants
- Database IDs and scopes come from server-side authenticated membership checks, not client-provided `brand_id` or `branch_id`.
- Inventory writes create a movement and update current stock in one transaction; transfers have an explicit state machine and cannot overdraw source stock.
- Credit balance is derived from ledger entries or a transactionally maintained account reconciled against that ledger; it is never a free-standing mutable balance.
- Audit history is append-only and records actor, action, tenant/branch context, target, timestamp, and redacted before/after details.
- Store only product images in configured private storage; do not persist customer images by default.

## Migration policy
Use Neon-backed, one-statement-at-a-time migrations through the approved Neon MCP workflow; update Drizzle schema after each successful DDL change. Avoid modifying or dropping existing columns/tables until data dependencies and compatibility are reviewed. See `SYSTEM_ARCHITECTURE.md` and `SECURITY.md`.
