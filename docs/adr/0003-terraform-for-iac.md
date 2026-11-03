# 0003. Use Terraform for AWS infrastructure

- Status: Accepted
- Date: 2026-10-18

## Context

All AWS resources must be reproducible, reviewed in PRs, and changed through CI rather than the console.

## Options

### AWS CDK (TypeScript)

- Pros: the same language as the app, high-level constructs that wire IAM and security groups automatically, and it can live in the pnpm workspace.
- Cons: AWS-only, state and rollback go through CloudFormation (slower, sometimes opaque failures), and the abstractions can hide what is actually created.

### Terraform (chosen)

- Pros: the industry standard across clouds and employers, explicit resources, and a very clear `terraform plan` diff before every change, which is valuable when the owner is the only reviewer.
- Cons: another language (HCL), and remote state has to be managed.

## Decision

Terraform with the AWS provider `~> 6.0`. Remote state lives in S3 with native lockfile locking (Terraform >= 1.10, so no DynamoDB table is needed). Layout: `infra/bootstrap` (state bucket), `infra/modules/*`, `infra/envs/<env>`.

## Consequences

- `plan` runs in CI on PRs. `apply` is a gated step run or approved by the owner.
- AWS auth from GitHub Actions uses OIDC role assumption, never long-lived keys.

## Revisit when

Multiple environments or accounts make per-directory envs repetitive (consider Terragrunt or Terraform Stacks), or OpenTofu becomes the better fit for licensing reasons.
