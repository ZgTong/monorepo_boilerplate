# Backend (packages/backend)

Express 5 + TypeScript (ESM, `module: nodenext`) + Prisma 7 on PostgreSQL.

## Commands (from repo root)

```bash
docker compose up -d postgres            # local DB; needs root .env (copy .env.example)
pnpm --filter backend dev                # tsx watch, loads packages/backend/.env
pnpm --filter backend typecheck
pnpm --filter backend test               # vitest
pnpm --filter backend exec vitest run src/app.test.ts   # single test file
pnpm --filter backend build              # tsc -> dist/
pnpm --filter backend db:migrate --name <change>        # create + apply migration locally
pnpm --filter backend db:generate        # regenerate client (also runs on postinstall)
```

## Structure and conventions

- `src/app.ts` builds the Express app (`createApp()`), `src/server.ts` only calls `listen`. Tests import `createApp()` directly with supertest, so keep `app.ts` free of side effects.
- `src/db.ts` is the single PrismaClient, created with the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an adapter). Import `prisma` from there.
- Prisma 7 specifics: the CLI reads `prisma.config.ts` (which loads `.env` via dotenv), the datasource URL lives there and not in `schema.prisma`, and the client is generated into `src/generated/prisma` (git-ignored). Import types and the client from `./generated/prisma/client.js`.
- Relative imports need the `.js` extension.
- The app does not load `.env` itself. `dev` passes `--env-file-if-exists`, and in AWS the variables come from the ECS task definition. Required: `DATABASE_URL`; optional: `PORT` (default 4000).
- `/health` is the liveness check for the ALB and must not touch the DB; `/health/db` checks DB connectivity.
- Production runtime is Node 24 LTS (Prisma 7 does not support Node 26).
