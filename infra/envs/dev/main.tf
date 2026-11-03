provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project
      Environment = local.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  environment = "dev"
  name        = "${var.project}-${local.environment}"
}

# Modules are added here as they are implemented in ../../modules:
#   network  - VPC, public/private subnets
#   database - RDS PostgreSQL (password in Secrets Manager)
#   backend  - ECR + ECS Fargate service behind an ALB
#   frontend - S3 + CloudFront for the Next.js static export
