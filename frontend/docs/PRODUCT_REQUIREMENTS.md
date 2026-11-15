# MIRROR Product Requirements

## Purpose
MIRROR is a multi-tenant virtual fitting and retail operations platform for fashion brands, branches, and in-store smart-mirror kiosks. It supports customer try-on sessions and the operational workflows needed to manage catalogs, inventory, devices, users, subscriptions, and AI usage. Commercial outcomes must be measured from verified pilot and POS data; the product must not claim unproven sales lift.

## User groups
- **Platform administrators:** onboard and support brands; review applications; manage platform configuration, plans, AI providers, billing, devices, and audit history.
- **Brand administrators:** manage one or more authorized brands, their branches, catalogs, staff, devices, subscriptions, and analytics.
- **Store administrators:** manage only assigned branches, staff, devices, stock, and branch analytics.
- **Store staff:** use a simplified branch-scoped catalog, stock, device, and session view.
- **Customers:** browse a kiosk catalog and begin try-on without a permanent account.
- **Public visitors:** learn about MIRROR and submit demo, partnership, or contact requests.

## Product requirements
### Public experience
- Provide product, how-it-works, features, solutions, hardware, pricing, about, contact, demo, and brand-application content.
- Keep the founder introduction separate from the public product information architecture.
- Clearly label configurable or unannounced pricing; do not invent active prices or customer claims.
- Validate and persist public applications; make review available only to authorized platform staff.

### Retail administration
- Provide role-appropriate dashboards, product catalog, variants, branch availability, inventory, receiving, transfers, devices, employees, notifications, analytics, settings, subscriptions, and audit history.
- Product lifecycle: Draft, Active, Temporarily Blocked, Archived, and Deleted. Blocking and archiving retain images and history; permanent deletion requires authorization and deliberate confirmation.
- Keep catalog definitions separate from branch-level stock. Record stock changes as movements and perform transfers transactionally.
- Track device identity, branch, type, software version, configuration, health, heartbeat, and last activity.
- Treat all dashboard metrics as unavailable until backed by verified data. Distinguish try-on events from purchases.

### Customer kiosk
- Start without account creation; provide explicit camera explanation and consent before capture.
- Support landscape and portrait touchscreen layouts, language choice, catalog browsing, variant selection, try-on result, reset/exit, and optional QR handoff.
- Do not store customer images by default or claim provider deletion without contractual verification. Never log image data.
- Show camera denied/unavailable, network, processing, and provider failure states.

### AI and billing
- Access try-on providers through server-side adapters. Track request, status, latency, provider cost, customer charge, and idempotency key.
- Reserve credits before provider work, reconcile after response, release eligible failures, and keep an append-only ledger.
- Keep provider keys server-side. A lack of credits blocks generation only, not unrelated catalog use.
- Plans and pricing are configurable data; no plan limits or payment state are to be invented as live values.

## Current implementation baseline
- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn components, Drizzle ORM, and a `pg` pool are present.
- Public marketing pages and a public application submission endpoint exist; the endpoint validates same-origin JSON and saves an application plus its first event in one transaction.
- The app has role-labelled administration routes and a camera/kiosk prototype. Admin records, role switching, and most kiosk catalog/try-on data are demonstrations, not authenticated or persistent business workflows.
- Neon contains Managed Better Auth tables and initial public tables for applications, brands, branches, memberships, and audit logs. Application code currently models only applications and application events. Live schema has no RLS policies.
- Authentication, server-side RBAC, tenant isolation, business CRUD, real device monitoring, provider-backed try-on, credit accounting, subscriptions, payments, and verified analytics are not complete.

## Quality attributes
- Enforce authorization and tenant/branch scope on every server read and write.
- Validate untrusted input at the boundary; use parameterized Drizzle queries and transactions for inventory and billing.
- Meet WCAG 2.2 AA goals, keyboard operation, screen-reader labels, accessible contrast, and reduced-motion preferences.
- Support English, Kazakh, Russian, Uzbek, Arabic (RTL), and Turkish without mixing interface languages.
- Keep the initial architecture a modular monolith; add infrastructure only when a measured requirement justifies it.

## Acceptance principle
A capability is complete only when its UI, server contract, persistent data, authorization, validation, failure handling, and automated tests agree. Prototype-only workflows must remain explicitly labelled and must not be presented as production data.
