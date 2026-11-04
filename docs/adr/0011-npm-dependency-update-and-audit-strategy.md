# 0011. Keep npm dependencies current with grouped Dependabot PRs and a pnpm audit gate

- Status: Accepted
- Date: 2026-11-04

## Context

Turning on Dependabot security updates produced several lockfile-only PRs at once (lodash, body-parser, picomatch, @babel/helpers, @babel/core, browserslist). Each merge rewrote `pnpm-lock.yaml`, so the remaining PRs conflicted. Merging `main` into a Dependabot branch by hand then left a lockfile full of conflict markers.

Verified on 2026-11-04 with pnpm 12.14.0, in a scratch clone:

- **Running `pnpm install` on a lockfile with conflict markers does not merge it.** pnpm prints `Ignoring broken lockfile` and resolves every dependency again. Compared with `main`, 173 `package@version` entries changed, including unrelated upgrades such as `next` 16.4.2 → 16.4.4 and `vitest` 5.0.5 → 5.1.0.
- **`pnpm audit --fix=update` updates only the vulnerable packages,** within the ranges the dependents declare, and only in the lockfile. It changed 46 entries (the @babel tree, browserslist, ajv and their own dependencies), fixed 4 advisories (2 high, 1 moderate, 1 low), and left `package.json` untouched. All checks, including integration tests, passed.
- **`pnpm audit --audit-level high` exits 1** on a lockfile with high advisories and 0 once they are fixed. GHSA IDs listed under `audit.ignore` in `pnpm-workspace.yaml` are skipped.
- **Two moderate advisories can only be fixed by a major upgrade:** minimatch (GHSA-g3hv-75wg-m249) and glob (GHSA-3g3m-2fjr-6pw4). Both come in through dev-only tooling (the ESLint toolchain and testcontainers), and both dependents declare older majors.
- **GitHub's docs say Dependabot supports pnpm v7 to v12.** They also say that when pnpm writes `pnpm-lock.yaml` as two YAML documents (the pnpm 12 default when `packageManager` pins a version, which is our case), the dependency graph does not detect those dependencies, so Dependabot alerts and security updates are not created. This contradicts what we observed: security-update PRs were created against exactly this lockfile. We can't see the alert list from here, so which behaviour is current is unverified. GitHub alone can't be our only vulnerability detector.
- Not verified: whether Dependabot updates dependencies declared through the pnpm `catalog:` protocol.

## Options

### Who proposes npm version updates

#### Dependabot, grouped (chosen)

- Pros: already in use for GitHub Actions and built into GitHub, so there's no third-party app with write access to the repository. It has already produced valid pnpm 12 lockfile PRs for this repo. Grouping (one weekly minor/patch PR, one security PR) removes most lockfile conflicts. Cooldown and ignore rules cover our needs.
- Cons: catalog support is unverified. No scheduled lockfile refresh. Its grouping and rebase rules are less flexible than Renovate's.

#### Renovate

- Pros: the most capable updater for monorepos. Its docs explicitly support pnpm catalogs. `lockFileMaintenance` refreshes the whole lockfile on a schedule. It has rich grouping, a dependency dashboard issue, and per-package release-age rules.
- Cons: a third-party GitHub App that needs write access to the repository, which is itself a supply-chain trust decision. The configuration surface is large. It would duplicate Dependabot, which we keep for Actions anyway.

#### No bot: periodic manual `pnpm update`

- Pros: full control, no noise.
- Cons: depends on discipline. Dependencies drift until an upgrade becomes a risky big-bang change.

### How vulnerabilities are detected

#### `pnpm audit` in CI, on every PR, on `main` and weekly (chosen)

- Pros: independent of GitHub's dependency graph and its two-document lockfile limitation. It's the same command locally and in CI. Accepted risks are in code and reviewed.
- Cons: it needs the npm registry advisory endpoint at run time. A newly published advisory can fail an unrelated PR. That is intended as a gate, and the fix is one command.

#### Dependabot alerts only

- Pros: no CI work.
- Cons: the documented pnpm 12 limitation means it may silently miss our dependencies.

## Decision

1. **Fixing:** the standard fix for advisories is `pnpm audit --fix=update` on a branch from `main`, followed by the normal PR. Use `overrides` only for a high or critical advisory in a production dependency that cannot be fixed within ranges, and give it a comment and a removal condition.
2. **Accepted risks:** listed under `audit.ignore` in `pnpm-workspace.yaml`. Each entry gets a comment with the reason (why it can't be fixed, why it doesn't reach production) and a review date. Initial entries: GHSA-g3hv-75wg-m249 (minimatch) and GHSA-3g3m-2fjr-6pw4 (glob), review by 2027-02-01.
3. **Gate:** the root script `pnpm deps:audit` (`pnpm audit --audit-level high`) runs as the CI job `Dependency audit`, separate from `Verify` so it reports on its own. The job only installs pnpm and reads the lockfile. It has no Node setup and no `pnpm install`, so the gate never executes dependency code. CI also runs weekly on `main` (Sunday 21:23 UTC, deliberately off the hour) and on demand (`workflow_dispatch`), because advisories are published without any commit from us.
4. **Version updates:** Dependabot `npm` ecosystem, weekly on Monday at 09:00 Sydney time, with a 7-day cooldown:
    - one grouped PR for all minor and patch version updates;
    - one grouped PR for security updates;
    - majors as separate PRs, except `next`, `eslint-config-next` and `@next/*`, which must move together and are grouped;
    - commit prefix `build(deps)` for dependencies and `build(deps-dev)` for devDependencies;
    - held back until the reasons recorded in their ADRs go away:
        - `typescript` above 6.0.x, including 6.1 minors, because `@repo/eslint-config` declares `<6.1.0` (ADR 0006);
        - `eslint` and `@eslint/js` majors (ADR 0008);
        - `@types/node` majors, which move with the Node major in `.nvmrc` (ADR 0005).
5. **Lockfile conflicts:**
    - never hand-edit conflict markers in `pnpm-lock.yaml`, and never "fix" them by running `pnpm install` on the conflicted file;
    - never push to or merge into a Dependabot branch: use `@dependabot rebase`, or `@dependabot recreate` if the branch was already touched;
    - for a conflicting human branch, resolve `package.json` by hand, take `main`'s lockfile (`git checkout origin/main -- pnpm-lock.yaml`), run `pnpm install`, and check that `git diff` only shows the intended changes.

## Consequences

- Known high and critical advisories can't reach `main` unnoticed. Moderate and low advisories show up in `pnpm audit` locally and in the weekly run, but don't block.
- Fewer, larger dependency PRs. A grouped PR that fails CI has to be bisected, for example by excluding the offending package from the group.
- The accepted-risk list is a commitment. It needs an owner and review dates, or it turns into a list of silently ignored problems.
- `Dependency audit` should become a required check, together with `Integration tests`, in the Terraform-managed ruleset.

## Revisit when

- Dependabot does not update catalog entries (`typescript`, `eslint`, `@types/node` in `pnpm-workspace.yaml`), or grouped PRs still conflict often: move npm updates to Renovate.
- GitHub fixes or confirms the two-document lockfile limitation: decide whether Dependabot alerts can be trusted again.
- An accepted risk reaches its review date, or its dependents publish versions that allow the patched major: remove the `audit.ignore` entry.
- The backend gains production dependencies with a large attack surface: consider `--prod`-only gating at a lower severity level, or an SCA tool such as OSV-Scanner that also covers container images.
