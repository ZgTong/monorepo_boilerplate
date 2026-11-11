terraform {
  # >= 1.10 for S3 native state locking (use_lockfile); import blocks need >= 1.5.
  required_version = ">= 1.10"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
  }

  # Partial config: values come from backend.s3.tfbackend (git-ignored, copy backend.s3.tfbackend.example).
  #   terraform init -backend-config=backend.s3.tfbackend
  backend "s3" {}
}
