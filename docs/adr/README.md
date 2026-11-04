# Architecture Decision Records

Each significant technical decision gets a short, numbered record: the context, the options considered with their trade-offs, the decision, and what would make us revisit it. ADRs are never rewritten. A changed decision gets a new ADR that marks the old one `Superseded by NNNN`.

Create one with `/adr <topic>` in Claude Code, or copy [`template.md`](template.md).

| #                                                          | Decision                                                                        | Status   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- |
| [0001](0001-pnpm-monorepo.md)                              | pnpm workspace monorepo, Terraform outside the workspace                        | Accepted |
| [0002](0002-backend-express-prisma.md)                     | Express 5 + Prisma 7 for the backend                                            | Accepted |
| [0003](0003-terraform-for-iac.md)                          | Terraform (not CDK) for AWS infrastructure                                      | Accepted |
| [0004](0004-ecs-fargate-rds.md)                            | ECS Fargate + RDS PostgreSQL as the AWS runtime                                 | Accepted |
| [0005](0005-node-26-runtime.md)                            | Node 26 as the single runtime version                                           | Accepted |
| [0006](0006-typescript-6-across-workspace.md)              | TypeScript 6.0 in every workspace package                                       | Accepted |
| [0007](0007-shared-tsconfig-without-project-references.md) | Shared strict tsconfig base, no project references yet                          | Accepted |
| [0008](0008-shared-eslint-config-package.md)               | Shared ESLint config as internal package `@repo/eslint-config`                  | Accepted |
| [0009](0009-github-actions-ci.md)                          | Run CI on GitHub Actions as a single hardened job                               | Accepted |
| [0010](0010-integration-tests-with-testcontainers.md)      | Run backend integration tests against PostgreSQL started by Testcontainers      | Accepted |
| [0011](0011-npm-dependency-update-and-audit-strategy.md)   | Keep npm dependencies current with grouped Dependabot PRs and a pnpm audit gate | Accepted |
