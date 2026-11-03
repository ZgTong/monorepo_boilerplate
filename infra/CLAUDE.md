# Infra (infra/)

Terraform for AWS (`ap-southeast-2`). Not part of the pnpm workspace.

## Layout

- `bootstrap/`: one-time stack that creates the S3 bucket for remote state. Uses local state and has `prevent_destroy` on the bucket.
- `envs/<env>/`: one root module per environment, only wiring modules together. Remote state in S3 with native locking (`use_lockfile = true`, needs Terraform >= 1.10, so no DynamoDB table). Backend values come from a git-ignored `backend.hcl` (template: `backend.hcl.example`).
- `modules/<name>/`: reusable modules. Planned: `network` (VPC), `database` (RDS PostgreSQL), `backend` (ECR + ECS Fargate + ALB), `frontend` (S3 + CloudFront for the Next.js static export).

## Commands

```bash
cd infra/envs/dev
terraform init -backend-config=backend.hcl
terraform fmt -recursive ../..
terraform validate
terraform plan
# apply only after the user has reviewed the plan
```

Without AWS credentials you can still check syntax: `terraform init -backend=false && terraform validate`.

## Rules

- `apply`, `destroy` and state surgery are run by the user, never by Claude.
- No secrets in `.tf`/`.tfvars`. RDS uses `manage_master_user_password = true`; ECS reads secrets from Secrets Manager. GitHub Actions authenticates via OIDC role, not access keys.
- Commit `.terraform.lock.hcl`; never commit `.terraform/`, `*.tfstate`, `*.tfvars`, `backend.hcl`.
