# 0002. Use Express 5 and Prisma 7 for the backend

- Status: Accepted
- Date: 2026-10-18

## Context

The backend is a TypeScript HTTP API on PostgreSQL. The owner knows Express and wants to modernise their skills without the framework hiding fundamentals.

## Options

### HTTP framework

- **Express 5 (chosen):** the most widely deployed Node framework, and v5 natively forwards rejected promises from async handlers to the error handler. It is minimal, so validation, structure and error handling are done explicitly, which is good for learning. Cons: slower than Fastify, and has no built-in schema validation or DI.
- **Fastify:** faster, with built-in JSON-schema validation and serialisation. Cons: a different plugin model to learn.
- **NestJS:** opinionated structure and DI, popular in enterprise. Cons: heavy abstraction hides the fundamentals this project wants to practise.

### Data access

- **Prisma 7 (chosen):** declarative schema, generated type-safe client, and migrations. v7 is pure TypeScript with driver adapters (`@prisma/adapter-pg`), so there is no Rust query engine binary. Cons: complex SQL needs `$queryRaw` or TypedSQL.
- **Drizzle:** closer to SQL and lighter. Cons: smaller ecosystem.
- **Knex / raw SQL:** full control. Cons: everything, including typing, is manual.

## Decision

Express 5 + Prisma 7 with the pg driver adapter, as ESM TypeScript (`module: nodenext`).

## Consequences

- Request validation (e.g. Zod) and error-handling middleware must be added explicitly (Phase 3).
- `createApp()` is kept free of side effects so tests can exercise it in-process with supertest.

## Revisit when

Profiling shows framework overhead matters (consider Fastify), or Prisma blocks a needed query pattern.
