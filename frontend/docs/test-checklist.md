# Test checklist

## Public website

- [x] Homepage renders at `/` with Uzbek metadata and links to the virtual fitting room.
- [x] Mobile layout checked at 603 × 809 in dark system mode; the site remains intentionally light.
- [x] Desktop layout checked at 1440 × 1000.
- [x] Mobile navigation opens and exposes the route links.
- [x] Demo form labels, required fields, consent control, and status messaging are present.
- [x] `/request-demo`, `/contact`, `/partnerships`, and the public information pages use the shared responsive shell.

## Public application API

- [x] Same-origin honeypot request returns `202` without a database write.
- [x] Invalid request body returns `400` without a database write.
- [x] Neon connectivity verified with a read-only `SELECT 1` query.
- [ ] Submit a valid marked test request on a non-production Neon branch and verify the matching `applications` and `application_events` rows.

A real submission was not used for browser testing so the database would not receive fabricated lead data.

## Remaining production gates

- [ ] Finish server-side authentication and role/brand/branch authorization.
- [ ] Replace preview-only admin records with tenant-scoped database CRUD and append-only audit writes.
- [ ] Run end-to-end role-isolation and product lifecycle tests after the protected API exists.
- [ ] Test camera permission, denied/unavailable states, portrait/landscape kiosk layouts, and AI credit gating.

The admin UI is currently a non-persistent preview. It must not be treated as authenticated or production-ready.
