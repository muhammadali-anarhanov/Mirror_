# Decart-only fitting change

Removed the former still-image provider client, request/status/upload endpoints, polling worker, configuration variables, Compose settings, translated fitting controls and provider-specific tests. Removed the local Three.js renderer, MediaPipe camera/pose/segmentation components, model files, sample 3D garments, dependency declarations and lock entries. The catalog no longer mounts any camera, renderer or external iframe. Old provider names no longer occur in runtime source or configuration.

Decart Lucy V-TON is the sole provider. Catalog Try On navigates to the top-level `/mirror/try-on?productId=…` route. The existing authenticated Go garment endpoint resolves approved Supabase catalog bytes. The SDK submits these bytes and assigns its remote WebRTC stream to the fullscreen-capable video element. Stop and navigation stop both local and remote tracks. Consent, explicit Start, server opt-in, safe errors, no retries and the 60-second limit remain enforced. All local dotenv variants retain paid realtime disabled. Permanent provider keys remain on the backend.

Existing SQL migration contents, filenames and ledger entries are unchanged, including the historical provider-named migration. The startup check now discovers the latest embedded migration. No schema was dropped or rewritten. Historical private images can still expire through generic storage cleanup, with no prediction polling. Authentication, PostgreSQL, Supabase Storage, product/admin routes and cart/order operations remain available.

Non-billable checks passed:

- `go test ./...` and `go vet ./...`.
- Full backend suite using a disposable local PostgreSQL cluster, including migration replay, auth, catalog, cart, storage, disabled Decart requests, removal of old routes, legacy private-image cleanup and authenticated garment-image bytes. The test database server was stopped afterward.
- `npm test` and standalone TypeScript checking.
- Browser regression with fixture SDK, synthetic camera and external traffic blocked: catalog-to-fitting navigation, correct image decoding and byte submission, consent gating, fullscreen entry/exit, remote-video assignment, track cleanup, token failure and shopping-cart preservation.
- Admin render smoke test: 30 English dashboard/section cases with no page errors, using the existing harness and blocked external traffic. CSS screenshots were not checked because a production CSS build was unavailable.
- Whitespace check, unchanged migration diff, and dependency-specifier consistency check.

Production build remains unverified: Next.js fails parsing TypeScript `--showConfig` output in this environment; standalone TypeScript succeeds. Earlier Turbopack attempts also failed opening a local worker port.

Real-world acceptance still requires explicit paid-session approval: Decart model/account access, actual generated video and garment fidelity, physical camera permission prompts, mobile fullscreen behavior and provider network failure behavior. No live provider session, commit, push or deployment was performed.
