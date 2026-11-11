# Repository settings (ADR 0012). Generated from the live settings with
# `terraform plan -generate-config-out`, then trimmed and changed where noted.
resource "github_repository" "this" {
  name        = var.repository
  description = "A Boilerplate Monorepo for Javascript Full Stack Development"
  visibility  = "public"

  # Squash only, titled after the PR. With Conventional Commit PR titles this gives one
  # well-formed commit per PR on main and a linear history (see ruleset.tf).
  # Changed: merge commits and rebase merges were enabled, and the squash title was
  # COMMIT_OR_PR_TITLE (the commit message for single-commit PRs).
  allow_squash_merge          = true
  allow_merge_commit          = false
  allow_rebase_merge          = false
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "PR_BODY"

  # Changed: offer the "Update branch" button, because the ruleset requires PR branches
  # to be up to date with main before merging.
  allow_update_branch    = true
  allow_auto_merge       = false
  delete_branch_on_merge = true

  has_issues                  = true
  has_projects                = true
  has_wiki                    = true
  has_discussions             = false
  is_template                 = false
  allow_forking               = true
  web_commit_signoff_required = false
  topics                      = []

  security_and_analysis {
    secret_scanning {
      status = "enabled"
    }
    secret_scanning_push_protection {
      status = "enabled"
    }
  }

  # Deleting this resource must never delete the repository.
  # prevent_destroy stops plans that would destroy it; archive_on_destroy is the second
  # line of defence if prevent_destroy is ever removed.
  archive_on_destroy = true
  lifecycle {
    prevent_destroy = true
  }
}

# Dependabot alerts for vulnerable dependencies. Not github_repository.vulnerability_alerts,
# which is deprecated in provider v6.
resource "github_repository_vulnerability_alerts" "this" {
  repository = github_repository.this.name
  enabled    = true
}

# Dependabot PRs that fix those alerts. Grouping and schedule live in .github/dependabot.yml.
resource "github_repository_dependabot_security_updates" "this" {
  repository = github_repository.this.name
  enabled    = true
}

# Default GITHUB_TOKEN permissions for workflows that do not declare `permissions:`.
# Read-only, as a second layer behind the explicit permissions in ci.yml (ADR 0009).
resource "github_workflow_repository_permissions" "this" {
  repository                       = github_repository.this.name
  default_workflow_permissions     = "read"
  can_approve_pull_request_reviews = false
}
