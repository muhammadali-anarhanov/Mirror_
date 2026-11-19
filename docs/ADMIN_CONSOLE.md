# MIRROR admin consoles

The Super Admin, Brand Admin and Store/Staff consoles read and write live data through the Go API. The former sample-data prototype (`components/admin/admin-*`, `lib/admin/demo-data.ts`) has been removed.

| Console | Path | Role | Sections |
|---|---|---|---|
| Super Admin | `/super-admin/*` | `SUPER_ADMIN` | Statistics, Applications, Brands (plan, payment +30 days, extra try-ons, branches, accounts), Subscriptions, Audit logs, Account |
| Brand | `/brand/*` | `BRAND_ADMIN` | Statistics, Products, Inventory, Orders, Branches, Smart mirrors, Staff, Subscription, Notifications, Audit logs, Account |
| Store | `/staff/*` | `STORE_ADMIN`, `STAFF` | Statistics, Products (read only), Inventory (store admins adjust), Orders, Smart mirrors, Notifications, Account |

Sign-in sends every role to its own console. The server route and the client both check the role, and the API enforces every call.

## Adding products quickly

- **Scan to add or find.** Products and Inventory have a scan bar. A USB or Bluetooth scanner types into it. "Scan with camera" uses the browser `BarcodeDetector` (Android, ChromeOS, macOS). Elsewhere it loads ZXing from jsDelivr on demand.
- In Products, an unknown code opens a new product with the barcode filled in. A known product, variant barcode or SKU opens that product.
- The editor covers name, price, old price, status, category, barcode, SKU (generated from the name), sizes and colors (variants are generated automatically), a photo from the camera or a file, and initial stock per branch.
- Phone photos are scaled to fit the 5 MB JPEG/PNG upload limit.
- In Inventory, a scanned variant SKU or barcode opens Receive / Write off. Brand admins can also transfer stock between branches.

## Sales and statistics

- The kiosk "Send to cashier" creates an order.
- Orders can be marked **Sold**, which takes the items out of that branch's stock, or **Cancelled**. Undoing a sale puts the stock back.
- Each AI fitting start is recorded as an `audit_logs` row (`fitting.start`). Statistics (`GET /analytics?days=7|30|90`, `GET /platform/stats`) count these rows. No database migration is required.
- Smart mirrors report online every minute when the kiosk is opened from the device's link, `/mirror?device=<id>`.
- Brand admins running a kiosk choose the branch in the cart.

## New API endpoints

`POST /auth/password`, `GET /platform/stats`, `PATCH /branches/{id}`, `POST /devices/{id}/heartbeat`, `POST /users/{id}/password`, `PATCH /orders/{id}`. Changed endpoints:

- `PUT /subscription` also accepts `extendDays`.
- `/cart` and `/orders/checkout` accept `branchId` for brand-level accounts.
- `/decart/token` accepts `productId`.

## Decart clock fix

The Decart SDK checks the client token expiry against the device clock before it dials. A kiosk whose clock runs fast therefore failed with `TOKEN_EXPIRED` about 5 seconds after the camera started. The fitting session now estimates the server time and presents it to the SDK for that check only (`clockSkew`, `useServerClockBriefly` in `lib/decart-fitting.ts`). Keeping automatic time enabled on kiosk computers is still recommended.

## Local end-to-end check

1. Run Postgres.
2. Run the API with `SUPABASE_URL` pointing to an HTTPS storage stand-in.
3. Run `next dev` with `BACKEND_URL`.
4. With Playwright, run this flow: application → approve → brand admin sign-in → scan-add product with photo → receive stock → register mirror → kiosk cart → cashier → mark sold → statistics.

Go integration tests: `TEST_DATABASE_URL=postgres://… go test ./...`.
