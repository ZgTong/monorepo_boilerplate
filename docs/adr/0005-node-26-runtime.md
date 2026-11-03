# 0005. Use Node 26 as the single runtime version

- Status: Accepted
- Date: 2026-11-03

## Context

Local development, CI and production containers should all run the same Node major. Prisma 7.10.1 declares `engines: ^20.19 || ^22.12 || >=24.0`, but its preinstall script only recognises majors 20/22/24 and prints an "unsupported Node" warning on 26. Prisma 8, which lists `>=26.0.0` explicitly, is still a release candidate.

## Options

### Node 24 LTS

- Pros: fully inside Prisma 7's explicitly tested range.
- Cons: an older major; moving to 26 is a migration we would have to do later anyway.

### Node 26 (chosen)

- Pros: the newest even-numbered (LTS-track) release, already used locally, and the version Prisma 8 targets.
- Cons: Prisma 7 does not officially test it, so issues are on us until Prisma 8 is stable.

### Node 26 + Prisma 8 RC

- Pros: an officially supported combination.
- Cons: pre-release ORM in the core data path.

## Decision

Node 26 everywhere (`.nvmrc`, `engines`, CI, Docker base image), with Prisma pinned to `^7.10.1`. The preinstall warning is accepted.

## Consequences

- Backend integration tests against a real Postgres must run in CI to catch any Node 26 + Prisma 7 incompatibility.
- `prisma` must stay pinned to `^7`, because the npm `latest` tag currently points at an 8.0 RC.

## Revisit when

Prisma 8 reaches stable (upgrade and drop the accepted warning), or a Prisma 7 bug on Node 26 shows up.
