# 0004. Run the backend on ECS Fargate with RDS PostgreSQL; serve the frontend from S3 + CloudFront

- Status: Accepted
- Date: 2026-10-18

## Context

The app should become highly available and horizontally scalable without the owner operating servers or a Kubernetes cluster.

## Options

### ECS Fargate + ALB (chosen)

- Pros: runs the same container locally and in AWS, has no cold starts, handles long-lived connections and background workers, and scales on CPU, memory or request count across AZs.
- Cons: always-on cost (tasks, ALB, NAT or VPC endpoints), and more Terraform than serverless.

### Lambda + API Gateway

- Pros: pay per request, near-zero idle cost, automatic scaling.
- Cons: cold starts, Express needs an adapter, Postgres connections need RDS Proxy, and execution time limits apply.

### EKS (Kubernetes)

- Pros: the most flexible option and an industry-standard skill.
- Cons: heavy operational load for one person. It is better learned once the platform needs it.

## Decision

Backend: ECR image to an ECS Fargate service behind an ALB, in private subnets. Database: RDS PostgreSQL with a password managed in Secrets Manager. Frontend: the Next.js static export on S3 behind CloudFront (origin access control).

## Consequences

- Needs a VPC with public and private subnets across at least 2 AZs, plus outbound access for tasks (NAT gateway or VPC endpoints, which is a cost decision for the network module).
- The frontend stays a static export (see root CLAUDE.md) while it is served from S3.

## Revisit when

Traffic is very spiky or mostly idle (Lambda becomes cheaper), or the number of services makes Kubernetes worth its overhead.
