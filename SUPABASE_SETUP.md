# Supabase setup for MIRROR

The Go API owns authentication, authorization, database access and privileged storage
operations. The browser never receives `DATABASE_URL` or a Supabase service role key.
The frontend remains Next.js; Supabase is the managed PostgreSQL/storage provider.

## 1. Create the project

Create a project in the Supabase dashboard, choose a region near the backend and save
the generated database password in a secret manager. Use a separate project for staging.
No Supabase project was provisioned by this change; project access was not supplied.

## 2. Database connection

Open **Connect** in the project dashboard and copy the PostgreSQL URI. For a persistent
Go container use direct or session-pooler connections when networking supports them.
For transaction pooling use the dashboard's transaction-pooler URI. The Go pgx pool
uses execution mode without prepared statement caching, supporting transaction pooling.
Keep `DB_MAX_CONNS=5` initially and budget total connections across replicas.

Set `sslmode=verify-full` for production. If the project requires a root certificate,
download it through the dashboard, mount it in the container and add
`sslrootcert=/path/to/project-ca.crt` to the URI. URL-encode special password characters.
Run migrations through the direct or session-pooler connection, with a migration owner
account. The runtime URI can use the transaction pooler and a restricted database role.
The `mirror` schema is deliberately separate from Supabase's browser-facing `public`
REST schema. Do not add it to the exposed schemas. No browser role gets schema access.

## 3. Storage buckets

Use a fresh project or inspect existing policies first. In Storage create:

| Bucket | Visibility | Allowed types | Limit |
|---|---|---|---|
| product-images | Public | image/png, image/jpeg | 5 MiB |
| tryon-images | Private | image/png, image/jpeg | 5 MiB |

Alternatively, after migrations and backend environment configuration:

```sh
cd backend
go run ./cmd/api storage-setup
```

This explicit operator command creates the buckets or updates their settings. It does
not create client upload policies. **Do not add INSERT, UPDATE, DELETE or SELECT/list
policies for anon/authenticated clients on these buckets.** Privileged Go operations
use the service role key and bypass RLS. Review broad existing policies too:

```sql
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
```

Any permissive existing policy that admits these buckets must be scoped away or
removed by the project owner. Public product buckets bypass read RLS, so only approved
catalog images belong there. The API rejects uploads without `approved=true`; this is
an explicit approval by a brand/platform administrator, not automated content review.
Unapproved uploads are rejected rather than staged in the public bucket.

The API checks bucket visibility at startup and checks the private bucket again before
customer uploads. Changing project policies/visibility outside the API changes the
security boundary; restrict dashboard access. Never make `tryon-images` public.

Temporary customer uploads require `consent=true`, are owner-scoped, have a 15-minute
expiry and use signed download URLs lasting at most 60 seconds, capped by remaining
retention. Expired metadata is inaccessible immediately. The API worker deletes objects
every minute and retries failed deletions. Physical deletion may be delayed by outages;
expiry is not a guarantee of instantaneous provider deletion. Schedule `api cleanup`
every minute on an always-on worker if the API may scale to zero. Monitor failed jobs
and oldest `run_after` in `mirror.storage_jobs`. Signed URLs are bearer credentials:
do not log or persist them. No camera image is uploaded just by starting the camera.

## 4. Environment

Copy `backend/.env.example` to an ignored local file or configure hosting secrets:

- `DATABASE_URL`: project PostgreSQL URI with TLS verification.
- `SUPABASE_URL`: project HTTPS URL from project settings.
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only service role key from API settings.
- `SUPABASE_PRODUCT_BUCKET=product-images`.
- `SUPABASE_TRYON_BUCKET=tryon-images`.
- `JWT_SECRET`: generate at least 32 random bytes (e.g. `openssl rand -hex 32`).
- `PORT=8080` or the hosting platform's port.
- `FRONTEND_URL`: exact frontend origin, without trailing path, e.g. your HTTPS domain.
- `APP_ENV=production`; `DB_MAX_CONNS=5`.

The API does not automatically load dotenv files. For local shell commands load your
trusted file with `set -a; . ./.env; set +a` from `backend/`. Production uses injected
environment variables. Real `.env` files are ignored by Git and Docker.

Frontend variables: `BACKEND_URL` is a **server-only** backend origin;
`NEXT_PUBLIC_API_BASE_URL=/api/v1` uses the included same-origin proxy. Never add secrets
under `NEXT_PUBLIC_*`. Separate frontend/backend domains should still use this proxy,
so cookies remain first-party. For local product editor testing set
`NEXT_PUBLIC_ENABLE_LIVE_CATALOG=true` before building/starting Next.js and sign in as BRAND_ADMIN.
The production catalog page verifies the Go session on the server. Other preview
consoles retain their production gate until their modules are real.

## 5. Migrate and provision the first account

Requires the installed Go version (implementation tested with Go 1.26):

```sh
cd backend
go mod download
go run ./cmd/api migrate
go run ./cmd/api storage-setup
# Set BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD via your secret manager/shell.
go run ./cmd/api bootstrap
go run ./cmd/api
```

Bootstrap creates one super admin; it never overwrites an existing account. Remove the
bootstrap variables after use. Migrations are transactional and tracked in
`public.mirror_schema_migrations` with an advisory lock; repeated runs skip applied files.
Do not edit applied migrations. Apply new numbered SQL files. Back up before schema
changes; restore or write a forward correction instead of destructive automatic downs.

Log in, then as SUPER_ADMIN create a brand (`POST /api/v1/brands`), create its branch
(`POST /branches?tenantId=...`), and create BRAND_ADMIN / branch STAFF accounts
(`POST /users?tenantId=...`). New brands receive the configurable Starter plan and a
one-month manual evaluation period. Renewals/payments are not automatic. A platform
operator must extend `expires_at` after a real entitlement decision until billing is built.

## 6. Test uploads

Use a staging project and a brand administrator session. Set `API` to the backend origin,
`FRONTEND_ORIGIN` to its configured frontend origin, and `PRODUCT_ID` to an actual product
UUID. Prepare an ignored `login.json` with that user's email/password. Do not commit it.

```sh
curl --fail-with-body -c /tmp/mirror.cookies -H "Origin: $FRONTEND_ORIGIN" \
  -H 'Content-Type: application/json' --data-binary @login.json "$API/api/v1/auth/login"
curl --fail-with-body -b /tmp/mirror.cookies -H "Origin: $FRONTEND_ORIGIN" \
  -F 'file=@catalog.png;type=image/png' -F approved=true \
  "$API/api/v1/products/$PRODUCT_ID/images"
# Set IMAGE_ID to the returned id.
curl --fail-with-body -b /tmp/mirror.cookies "$API/api/v1/images/$IMAGE_ID"
curl --fail-with-body -b /tmp/mirror.cookies "$API/api/v1/products?category=Top%20Body"
curl --fail-with-body -b /tmp/mirror.cookies -X DELETE \
  -H "Origin: $FRONTEND_ORIGIN" "$API/api/v1/images/$IMAGE_ID"
```

Check the returned public product URL before deletion and verify it no longer serves
the object afterward (allow for edge caches). Confirm the matching metadata row via SQL.
Try the upload without cookies (401), as STAFF (403), with an SVG/text renamed PNG
(400), or without approval (400). PUT `/images/{id}` uses the same multipart fields and
returns a **new image ID**, with old-object deletion queued for the worker.

For a consented private test, POST multipart `file` + `consent=true` to `/tryon-images`.
No public URL is returned. POST `/images/{id}/signed-url` as the owner and verify the
signed URL works briefly. Construct `/storage/v1/object/public/tryon-images/{objectPath}`
and verify it cannot retrieve the image anonymously. After expiry and cleanup, check
that storage and metadata are removed. Only use consented test photos.

`go test ./...` runs local unit tests. Set `TEST_DATABASE_URL` to a disposable local
PostgreSQL **admin** URI and run `go test -race ./... -count=1` for DB integration tests;
the suite creates and removes its own random test database. Never grant CREATEDB to the
production runtime role. `TestPostgresAPI` uses a local storage test server; it is not
a live Supabase acceptance test. The opt-in `TestLiveSupabaseStorage` checks real bucket
visibility, upload, anonymous public/private reads, signing and deletion when explicit
staging credentials are supplied (see its environment requirements in test source).

## 7. Deploy

Follow [DEPLOYMENT.md](DEPLOYMENT.md). No live Supabase connectivity or deployment is
claimed without project credentials, successful staging checks and public health checks.

References: [database connections](https://supabase.com/docs/guides/database/connecting-to-postgres),
[storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[storage access control](https://supabase.com/docs/guides/storage/security/access-control).
