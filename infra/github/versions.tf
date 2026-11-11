terraform {
  # >= 1.10 for S3 native state locking (use_lockfile); import blocks need >= 1.5.
  required_version = ">= 1.10"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
  }

  # Partial config: values come from backend.hcl (git-ignored, copy backend.hcl.example).
  #   terraform init -backend-config=backend.hcl
  backend "s3" {}
}
