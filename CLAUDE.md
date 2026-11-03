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

| Phase | Focus                                                                                                        | Status |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 0     | Monorepo, Next.js 16 frontend, Express + Prisma backend, local Postgres, Terraform skeleton, subagents       | done   |
| 1     | Engineering baseline: strict TS everywhere, shared lint/format, unit + integration tests, GitHub Actions CI  | next   |
| 2     | Containerise backend; Terraform modules for VPC, RDS, ECS Fargate + ALB, S3 + CloudFront; CD via GitHub OIDC |        |
| 3     | Real domain features: API design and validation, auth, shared types/contracts between frontend and backend   |        |
| 4     | Observability: structured logging, metrics, distributed tracing (OpenTelemetry), dashboards, alerts, SLOs    |        |
| 5     | High availability and scale: multi-AZ, autoscaling, caching, queues/async jobs, load testing, DB performance |        |
| 6     | Security hardening, cost awareness, DR/backups, incident runbooks                                            |        |
| 7     | AI features in the product (LLM integration, RAG, evals) on top of the platform                              |        |

## Stack

- **Runtime:** Node 26 (`.nvmrc`, `engines`), pnpm 12 (`packageManager` field). Prisma 7.10's preinstall check prints an "unsupported Node" warning on 26 (its `engines` field allows it); this is a known, accepted gap until Prisma 8 is stable.
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
pnpm --filter frontend build          # static export into packages/frontend/dist
pnpm --filter backend test            # vitest
pnpm format / pnpm format:fix         # prettier check / write (config: root .prettierrc.json)
```

The frontend has no tests yet. Its `test` script is a placeholder that exits with an error.

## Frontend architecture (`packages/frontend`)

- **Static export:** `next.config.js` sets `output: 'export'` and `distDir: 'dist'`. There is no Node server at runtime, so server-only features are unavailable: route handlers, `headers()`/`cookies()`, dynamic routes without `generateStaticParams`, ISR, middleware, default image optimisation. Moving off static export is a deliberate future decision (ADR) and not something to do implicitly.
- **Page extensions** are limited to `tsx`, `ts`, `mdx`.
- **Lint:** ESLint 9 flat config (`eslint.config.mjs`: next core-web-vitals + typescript + prettier). Stylelint 17 runs as a separate `lint:css` step, not inside the build.
- **Path aliases** (`packages/frontend/tsconfig.json`): `@src/*`, `@app/*`, `@components/*`, `@data/*`, `@hooks/*`, `@utils/*`, `@lib/*` map to `src/<name>/*`, and `@root/*` maps to the package root.
- The frontend `tsconfig.json` still has `strict: false`. Turning it on is part of Phase 1.

## Code style

Prettier (root `.prettierrc.json`): 4-space indent, single quotes (also in JSX), semicolons, `trailingComma: es5`. Terraform is formatted with `terraform fmt`.
