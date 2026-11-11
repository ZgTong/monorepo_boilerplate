# Merge gate for main (ADR 0012). New resource: main had no ruleset or classic branch
# protection before this stack, so nothing is imported.
resource "github_repository_ruleset" "protect_main" {
  name        = "protect-main"
  repository  = github_repository.this.name
  target      = "branch"
  enforcement = "active"

  # No bypass_actors: the owner goes through PRs and CI like everyone else.

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion                = true # main cannot be deleted
    non_fast_forward        = true # no force pushes that rewrite main's history
    required_linear_history = true # no merge commits; pairs with squash-only merging

    pull_request {
      # Solo repository: an author cannot approve their own PR, so 1 would block every merge.
      required_approving_review_count = 0
      allowed_merge_methods           = ["squash"]
    }

    required_status_checks {
      # The PR branch must be up to date with main, so checks ran against what will merge.
      strict_required_status_checks_policy = true

      # integration_id pins each check to the GitHub Actions app: a commit status with the
      # same name posted by another app or token cannot satisfy the rule. It does not stop
      # any workflow in this repo (including one added by the PR itself) from defining a job
      # with the same name; that is caught by reviewing workflow changes (CODEOWNERS later).
      # The names must match the job `name:`s in .github/workflows/ci.yml (README: Break glass).
      required_check {
        context        = "Verify"
        integration_id = local.github_actions_app_id
      }
      required_check {
        context        = "Integration tests"
        integration_id = local.github_actions_app_id
      }
      required_check {
        context        = "Dependency audit"
        integration_id = local.github_actions_app_id
      }
    }
  }
}

locals {
  # GET https://api.github.com/apps/github-actions -> "id": 15368
  github_actions_app_id = 15368
}
