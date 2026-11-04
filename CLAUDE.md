# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Why this project exists

This repo is the owner's vehicle for getting back up to date as a **senior TypeScript full-stack engineer**. It is meant to grow, step by step, into a **production-grade, highly available, horizontally scalable application**, and along the way to cover everything a senior engineer is expected to own: CI/CD, infrastructure as code, system design, observability (metrics, logs, traces), security, testing strategy, performance, reliability, and effective use of AI in day-to-day engineering, eventually including shipping AI-powered features.

Learning is a first-class goal next to working software. A change that works but teaches nothing, or that uses an outdated approach, is not done.

## How Claude works with the owner

The owner works alone and relies on Claude as senior engineer, reviewer, and mentor. Apply these standards to every task, including subagents:

1. **Aim for a high bar.** Choose current, well-supported, forward-looking tools and patterns that would hold up in production at scale. Prefer the stable current major over legacy versions. Don't adopt pre-release versions (rc/beta) unless the user explicitly chooses to explore one. Call out when existing code falls short of that bar.
2. **Present trade-offs for every non-trivial decision.** Give the options, what each costs (complexity, money, lock-in, operational burden, learning curve), a clear recommendation, and what would change it. Record significant decisions as ADRs in `docs/adr/` (use `/adr`).
3. **Teach while doing.** Explain _why_, not just _what_: the underlying concept, the industry-standard name for it, and how it plays out at larger scale. Explain every short CLI flag used (e.g. `-D` = `--save-dev`) and prefer long forms when they read better.
4. **Point out what is worth extending.** When a task touches an area with a valuable next step (for example "this endpoint should get rate limiting", or "this is a good place to add tracing"), add a short **"Worth extending"** note at the end. Don't silently expand the scope of the current task.
5. **Verify, don't assume.** Check installed versions, `package.json` `engines`, lockfiles, and official docs before making claims about compatibility or behaviour. Say when something is unverified, and correct earlier statements as soon as they turn out to be wrong.
6. **Prove it works.** Run typecheck, tests, lint, build, `terraform validate`, or the app itself before reporting done, and report failures as they are.
7. **Irreversible or outward-facing actions need explicit confirmation**: `terraform apply/destroy`, anything touching AWS or remote databases, pushing, publishing, deleting data. Claude prepares the plan or diff; the owner runs or approves it. Follow the Clevertronics organization policy (no secrets in plaintext, no access to production systems without confirmation).
8. **Language:** reply to the owner in Simplified Chinese. Write code, comments, commit messages, ADRs, and other docs in English.

### Workflow conventions

- Commits follow Conventional Commits (`feat(backend): ...`, `fix(infra): ...`, `chore: ...`), one logical change per commit.
- Delegate to the project subagents in `.claude/agents/` (`backend`, `db`, `infra`, `reviewer`). Run `reviewer` before committing non-trivial changes.
- When working in parallel sessions, give each its own git worktree so they don't overwrite each other's files.

## Roadmap (living, update as phases complete)

| Phase | Focus                                                                                                        | Status      |
| ----- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| 0     | Monorepo, Next.js 16 frontend, Express + Prisma backend, local Postgres, Terraform skeleton, subagents       | done        |
| 1     | Engineering baseline: strict TS everywhere, shared lint/format, unit + integration tests, GitHub Actions CI  | in progress |
| 2     | Containerise backend; Terraform modules for VPC, RDS, ECS Fargate + ALB, S3 + CloudFront; CD via GitHub OIDC |             |
| 3     | Real domain features: API design and validation, auth, shared types/contracts between frontend and backend   |             |
| 4     | Observability: structured logging, metrics, distributed tracing (OpenTelemetry), dashboards, alerts, SLOs    |             |
| 5     | High availability and scale: multi-AZ, autoscaling, caching, queues/async jobs, load testing, DB performance |             |
| 6     | Security hardening, cost awareness, DR/backups, incident runbooks                                            |             |
| 7     | AI features in the product (LLM integration, RAG, evals) on top of the platform                              |             |

## Stack

- **Runtime:** Node 26 (`.nvmrc`, `engines`), pnpm 12 (`packageManager` field). Prisma 7.10's preinstall check prints an "unsupported Node" warning on 26 (its `engines` field allows it); this is a known, accepted gap until Prisma 8 is stable.
- **TypeScript:** `~6.0.3` in every package (ADR 0006). typescript-eslint does not support TS 7 yet, so don't upgrade to 7 or widen the range past 6.0.
- **Shared versions:** dependencies used by more than one package (`typescript`, `@types/node`, `eslint`) are defined once in the `catalog:` section of `pnpm-workspace.yaml`. The packages reference them as `"catalog:"`. Change the version there, never in a package's `package.json`.
- **Shared TypeScript config:** every package's `tsconfig.json` extends the root `tsconfig.base.json`, which holds the strictness and module-safety flags (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, ...). Packages add only package-specific settings: target, module system, `lib`, `types`, `jsx`, `paths`, plugins and output. Don't relax the base flags in a package. Fix the code instead. `noPropertyAccessFromIndexSignature` is on, so index-signature types such as `process.env` are read with brackets: `process.env['PORT']`.
- **Shared ESLint config** `packages/eslint-config` (`@repo/eslint-config`, ADR 0008): ESLint 9 flat config factories `baseConfig`, `nodeConfig` and `nextConfig`. Each takes `{ tsconfigRootDir: import.meta.dirname }` and applies `@eslint/js` recommended, typescript-eslint `strictTypeChecked` + `stylisticTypeChecked` (type-aware), and Prettier last. Packages depend on it via `"workspace:*"`. Change rules there, not per package. Every package lints with `--max-warnings 0`, so warnings fail just like errors. Every linted `.ts` file must be in that package's tsconfig `include`, or type-aware linting errors out.
- **Frontend** `packages/frontend`: Next.js 16 App Router, React 19, SCSS, static export.
- **Backend** `packages/backend`: Express 5, TypeScript ESM, Prisma 7 + PostgreSQL 17. See `packages/backend/CLAUDE.md`.
- **Infra** `infra/`: Terraform for AWS `ap-southeast-2`, outside the pnpm workspace. Target: ECS Fargate + RDS + S3/CloudFront. See `infra/CLAUDE.md`.
- **Decisions:** `docs/adr/`.

## Commands

Run from the repo root. pnpm only; `--filter <pkg>` (short form `-F`) runs the command in one workspace package.

```bash
pnpm install                          # install all workspace deps
docker compose up -d postgres         # local DB (-d = --detach); needs root .env from .env.example
pnpm frontend-start                   # next dev
pnpm --filter backend dev             # backend with watch mode
pnpm lint                             # lint every package that has a lint script (pnpm -r = --recursive)
pnpm typecheck                        # tsc --noEmit in every package that has a typecheck script
pnpm test                             # unit tests in every package that has a test script (no Docker)
pnpm test:integration                 # integration tests (backend: Testcontainers PostgreSQL, needs Docker)
pnpm build                            # build every package that has a build script (frontend: static export into packages/frontend/dist)
pnpm format / pnpm format:fix         # prettier check / write (config: root .prettierrc.json)
pnpm deps:audit                       # fail on high/critical advisories (pnpm audit --audit-level high)
pnpm audit --fix=update               # fix advisories by updating only the vulnerable packages in the lockfile
```

The frontend has no tests yet and no `test` script, so `pnpm test` skips it.

## Dependencies (ADR 0011)

- **Lockfile conflicts:** never hand-edit conflict markers in `pnpm-lock.yaml`, and never run `pnpm install` on a conflicted lockfile. pnpm 12 discards it and re-resolves everything, which silently upgrades unrelated packages. Instead, take `main`'s lockfile (`git checkout origin/main -- pnpm-lock.yaml`), resolve `package.json` by hand, run `pnpm install`, and check that `git diff` shows only the intended changes.
- **Dependabot branches:** never push to or merge into them. Comment `@dependabot rebase`, or `@dependabot recreate` if the branch was already touched.
- **Vulnerabilities:** fix with `pnpm audit --fix=update`. `overrides` are a last resort, only for high or critical advisories in production dependencies. An advisory that can't be fixed goes under `audit.ignore` in `pnpm-workspace.yaml`, with a reason and a review date.
- **Install scripts:** every new package with a build script needs an explicit `allowBuilds` entry in `pnpm-workspace.yaml`. Default to `false` unless the package can't work without it.

## CI (`.github/workflows/ci.yml`, ADR 0009, ADR 0010, ADR 0011)

- Three parallel jobs on every PR, on pushes to `main`, weekly on `main` (Sunday 21:23 UTC) and on demand. `Verify` runs `pnpm format`, `lint`, `typecheck`, `test`, `build`. `Integration tests` runs `pnpm test:integration` (Docker is available on the runner). `Dependency audit` runs `pnpm deps:audit` with only pnpm installed, so it never executes dependency code. CI calls the same root scripts as local development, so change a command in `package.json`, not in the workflow.
- Toolchain setup (pnpm, Node, frozen install) lives in the local composite action `.github/actions/setup`. New jobs that need dependencies use it after `actions/checkout` instead of repeating the steps.
- Hardening is required, not optional: workflow-level `permissions: contents: read`, actions pinned to full commit SHAs with a `# vX.Y.Z` comment, `persist-credentials: false` on checkout, `concurrency`, `timeout-minutes`. Never use `pull_request_target`. A job that needs more permissions requests them at job level.
- Dependabot (`.github/dependabot.yml`) keeps the action pins and npm dependencies up to date with grouped weekly PRs. Verify workflow changes with `actionlint` and `zizmor` (both run via Docker) before committing.

## Frontend architecture (`packages/frontend`)

- **Static export:** `next.config.js` sets `output: 'export'` and `distDir: 'dist'`. There is no Node server at runtime, so server-only features are unavailable: route handlers, `headers()`/`cookies()`, dynamic routes without `generateStaticParams`, ISR, middleware, default image optimisation. Moving off static export is a deliberate future decision (ADR) and not something to do implicitly.
- **Page extensions** are limited to `tsx`, `ts`, `mdx`.
- **Lint:** `eslint.config.mjs` uses `nextConfig()` from `@repo/eslint-config`. Stylelint 17 runs as a separate `lint:css` step, not inside the build.
- **Path aliases** (`packages/frontend/tsconfig.json`): `@src/*`, `@app/*`, `@components/*`, `@data/*`, `@hooks/*`, `@utils/*`, `@lib/*` map to `src/<name>/*`, and `@root/*` maps to the package root.
- With `noUncheckedIndexedAccess`, indexed access (`arr[0]`, `record[key]`) is typed `T | undefined`. Narrow the value before using it.

## Code style

Prettier (root `.prettierrc.json`): 4-space indent, single quotes (also in JSX), semicolons, `trailingComma: es5`. Terraform is formatted with `terraform fmt`.
