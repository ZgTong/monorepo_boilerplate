terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Partial config: values come from backend.s3.tfbackend (git-ignored, copy backend.s3.tfbackend.example).
  #   terraform init -backend-config=backend.s3.tfbackend
  backend "s3" {}
}
