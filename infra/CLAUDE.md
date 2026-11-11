# Infra (infra/)

Terraform for AWS (`ap-southeast-2`) and for this repository's GitHub settings. Not part of the pnpm workspace.

## Layout

- `bootstrap/`: one-time stack that creates the S3 bucket for remote state. Uses local state and has `prevent_destroy` on the bucket. Applied on 2026-11-11 with AWS profile `zuguangt`; its local `terraform.tfstate` exists only on the owner's machine.
- `github/` (ADR 0012): repository settings, the `main` ruleset, Dependabot security settings and default workflow permissions. Uses the `integrations/github` provider with a `GITHUB_TOKEN` from the shell. State is in the bootstrap bucket under `github/terraform.tfstate`. Required status checks there must match the job `name:`s in `.github/workflows/ci.yml`. `github_repository.this` has `prevent_destroy`, because destroying it would delete the repository. See `github/README.md`.
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
- Commit `.terraform.lock.hcl`; never commit `.terraform/`, `*.tfstate`, `*.tfvars`, `backend.hcl`, `*.tfplan`, `generated.tf`.
- Review a saved plan, then apply exactly that plan: `terraform plan -out=x.tfplan`, then `terraform apply x.tfplan`. Claude reads it with `terraform show x.tfplan`.
- Never change settings managed here in the GitHub or AWS console; the next plan would revert them.
