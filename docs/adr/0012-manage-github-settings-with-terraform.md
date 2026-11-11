# 0012. Manage GitHub repository settings with Terraform

- Status: Accepted
- Date: 2026-11-11

## Context

CI (ADR 0009 to 0011) only protects `main` if GitHub enforces it: required checks, PR-only merges, and squash-only merging so that PR titles become Conventional Commits. These settings were meant to be configured by hand in the GitHub UI. On 2026-11-11, the provider's import of the live settings showed:

- `main` had **no ruleset and no classic branch protection** (`"protected": false`). Direct pushes and merging with failing checks were possible.
- **Merge commits, rebase merges and squash merges were all enabled.** Squash had been chosen per PR, by hand. The squash title default was `COMMIT_OR_PR_TITLE`, which uses the commit message, not the PR title, for single-commit PRs.

An earlier assumption that "squash-only was set" was wrong. Nothing showed it because UI settings are not reviewed, versioned or diffable. That is the problem infrastructure as code solves.

Verified on 2026-11-11: provider `integrations/github` 6.13.0 (Terraform 1.16.1). Resource schemas came from `terraform providers schema`, and import ID formats from the provider docs at tag v6.13.0. `github_repository.vulnerability_alerts` is deprecated in favour of `github_repository_vulnerability_alerts`. The GitHub Actions app ID is 15368 (`GET /apps/github-actions`).

## Options

### Terraform `integrations/github` provider in `infra/github` (chosen)

- Pros: same tool, workflow and review process as the AWS infrastructure (ADR 0003). Settings are versioned, reviewed in PRs, and `plan` shows drift when someone changes the UI. Existing settings were adopted with `import` blocks and `-generate-config-out` instead of being retyped. It scales to many repositories and organisation rulesets.
- Cons: needs a GitHub token with admin rights on the repository whenever someone runs a plan. State has to live somewhere, so it depends on the bootstrap S3 bucket. A wrong `github_repository` change is dangerous: destroying that resource deletes the repository. This is mitigated below.

### Configure by hand in the UI, documented in a checklist

- Pros: no tooling, no token.
- Cons: exactly what failed here. Settings drift silently, and there is no review or history.

### Rulesets as JSON in the repo, imported through the UI or API, or a settings app (e.g. Probot Settings)

- Pros: also versioned.
- Cons: the JSON import is one-way, with no drift detection. A settings app is a third-party app with admin rights, and a second tool next to Terraform.

## Decision

- **A separate root module, `infra/github`,** outside `envs/`, because repository settings are not per environment. Its state is in the bootstrap S3 bucket under the key `github/terraform.tfstate`, with native locking. Backend values are in a git-ignored `backend.hcl`.
- **Managed resources:**
    - **`github_repository.this`**
        - Squash merging only. The commit title is the PR title and the commit message is the PR body.
        - The "Update branch" button is enabled, and head branches are deleted after merge.
        - Secret scanning and push protection stay enabled.
        - `prevent_destroy` and `archive_on_destroy = true` protect the repository against deletion through Terraform.
    - **`github_repository_ruleset.protect_main`** applies to the default branch:
        - no deletion and no force push;
        - linear history;
        - PRs required, with 0 approvals (solo repository) and squash merging only;
        - required checks `Verify`, `Integration tests` and `Dependency audit`, each pinned to the GitHub Actions app (`integration_id = 15368`). That stops a commit status with the same name from another app or token. It does not stop a workflow in this repository, including one added by the PR itself, from defining a job with that name; that is left to reviewing workflow changes;
        - the branch must be up to date before merging;
        - no bypass actors.
    - **`github_repository_vulnerability_alerts`** and **`github_repository_dependabot_security_updates`** are enabled.
    - **`github_workflow_repository_permissions`** sets the default `GITHUB_TOKEN` to read-only, as a second layer behind `permissions:` in the workflows.
- **Authentication:** a fine-grained personal access token limited to this repository, with Administration read/write and an expiry. It is held only in the shell environment (`GITHUB_TOKEN`) and never in a file.
- **Process:** `plan -out=github.tfplan`, review, then `apply github.tfplan`, so that what is applied is exactly what was reviewed. The owner runs apply, normally from `main` after the PR is merged. Settings are not changed in the UI. The first apply came from the PR branch, because nothing protected `main` yet.

## Consequences

- `main` is actually protected. Every change, including changes to this stack, goes through a PR with all three checks green.
- **Break glass:** there are no bypass actors, so a broken required check blocks every PR, including the fix. Because `apply` does not need the change to be on `main`, the owner can fix or disable the ruleset from a branch with a local `apply`, then merge the fix (`infra/github/README.md`).
- **Up-to-date branches and Dependabot:** the strict policy makes open PRs go out of date whenever another PR merges. Dependabot PRs must be refreshed with `@dependabot rebase`, not the "Update branch" button, which pushes to Dependabot's branch and stops Dependabot from maintaining it.
- **A saved plan pins the provider lock file.** Changing `.terraform.lock.hcl` between `plan` and `apply`, even only adding hashes for other platforms, makes `apply` fail. This happened on the first run, and the fix was to plan again.
- A new required check (for example a frontend test job) needs a change here as well as in `ci.yml`. A check that is renamed in `ci.yml` but not here blocks every PR until both agree.
- Running a plan needs a token, so this stack does not run in CI yet. Drift is only detected when someone runs `plan`.
- The import blocks are no-ops now and can be removed in a later change.

## Revisit when

- Drift detection is wanted without a manual run: add a scheduled CI job that runs `terraform plan -detailed-exitcode` with a GitHub App token, which is short-lived and not tied to a person. This becomes possible once GitHub OIDC to AWS exists for the state bucket (Phase 2).
- More repositories, or an organisation, appear: move the settings into a module, or into organisation rulesets.
- Collaborators join: raise `required_approving_review_count`, add CODEOWNERS, and review bypass rules.
