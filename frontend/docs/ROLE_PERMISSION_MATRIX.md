# MIRROR Role and Permission Matrix

This matrix describes the intended server-enforced policy. It does not imply that the current preview UI enforces these permissions.

| Capability | Super Admin | Brand Admin | Store Admin | Staff |
|---|---|---|---|---|
| Platform overview, global settings, provider configuration | Allow with explicit platform permission | Deny | Deny | Deny |
| Review/approve/reject brand applications | Allow; all decisions audited | Deny | Deny | Deny |
| View/update/suspend brands | Allow with explicit permission and reason for suspension | Own brand only, limited profile fields | Deny | Deny |
| Manage branches | Platform-wide | Own brand | Assigned branch only; no cross-branch access | Deny unless explicitly delegated |
| Manage catalog/products/variants | Platform support permission | Own brand | Assigned branch availability only | Read catalog; additional rights configurable |
| Adjust inventory, receive stock, transfer | Platform support permission | Own brand branches | Assigned branch; transfers only when separately permitted | Configurable branch-scoped stock rights |
| Manage devices | Platform-wide | Own brand devices | Assigned branch devices | View assigned branch devices only |
| Manage users and roles | Platform admins only | Own brand memberships, no platform role grants | Assigned branch staff only, cannot grant broader scope | Deny |
| View analytics | Platform aggregate and tenant operational data | Own brand and branches | Assigned branch only | Operational activity only when granted |
| Subscription/billing | Platform-level | Own brand subscription and invoices | Deny | Deny |
| AI credits and usage | Global operations | Own brand balance/usage | Branch usage only | No financial controls |
| Audit history | Global, permission-gated | Own brand | Assigned branch records only | No access unless delegated |
| Permanently delete data | Explicit platform permission + confirmation | Explicit permission + deliberate confirmation | Deny by default | Deny |

## Scope rules
- Resolve user identity from the Neon Managed Better Auth server session and membership from `public.app_memberships`.
- SUPER_ADMIN is platform-scoped and must still pass explicit permission checks for sensitive platform actions.
- BRAND_ADMIN requires an active membership with a non-null authorized brand and no branch scope.
- STORE_ADMIN and STAFF require an active membership with both brand and branch scope. A branch role cannot request another branch by changing an ID.
- The current membership table permits one membership per auth user. Multi-brand/multi-branch assignments require a schema migration before that capability is enabled.
- The optional `permissions` array can further restrict a role; it must never elevate a role beyond its maximum scope.
- Suspension blocks access while preserving the user's and tenant's data. Privilege changes and sensitive actions are audited.

## Enforcement
Use server-side guards in every Route Handler, Server Action, and data loader. UI navigation hiding is a convenience only. Return 401 for no active session, 403 for a signed-in user lacking the capability, and avoid leaking out-of-scope record existence.
