# Adopt settings that were first configured by hand in the GitHub UI, instead of creating
# them again. Import blocks are idempotent: once a resource is in state they are no-ops,
# and they can be deleted in a later change.
#
# The resource blocks in main.tf were generated from the live settings with
#   terraform plan -generate-config-out=generated.tf
# (during generation only, each import block needs `provider = github`; otherwise
# Terraform infers the non-existent hashicorp/github from the type prefix).

import {
  to = github_repository.this
  id = var.repository
}

import {
  to = github_repository_vulnerability_alerts.this
  id = var.repository
}

import {
  to = github_repository_dependabot_security_updates.this
  id = var.repository
}

import {
  to = github_workflow_repository_permissions.this
  id = var.repository
}
