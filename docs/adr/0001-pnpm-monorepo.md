# 0001. Use a pnpm workspace monorepo, with Terraform outside the workspace

- Status: Accepted
- Date: 2026-10-18

## Context

One developer owns frontend, backend, database and infrastructure. Changes often span layers, and CI should be able to validate a cross-layer change in a single PR.

## Options

### Separate repositories per layer

- Pros: independent versioning and release cadence, smaller clones.
- Cons: cross-layer changes need several coordinated PRs, and shared types and config get duplicated. That is too much overhead for one person.

### pnpm workspace monorepo (chosen)

- Pros: one PR per feature, shared tooling (Prettier, ESLint, TS config), strict dependency isolation (no phantom deps), fast installs through the content-addressable store.
- Cons: CI must avoid rebuilding everything on every change, and the repo grows over time.

### Nx / Turborepo on top of pnpm

- Pros: task graph, remote caching, affected-only builds.
- Cons: extra tooling to learn and configure before there is enough code to benefit.

## Decision

Use a pnpm workspace (`packages/**`). Keep `infra/` (Terraform) at the root, outside the workspace, because it has no JS dependencies.

## Consequences

- Workspace packages: `frontend`, `backend`. Shared packages (e.g. API contracts) can be added under `packages/` later.
- Build scripts of dependencies must be allowed explicitly (`allowBuilds` in `pnpm-workspace.yaml`). This is a supply-chain safeguard.

## Revisit when

CI time grows noticeably because unaffected packages are rebuilt. At that point, evaluate Turborepo (task caching) or pnpm `--filter ...[origin/main]` for affected-only runs.
