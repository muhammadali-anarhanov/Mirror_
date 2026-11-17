# MIRROR restoration and functional verification

## Status

## Rollback point and history

Before changing the project, a pre-task snapshot was saved at `/tmp/mirror-restoration-rollback`:

- `HEAD`: the original checked-out commit.
- `tracked.patch`: the original uncommitted tracked changes, including binary changes.
- `untracked.tar.gz`: original untracked source and assets.

Ignored files, credentials and databases were excluded. The snapshot can reconstruct the pre-task source in a separate review directory using the recorded commit plus patch and archive. No Git reset, database reset, push or deployment was performed.

History contains `53c85b3` (initial frontend), `b8e1817` (Go/Supabase integration) and `ea21091` (current original HEAD). The initial design has a full-screen camera, floating side product previews, original navigation/toolbars and a centered floating bottom product card. Subsequent CSS overrides reserved a fixed right column, shrank the fitting stage and later applied those insets to the AR camera viewport.

## Priority 1 — restored Smart Mirror

The right-column overrides were removed. The original product card and side previews remain; product details, size/color controls and cart actions float over the camera. The AI photo controls are collapsed inside the card. Live AR remains accessible through a compact overlay. Performance counters, prepared GLB loading and technical diagnostics are in a separate collapsible developer panel.

Camera and 3D canvas share the full viewport. The tracker reads the actual video crop, object position and mirroring, so restoring `object-fit: cover` does not introduce a separate coordinate space. Selecting products, switching 3D colors, loading a compatible GLB and showing an AI result do not replace or stop the camera stream.

Responsive checks cover 1440×1000, 768×1024, 390×844 and 844×390. Small-screen badge, toolbar and thumbnail spacing was corrected after screenshot inspection. Expanded option panels use the same native details group, and long controls scroll within bounded overlays.

The original backend, authentication guards and catalog/cart contracts were preserved. Production admin pages still fail closed when the authenticated live catalog is not configured.

The real workflow remains:

1. An authenticated branch session selects a real published, in-stock product/variant with an approved image.
2. The user captures a camera frame for preview or uploads a JPEG/PNG.
3. An explicit paid-processing consent precedes submission. The frontend sends the photo, product/variant IDs and a unique request key. The backend derives the garment image URL from the tenant's approved catalog image; it does not trust a browser-supplied garment URL.
4. The backend reserves the existing tenant subscription credit and submits once. The frontend polls the persisted job, renders the returned result URL, and shows failures without inventing an image or progress percentage.
5. AR and the live camera keep running while the still result appears in a separate preview. The still image is never described as continuous video generation.

Repairs include explicit camera capture/preview, visible results independent of AR, readable provider failure messages, and disabling auth-refresh resubmission for the paid POST. Ordinary catalog requests retain session-refresh behavior.

A missing backend URL now returns `submitted: false`; the browser releases its request key after that definite pre-submission rejection. Network failures and ambiguous accepted submissions still retain recovery keys to prevent accidental duplicate charges. Successful/terminal jobs release the active key. There is no one-generation lifetime application limit: repeated successful mocked jobs and a new request after a disabled-backend rejection were verified. Existing subscription/credit accounting is unchanged.

### Configuration check

The secret-redacting CLI reports:

### Mock verification

Go race tests and vet passed. Integration tests used a fresh PostgreSQL cluster under `/tmp` on port 55439, fixture provider credentials and local HTTP storage mocks. Tests created and removed only their own randomly named databases. The temporary cluster was stopped afterward.

## Priority 3 — shared translations

Marketing, mirror, authentication, admin and founder interfaces now use one language preference with EN, UZ, RU, KK, AR and TR. Root rendering reads a validated `mirror_language` cookie and passes the same initial value to the client provider, preventing an Uzbek server render paired with an English selector. A fresh visitor defaults to English; existing valid preferences are retained.

Selectors update the shared state immediately and persist it for navigation and refresh. Legacy admin `?lang=` links are migrated only when there is no saved preference, so a stale query parameter cannot override a newly selected language. Arabic sets root and console RTL direction. The founder page also has Arabic and Turkish copy.

UI phrase IDs and migration aliases live in `frontend/lib/translations/ui.ts`; other domain dictionaries remain typed. Missing messages fall back to English. Public marketing article/lead content now has English source text and translated lookup values. Form labels, placeholders, native validation messages, buttons, notifications, AR/AI controls, table labels and chart labels use localized copy. System notification interpolation preserves embedded branch/product content.

Merchant product names are deliberately excluded from UI lookup. They remain unchanged unless the product supplies an explicit `nameTranslations` entry; translated demo product names remain demo-only. Product IDs, enum values, SKUs, URLs and request payloads are not localized.

### Route coverage

All rows below have EN/UZ/RU/KK/AR/TR copy and the shared preference. Unknown technical/backend messages retain the English fallback.

| Routes | Browser evidence |
| --- | --- |
| `/` | Fresh EN, UZ route content, all six switches and persistence |
| `/mirror` | EN/UZ UI, translated AR/AI controls, responsive camera, product navigation/cart and mocked generation |
| `/login`, `/forgot-password`, `/reset-password` | EN/UZ headings/forms; same six-locale provider and typed messages |
| `/how-it-works`, `/features`, `/for-brands`, `/pricing`, `/faq` | EN/UZ route checks; all six feature-page checks and dictionary coverage |
| `/request-demo`, `/contact`, `/partnerships` | EN/UZ routes and form copy; all six messages |
| `/privacy-security`, `/about` | EN/UZ route content and complete six-locale article lookup |
| `/founder` | EN/UZ routes plus headline/selector checks for all six locales |
| `/brand/{dashboard,products,stock-receiving,inventory,transfers,branches,devices,staff,analytics,subscription,notifications,integrations,settings}` | All 13 preview components × six languages; production redirects remain protected |
| `/super-admin/{dashboard,brands,applications,branches,campaigns,subscriptions,notifications,audit-logs,settings}` | All nine preview components × six languages; production redirects remain protected |
| `/staff/{dashboard,products,stock-receiving,inventory,devices,analytics}` | All six preview components × six languages; production redirects remain protected |
| `/admin/dashboard`, `/admin/products` | Both preview components × six languages; production redirects remain protected |
| Cart and try-on | Merchant names preserved; mocked capture/upload, repeat completion, failure and disabled-backend handling |

## Checks and browser acceptance

The broad development-server route crawl exited partway through without a page exception. It was not counted as a successful full route audit. Public/auth-redirect acceptance was completed against the production build; all admin preview components were separately verified in the browser harness. The development-server interruption's underlying cause was not established.

Final responsive overlap assertions: **passed** at all four viewport sizes. Independent toolbar, navigation, badge, AR/developer controls, product previews and product card hit areas do not overlap. Each carousel arrow/image pair is treated as one composite control, matching the original design.

Sanitized browser evidence is saved in [verification/production-results.json](verification/production-results.json) and [verification/admin-results.json](verification/admin-results.json). Screenshots: [desktop](verification/mirror-desktop.png), [tablet](verification/mirror-tablet.png), [phone](verification/mirror-phone.png), [landscape](verification/mirror-landscape.png). The green background is Chrome synthetic camera input, not a person, generated try-on result or physical webcam verification.

The isolated renderer measured approximately **28.5 FPS** over 120 synthetic frames under concurrent test load (2,304 triangles, four draw calls). This is a test-environment measurement, not a desktop hardware guarantee or motion-to-display latency measurement.

### Reproduce

```sh
cd frontend
npm test
npm run build -- --webpack
npm install --prefix /tmp/mirror-test-tools playwright esbuild
MIRROR_TEST_TOOLS=/tmp/mirror-test-tools node --experimental-strip-types tests/browser-admin.mjs
MIRROR_START_SERVER=1 MIRROR_SERVER_MODE=production MIRROR_TEST_TOOLS=/tmp/mirror-test-tools node --experimental-strip-types tests/browser-restoration.mjs
MIRROR_TEST_TOOLS=/tmp/mirror-test-tools node tests/browser-fitting.mjs
```

`browser-camera.mjs` needs a separately running local server and accepts `MIRROR_TEST_URL`. Set `CHROME_PATH` when Chrome is installed elsewhere. Browser suites use synthetic camera input and fixture/mock responses; they are not live-service tests.

## Remaining blockers and authorized next acceptance

After configuration and approval, acceptance should use the selected real catalog product and a consented person photo, verify one actual result, then explicitly submit a second job to prove repeat use. No failed paid submission should be automatically retried. Physical webcam fitting and true motion-to-display latency also remain outside what the synthetic tests establish.
