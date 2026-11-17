# MIRROR API

Go modular monolith, PostgreSQL, JWT/bcrypt and backend-only Supabase Storage.

Read [Supabase setup](../SUPABASE_SETUP.md), [deployment](../DEPLOYMENT.md),
[frontend contracts](../docs/frontend-backend-integration.md), and
[verification / remaining work](../docs/implementation-status.md).
The REST contract is [OpenAPI](docs/openapi.json).

```sh
go mod download
# Inject backend/.env.example values using your environment or secret manager.
go run ./cmd/api migrate
go run ./cmd/api storage-setup
go run ./cmd/api bootstrap
go run ./cmd/api
```

`storage-setup` needs Supabase credentials. `bootstrap` needs BOOTSTRAP_EMAIL and
BOOTSTRAP_PASSWORD. Neither has defaults. Commands are explicit operator actions.

```sh
go test ./...
go vet ./...
# With a disposable local PostgreSQL admin URI:
TEST_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" go test -race ./... -count=1
```

Tests create random isolated databases and remove only those databases. The storage
test server in the API suite is a local contract simulation. Live staging storage
tests require MIRROR_LIVE_SUPABASE_TEST=1 and real Supabase environment values;
they skip by default. No deployment or live project acceptance is implied by unit tests.

## Decart Lucy realtime fitting

Decart Lucy V-TON is the sole fitting provider. See [realtime fitting](../docs/DECART_REALTIME.md). `go run ./cmd/api check-decart-config` checks configuration without provider requests. `DECART_ENABLE_REALTIME` defaults to false; keep it disabled until paid testing is explicitly approved. The main provider key stays on the backend.
