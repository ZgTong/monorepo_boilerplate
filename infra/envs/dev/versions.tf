terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Partial config: values come from backend.hcl (git-ignored, copy backend.hcl.example).
  #   terraform init -backend-config=backend.hcl
  backend "s3" {}
}
