# Frontend audit and integration contract

Audit: 2026-11-15. Existing source preserved. Next.js 16 / React 19 / TypeScript,
Tailwind, Base UI, SWR, Recharts, Framer Motion, Zod, MediaPipe. No frontend test
script exists. Existing PostgreSQL/Drizzle route only implements public applications.
There is no configured AI or payment provider. Historical Neon/Better Auth references
in frontend docs are proposals, superseded by the Go JWT/Supabase architecture.

Routes: `/`, `/[slug]` marketing, `/founder`, `/mirror`, `/login`,
`/forgot-password`, `/reset-password`, `/admin/[section]`,
`/super-admin/[section]`, `/brand/[section]`, `/staff/[section]`, and index redirects.
Actual roles: SUPER_ADMIN, BRAND_ADMIN, STORE_ADMIN, STAFF. Analyst/custom role
selectors are previews, not additional authenticated roles. Never trust a UI role selector.

All endpoints below use `/api/v1`. Error envelope `{error:string}`. Lists are arrays.
Protected endpoints require the Go session. Tenant and branch scope come from the DB.
`id` values are UUIDs. Prices are USD decimal numbers at the boundary, cents in DB.

| Page/component | Method and endpoint | Request | Response | Role | Tables | Status / boundary |
|---|---|---|---|---|---|---|
| AuthPage login | POST /auth/login | {email,password} | {user}, HttpOnly session cookies | public | users,sessions | Implemented; recovery needs mail provider |
| Admin shell | POST /auth/refresh; POST /auth/logout; GET /auth/me | none | {user}/ {ok} | session | users,sessions | Rotating hashed refresh tokens; logout revokes session |
| Users/staff | GET,POST /users; PATCH /users/{id} | {email,password,role,branchId,status} | user/list | brand/platform admin | users,branches | Backend; preview rows retained where unconnected |
| Brands | GET,POST /brands | {name} | brand/list | super admin | tenants,subscriptions | Backend |
| Branches/stores | GET,POST /branches | {name,address} | branch/list | brand admin | branches,subscriptions,plans | Backend; limit enforced |
| Products / mirror category | GET /products?category=Top%20Body | none | [{id,name,price,originalPrice,image,variants:[{id,size,color,inStock}]}] | session | products,variants,inventory,images | Exact existing mirror response; demo fallback preserved |
| Product editor | POST /products; PUT /products/{id} | {name,description,category,price,originalPrice,sku,barcode,status,variants:[{id?,size,color,sku,barcode}]} | product | brand admin | products,variants | Backend and editor adapter |
| Product removal | DELETE /products/{id} | none | {ok} | brand admin | products,images,storage_jobs | Backend |
| Image editor | POST /products/{id}/images; PUT /images/{id} | multipart file, approved=true | image metadata | brand admin | images,storage_jobs | Only explicitly approved images enter public bucket |
| Image metadata / deletion | GET,DELETE /images/{id}; POST /images/{id}/signed-url | none | metadata / {url,expiresIn} / {ok} | own tenant; writes brand admin | images | Backend; try-on URLs max 60s and capped by retention |
| Inventory | GET /inventory; POST /inventory/adjust | {variantId,branchId,delta} | list / {ok} | brand/store admin | inventory,variants,branches,audit_logs | Backend; branch scope enforced |
| Stock receiving/barcode | POST /inventory/adjust | same, positive delta | {ok} | brand/store admin | inventory,audit_logs | UI preview retained pending barcode workflow |
| Stock transfer | POST /inventory/transfers | {variantId,fromBranchId,toBranchId,qty} | {ok} | brand admin | inventory,audit_logs | Backend; transaction; UI preview retained |
| Smart Mirrors | GET,POST /devices | {name,branchId,configuration} | device/list | brand admin; scoped read | devices,plans | Backend; telemetry not fabricated |
| Mirror camera | browser getUserMedia + MediaPipe | local frames | local canvas | browser consent | none | Preserved; no streaming to backend |
| Mirror AI action | POST /try-on | multipart user_image,product_id,variant_id,consent=true; Idempotency-Key | {result_image_url} or 503 | branch session | tryon_sessions,ai_usage,credit_ledger | No provider configured: fails before storing image or charging; no invented provider API |
| Temporary images | POST /tryon-images | multipart file,consent=true | metadata | session | images,storage_jobs | Private, 15 minute retention, automatic deletion retries |
| Mirror cart | POST /cart | {productId,variantId,qty} | {ok} | branch session | carts | Backend; existing local quantity editing preserved |
| Send to cashier | POST /orders/checkout | {items:[{productId,variantId,qty}]} | {id,status} | branch session | orders,order_items,inventory | Records a cashier request, not a purchase/payment |
| Cashier PendingOrders | GET /orders | none | list | branch session | orders,order_items | Backend; preview UI retained |
| Subscription | GET /plans; GET,PUT /subscription | {planId} for plan change | plan/list or subscription | brand admin | plans,subscriptions,credit_ledger | Proposed prices seeded; no payment processing |
| Additional credits | POST /credits | {amount,reference} | {ok} | super admin, explicit tenant | subscriptions,credit_ledger | Manual allocation only, unique reference |
| Analytics/charts | GET /analytics | none | actual activity counts | scoped session | tryon_sessions,orders,branches,devices | Backend; existing demo charts explicitly remain previews |
| Notifications | GET /notifications; PATCH /notifications/{id} | {read:true} | list / {ok} | scoped session | notifications | Backend; preview UI retained |
| Audit history | GET /audit-logs | none | list | brand/platform admin | audit_logs | Backend |
| ApplicationForm / PortfolioContact | POST /applications (existing /api/applications proxy) | existing applicationSubmissionSchema fields,consent,fax | {ok:true} | public | applications,application_events | Go persistence; existing form design preserved |
| Platform campaigns/settings/integrations | proposed /campaigns,/settings,/integrations | existing form fields | TBD | admin | not yet created | Preview only; no POS, webhooks or campaigns claimed live |
| Languages | local dictionaries | UZ,EN,RU,KZ,AR,TR mirror; admin dictionaries | local UI | all | none | Preserved incl. RTL and portrait/landscape |

Validation: editor old price must exceed current; product variants use size/color/SKU
lines. Admin preview branch labels must be resolved to actual IDs before inventory
integration. Catalog categories map Tops→Top Body, Dresses→Full Body,
Accessories→Head; existing mirror categories remain supported.

Production preview consoles remain gated except the opt-in product editor, which
verifies the Go BRAND_ADMIN session on the server;
authentication and API authorization do not make sample dashboards real. Incremental
frontend connections use NEXT_PUBLIC_API_BASE_URL; the live editor is enabled with
NEXT_PUBLIC_ENABLE_LIVE_CATALOG=true. No privileged key or
database connection is used in a client component.
