# Real catalog and Decart fitting

The existing Go API owns catalog CRUD, PostgreSQL transactions, tenant checks, and
Supabase Storage uploads. Next.js uses the same-origin `/api/v1` proxy, forwarding
HttpOnly session cookies. No new database tables or upload service are required.

Local product admin URL: http://localhost:3000/brand/products
Direct Add Product URL: http://localhost:3000/brand/products?create=true
Sign-in URL: http://localhost:3000/login
Catalog URL: http://localhost:3000/mirror

On a deployed installation use its frontend origin with these same paths. This
change does not deploy the application or establish a production hostname.
`/admin` and production `/brand/dashboard` lead to the connected product panel;
other sample dashboard modules remain gated in production.

## Configure and add the first product

1. Follow `SUPABASE_SETUP.md` and `DEPLOYMENT.md`: configure backend `DATABASE_URL`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, JWT secret and frontend origin.
   Run the existing `migrate` and `storage-setup` commands. Configure frontend
   server-only `BACKEND_URL=http://localhost:8080` and start both applications.
   The product editor no longer needs `NEXT_PUBLIC_ENABLE_LIVE_CATALOG`.
2. Sign in with a tenant's `BRAND_ADMIN` account. The bootstrap account is a
   platform administrator; use the existing brand/user provisioning API to set
   up the tenant and its brand administrator if one does not exist. Do not use
   sample dashboard identities as credentials.
3. Open the product admin URL and click **Add product** (or use the direct URL).
4. Enter product name, description, category, price and a unique product SKU.
   Enter each size/color combination in the existing Variants field, for example:

   ```text
   S · Blue · SHIRT-S-BLUE
   M · Blue · SHIRT-M-BLUE
   L · White · SHIRT-L-WHITE
   ```

5. Select a JPEG/PNG product image, maximum 5 MiB and 20 megapixels, and choose
   `Published` for an active catalog product or `Draft` to keep it private.
   Click **Save product**. Images are approved for public catalog storage.
   If storage fails after the product saves, the dialog retains the saved product
   identity so retrying updates that product instead of creating another one.
6. Open `/mirror` while signed in to the same tenant, choose the corresponding
   category, and select **Try On**. Only published products are listed. A product
   with an approved image and active variants is eligible for fitting without
   inventory; purchasing still requires branch stock via the inventory API.

## Decart and test boundary

Keep backend `DECART_ENABLE_REALTIME=false` during testing. The provider key and
Supabase service key remain backend-only. Browsing, uploading, opening Try On,
and fetching the approved reference image do not call Decart. Starting fitting
requires consent and the server feature flag; while disabled it returns 503.
The SDK receives only a short-lived token and uses the selected product's image
bytes as Lucy's initial reference over WebRTC. No FASHN, Three.js, MediaPipe,
or iframe is used by the fitting flow.

Verification uses disposable PostgreSQL databases, mock Supabase HTTP storage,
and mocked Decart HTTP/SDK connections. Live Supabase acceptance and paid Decart
video quality are separate operator checks and were not performed.
