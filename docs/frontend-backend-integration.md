# Frontend audit and integration contract

Routes: `/`, `/[slug]` marketing, `/founder`, `/mirror`, `/login`,
`/forgot-password`, `/reset-password`, `/admin/[section]`,
`/super-admin/[section]`, `/brand/[section]`, `/staff/[section]`, and index redirects.
Actual roles: SUPER_ADMIN, BRAND_ADMIN, STORE_ADMIN, STAFF. Analyst/custom role
selectors are previews, not additional authenticated roles. Never trust a UI role selector.

All endpoints below use `/api/v1`. Error envelope `{error:string}`. Lists are arrays.
Protected endpoints require the Go session. Tenant and branch scope come from the DB.
`id` values are UUIDs. Prices are USD decimal numbers at the boundary, cents in DB.

Validation: editor old price must exceed current; product variants use size/color/SKU
lines. Admin preview branch labels must be resolved to actual IDs before inventory
integration. Catalog categories map Tops→Top Body, Dresses→Full Body,
Accessories→Head; existing mirror categories remain supported.

Production preview consoles remain gated except the opt-in product editor, which
verifies the Go BRAND_ADMIN session on the server;
authentication and API authorization do not make sample dashboards real. Incremental
frontend connections use NEXT_PUBLIC_API_BASE_URL; the live editor is enabled with
NEXT_PUBLIC_ENABLE_LIVE_CATALOG=true. No privileged key or
database connection is used in a client component.
