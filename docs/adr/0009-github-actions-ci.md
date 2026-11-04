# 0009. Run CI on GitHub Actions as a single hardened job

- Status: Accepted
- Date: 2026-11-04

## Context

Phase 1 needs every change to pass the same checks before it reaches `main`: format, lint, typecheck, tests and build. Until now these ran only when someone remembered to run them locally. The repository is hosted on GitHub, and Phase 2 plans CD to AWS through GitHub OIDC, so the CI system should also be the future CD system.

CI is also a supply-chain target. It checks out the code, runs every dependency's install scripts, and holds a token for the repository. The workflow therefore has to be secure by default, not just functional.

Verified on 2026-11-04:

- `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0 and `pnpm/action-setup` v6.1.1 are the latest releases. `pnpm/action-setup` supports pnpm 12 and reads the version from `packageManager`. Since `setup-node` v6, pnpm caching is opt-in (`cache: pnpm`).
- Node 26 no longer bundles Corepack, so pnpm has to be installed by an action.
- `ubuntu-latest` points to Ubuntu 24.04. Ubuntu 26.04 runners are listed as available.
- The whole pipeline runs in about 1 to 2 minutes, and passes in a clean clone without any `.env` file.
- zizmor 1.32.0 (pedantic) reports no findings for the hardened workflow, down from 7 before hardening. actionlint reports none.

## Options

### CI platform

#### GitHub Actions (chosen)

- Pros: native to where the code lives, so PR checks, branch protection and Dependabot integrate without glue. It is free for this usage level. It supports OIDC federation to AWS, which Phase 2 needs to deploy without long-lived keys. It has the largest ecosystem of reusable actions, and is the most common CI on GitHub-hosted projects, so the skills transfer.
- Cons: lock-in to GitHub's workflow syntax. Third-party actions are a supply-chain risk that has to be managed (pinning, Dependabot).

#### GitLab CI, CircleCI, or another external CI

- Pros: GitLab CI has a strong built-in model (stages, environments) and the concepts transfer.
- Cons: the code is on GitHub, so this means mirroring or extra integration, a second account and permission model, and a weaker fit for GitHub OIDC and branch protection. There is no benefit that outweighs that here.

### Job layout

#### One job running all checks in sequence (chosen)

- Pros: dependencies are installed once. Total runner time and cost are the lowest. The YAML is simplest. Ordering the steps from cheapest to most expensive (format, lint, typecheck, test, build) gives fast failure.
- Cons: the checks do not run in parallel, and the first failure hides the result of later steps.

#### One job per check, in parallel

- Pros: shorter wall-clock time. All failures are visible at once.
- Cons: every job runs on a fresh VM and repeats checkout and install, which multiplies runner time. At a total of about 2 minutes, the parallelism saves less than the repeated installs cost.

#### Affected-only runs with a task runner (Turborepo, Nx)

- Pros: essential for large monorepos.
- Cons: a new tool and its configuration, for three packages. Not worth it at this size.

## Decision

`.github/workflows/ci.yml` runs on `pull_request` and on `push` to `main`, as one job `Verify` on `ubuntu-24.04`:

- **Same commands as locally.** Each step calls a root script (`pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`), so the commands are defined once in `package.json` and CI cannot drift from local runs. `pnpm -r` skips packages without the script, so the frontend joins `pnpm test` as soon as it gets a `test` script.
- **One source of truth for versions.** Node comes from `.nvmrc`, pnpm from `packageManager`. The runner image is pinned (`ubuntu-24.04`, not `ubuntu-latest`), so an image change is a deliberate commit.
- **Reproducible install.** `pnpm install --frozen-lockfile`, with the pnpm store cached by `setup-node`.
- **Hardening:**
    - `permissions: contents: read` at workflow level (least privilege). A job that needs more must request it itself.
    - Every action is pinned to a full commit SHA with the version in a trailing comment, because tags can be moved (for example tj-actions/changed-files, CVE-2025-30066). For annotated tags this is the SHA of the commit the tag points to, not of the tag object.
    - `persist-credentials: false` on checkout, so the token is not left in `.git/config`, where dependency install scripts could read it.
    - `concurrency`: PR runs are grouped by ref, so a new push cancels the previous run of the same PR. Runs on `main` are grouped by commit SHA, so every merged commit gets its own complete result. A concurrency group holds at most one running and one pending run, and a newly queued run replaces the pending one even with `cancel-in-progress: false`. A single group for `main` would therefore silently skip some commits.
    - `timeout-minutes: 15` instead of the 360-minute default.
    - The trigger is `pull_request`, never `pull_request_target`, so runs from forks get a read-only token and no secrets.
- **Keeping pins current.** `.github/dependabot.yml` checks GitHub Actions weekly with a 7-day cooldown. Minor and patch updates are grouped into one PR, and each major update gets its own. Dependabot for npm dependencies is out of scope here and needs its own decision (Dependabot vs Renovate, pnpm catalog support).

## Consequences

- A change can't silently break formatting, lint, types, tests or the build. A ruleset on `main` (set in the GitHub UI) that requires the `Verify` check (shown as `CI / Verify` on PRs) turns that into a hard gate.
- Pinned SHAs are unreadable on their own. The trailing comment carries the meaning, and Dependabot has to keep both in sync. Not verified yet: that Dependabot updates the version comment along with the SHA, and the exact commit message it produces from `prefix: ci`. Check both on its first PR.
- Integration tests that need PostgreSQL will not fit this job, because they need a database and are slower. They are expected to arrive as a second job that runs in parallel with `Verify`.

## Revisit when

- The `Verify` job takes longer than about 5 minutes: split it into parallel jobs, or add caching (ESLint `--cache`, a task runner).
- Integration tests are added: add a separate job, and decide between Testcontainers and a service container (separate ADR).
- Phase 2 adds deployment: add a separate workflow or job with `id-token: write` scoped to that job only, and use GitHub environments for approval.
- Ubuntu 26.04 becomes `ubuntu-latest`: bump the runner pin in its own PR.
- The repository goes public or gets outside contributors: review fork-PR settings, and require approval before workflows run for first-time contributors.
