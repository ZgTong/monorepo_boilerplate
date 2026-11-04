# 0010. Run backend integration tests against PostgreSQL started by Testcontainers

- Status: Accepted
- Date: 2026-11-04

## Context

Phase 1 calls for integration tests: code that talks to PostgreSQL has to be tested against a real PostgreSQL, not a mock. The first case is `GET /health/db`. Every Prisma-backed feature in Phase 3 will follow the same pattern, so the setup chosen here will be used by every database test.

Requirements:

- The same database engine and major version as production: PostgreSQL 17 (ADR 0004, `docker-compose.yml`).
- The same way of starting it locally and in CI, so a test that passes locally passes in CI.
- Isolation from the developer's local database, so tests neither depend on nor damage local data.
- The real schema, applied through the committed Prisma migrations.
- Unit tests stay fast and need no Docker.

Verified on 2026-11-04:

- `testcontainers` and `@testcontainers/postgresql` 12.2.1 need Node >= 22.22. Vitest 5 supports Node 26.
- Vitest 5 inline projects inherit root options by default. A root-level `globalSetup` is not inherited, so it has to be set on the integration project itself. `globalSetup` can pass values to workers with `project.provide()` / `inject()`.
- `prisma migrate deploy` succeeds with no migrations ("No migration found"), so the setup already works before the first model exists.
- Locally (WSL 2 with Docker Desktop), the first run took about 25 s because it pulled images. Later runs take about 9 s end to end. The containers are removed afterwards.
- GitHub-hosted Ubuntu runners have Docker preinstalled.

## Options

### Testcontainers (chosen)

- Pros: the test run starts its own throwaway `postgres:17` container and removes it afterwards, so local and CI runs use identical code. Each run starts from an empty database. There is no manual `docker compose up` step and no shared state with the dev database. It is the de facto standard for integration tests in the Java, Go and Node ecosystems, so the skill transfers. Ryuk, a reaper container, removes leftover containers even if the test process crashes.
- Cons: Docker is required wherever integration tests run. A container start adds a few seconds. It is another library with a large dependency tree (dockerode, ssh2, gRPC). Three of those packages ship install scripts. They are denied in `allowBuilds` because they are optional native speed-ups or a version check (see Decision).

### GitHub Actions service container in CI, docker compose locally

- Pros: no new dependency. Native to GitHub Actions.
- Cons: two ways to start the database, which drift apart. Local runs share the dev database, so tests and manual work interfere. Test data has to be reset by hand.

### In-process PostgreSQL emulation (pg-mem, PGlite)

- Pros: fastest option, and no Docker.
- Cons: it is not the production engine. Extensions, locking, some SQL and the wire protocol differ, and those differences are exactly what integration tests exist to catch. PGlite is real Postgres compiled to WASM and is closer, but it runs in-process, and the Prisma adapter for it is a different code path from the `@prisma/adapter-pg` used in production.

## Decision

- **Two Vitest projects** in `packages/backend/vitest.config.ts`:
    - `unit` (`src/**/*.test.ts`, excluding `*.int.test.ts`): run by `pnpm test` and by the CI `Verify` job. No Docker needed.
    - `integration` (`src/**/*.int.test.ts`): run by `pnpm test:integration`.
- **The integration project's `globalSetup`** (`test/integration/global-setup.ts`) starts one `postgres:17` container per run, runs `prisma migrate deploy` against it, and passes the connection URL to the workers with `project.provide('databaseUrl', …)`.
- **A `setupFiles` entry** (`test/integration/setup-env.ts`) sets `process.env['DATABASE_URL']` from `inject('databaseUrl')` before any test file is imported. `src/db.ts` creates the Prisma client at import time, so the application code does not have to change to be testable.
- **Failure paths that are hard to produce with a real database** (for example a 503 from `/health/db`) are unit tests that use `vi.mock('../db.js')`. Integration tests cover the real happy paths.
- **CI:** a separate `integration` job ("Integration tests") runs in parallel with `Verify`. Both jobs use a local composite action, `.github/actions/setup`, for pnpm, Node and the frozen install, so the toolchain setup is defined once. Dependabot also scans `/.github/actions/*`, so the pins inside the composite action stay current.
- **Install scripts:** `cpu-features`, `ssh2` and `protobufjs` are set to `false` in `allowBuilds`. The first two are optional native crypto speed-ups for ssh2, which Testcontainers only uses for Docker over SSH. The pure-JS fallback is fine. The third only runs a version check.

## Consequences

- Any database code can be tested end to end with one file named `*.int.test.ts`. The schema always comes from the committed migrations, so a missing or broken migration fails CI.
- All integration test files share one container. Phase 3 tests that write data need an isolation strategy, such as truncating tables in a `beforeEach`, a transaction per test, or one database per worker. Pick one when the first model exists.
- Integration tests cannot run where Docker is unavailable. Unit tests remain the fast default.
- The required status checks on `main` should include `Integration tests` as well as `Verify`. That setting belongs in the planned Terraform-managed GitHub configuration.
- The composite action uses `./.github/actions/setup` with a `zizmor: ignore[self-repository]` comment. GitHub now recommends the `$/` self-repository syntax, but actionlint 1.7.12 rejects it.

## Revisit when

- The integration job takes longer than about 5 minutes, or test files start to interfere through shared data: move to one database per Vitest worker, or use template databases.
- Tests need other infrastructure (Redis, a queue, S3 via LocalStack): add more Testcontainers modules to the same `globalSetup`.
- actionlint supports the `$/` syntax: switch both `uses:` references and remove the ignore comments.
- The frontend or another package needs integration tests: move the shared container setup into a workspace package.
