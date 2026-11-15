# MIRROR Security

## Current posture
- Neon Managed Better Auth is provisioned with email/password and a managed auth schema. The repository has not yet integrated server-side sessions into protected pages or APIs.
- Public application submission enforces same-origin JSON, validates fields and consent, limits request size, uses a honeypot, and writes application plus event transactionally.
- The current admin UI is a frontend-only role simulation. It must not be treated as an access-control system or exposed as production administration.
- Live public Neon tables report RLS disabled and no policies. Application-level authorization and tenant-scoped queries are therefore required.
- `next.config.mjs` sets `nosniff`, strict referrer policy, HSTS, same-origin framing, and a camera-only self permissions policy. No CSP is configured.

## Required controls
### Authentication and sessions
- Integrate the provisioned Neon Managed Better Auth Next.js server and client SDK. Keep auth secrets server-only and out of logs, client bundles, docs, and Git.
- Require secure, HTTP-only, same-site-appropriate session cookies and only trust exact preview/deployment origins. Keep CSRF/origin protections enabled.
- Rate-limit sign-in, password recovery, public applications, and expensive AI endpoints. Return generic auth failures that do not reveal whether an email exists.
- Enforce session and membership state on the server for every page loader, API, and mutation; middleware is an early redirect, not the sole authorization check.

### Tenant authorization
- Never trust client-supplied role, actor, brand, branch, or permission claims. Resolve active membership from trusted server-side identity.
- Scope every tenant query by the allowed brand and, where relevant, exact assigned branch. Test cross-tenant and cross-branch ID substitution.
- Restrict role grants to least privilege; prevent brand/branch administrators from granting platform access.
- Audit approvals, role changes, suspension/reactivation, price updates, inventory moves, credit changes, and billing actions.

### Data protection
- Validate and normalize all external input; use parameterized Drizzle query builders. Use transactions for coupled state changes.
- Do not place passwords, session/access tokens, provider keys, payment secrets, or customer photos in logs or database JSON details.
- Do not persist customer camera images by default. If temporary processing requires storage, define short TTL, access controls, deletion, and provider retention terms before launch.
- Keep product media private by default and use authorization-aware, expiring access URLs.
- Keep audit and credit ledgers append-only to ordinary application roles; redact sensitive before/after values.
- Define backup, restore, retention, account deletion, and incident-response procedures before production.

### Browser and deployment
- Retain secure response headers; `X-Frame-Options: SAMEORIGIN` is appropriate for authenticated administration, but must be reconsidered if the deployed public marketing site is intentionally embedded cross-origin.
- Keep the permissions policy limited to camera access required by the kiosk.
- Add a report-only CSP after enumerating required image/style/script/connect origins; enforce only after reviewing reports and preserving Next.js preview compatibility.
- Use separate development, preview, and production credentials. Never commit `.env` files.

## Verification gates
- Sign in/out, reload, and protected-route behavior; cookie attributes and trusted-origin rejection.
- 401/403 behavior for each API and direct URL.
- Automated cross-brand and cross-branch isolation tests.
- CSRF/origin, input validation, rate-limit, idempotency, and audit-event tests.
- Camera consent and privacy lifecycle tests; verify no photos or secrets appear in logs.
- Dependency, static analysis, and deployment checks appropriate to the changed feature.
