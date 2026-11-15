# MIRROR API Specification

## Conventions
- App APIs use JSON and consistent envelopes: success `{ "data": ..., "meta": ... }`; error `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
- Use `application/json`, validate request bodies with Zod, cap body size, return generic client-safe errors, and never log credentials or images.
- Authenticated endpoints derive the actor/session on the server. A frontend-supplied role, user ID, brand ID, or branch ID is never authorization.
- Lists use bounded `limit`/`cursor` pagination and allowlisted filters/sort fields. Mutations use transactions where state spans rows; repeatable POST mutations accept an idempotency key.
- Route handlers return 401 when unauthenticated, 403 when permission/scope is insufficient, 404 for a resource not available in the caller's scope, 400 for invalid input, and 429 when rate limited.

## Implemented endpoint
### `POST /api/applications`
Public, same-origin JSON submission for DEMO, PARTNERSHIP, and CONTACT. Validates payload and consent, limits input size, handles a honeypot without disclosing detection, and inserts `applications` plus its initial `application_events` entry in one transaction. Returns 201 on saved request; currently uses `{ ok: true }` and does not expose the application ID. This existing response contract should be preserved until clients are migrated deliberately.

## Planned endpoints
All routes below are target contracts, not claims of current implementation.

### Auth and identity
- `GET /api/v1/auth/me` — current session plus server-resolved memberships and permitted workspace choices.
- Neon Managed Better Auth owns sign-in, sign-up, password reset, verification, and sign-out endpoints through its catch-all handler.

### Applications (SUPER_ADMIN)
- `GET /api/v1/applications?status=&type=&q=&cursor=&limit=` — list applications visible to platform administrators.
- `GET /api/v1/applications/{id}` — details and append-only event history.
- `PATCH /api/v1/applications/{id}` — validated status/assignee/review-note transition; creates an event and audit entry in the same transaction.

### Tenant administration
- `/api/v1/brands`, `/api/v1/branches`, `/api/v1/memberships`, `/api/v1/devices`: role-gated CRUD and status actions, with brand/branch scope enforced on the server.
- `/api/v1/products`, `/api/v1/products/{id}/status`, `/api/v1/products/{id}/history`: catalog CRUD, lifecycle operations, variants, images, and change history.
- `/api/v1/inventory`, `/api/v1/inventory/receipts`, `/api/v1/inventory/transfers`: branch-scoped stock operations with transactional movement records.

### Customer and AI
- `GET /api/v1/kiosk/catalog?branchId=&category=` — public or device-authorized active catalog filtered to the configured branch.
- `POST /api/v1/tryon/sessions` — create a temporary, non-account customer session.
- `POST /api/v1/tryon/requests` — validate consent/product, reserve credits, call configured provider server-side, and reconcile or release credits idempotently.

### Platform operations
- `/api/v1/subscription-plans`, `/api/v1/subscriptions`, `/api/v1/billing`, `/api/v1/credits`, `/api/v1/analytics`, `/api/v1/notifications`, `/api/v1/audit`, and `/api/v1/integrations` are planned. Financial data is not shown until backed by an actual billing source; analytics must separate try-on events from POS purchases.

## Security requirements
- Authenticate and authorize each protected request in the server data path; do not rely on page middleware alone.
- Every tenant query filters against an authorized membership and requested branch scope, in the same query or transaction as the operation.
- Apply input limits, safe ordering, bounded pagination, origin/CSRF protections for state-changing browser requests, rate limiting for public and AI operations, and request IDs.
- Store secrets in Vercel environment variables or provider-managed credentials, never database plaintext or browser bundles.
- See `ROLE_PERMISSION_MATRIX.md` and `SECURITY.md`.
