import { execFileSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

// Same major as docker-compose.yml and RDS (ADR 0004): tests run on the production engine.
const POSTGRES_IMAGE = 'postgres:17';

// Runs once per `vitest --project integration` run, in the main process, before any
// worker starts. One container is shared by all integration test files.
export default async function setup(project: TestProject) {
    const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
    const databaseUrl = container.getConnectionUri();

    // Apply the committed migrations the same way a deployment does, so tests see the
    // real schema. An explicit DATABASE_URL wins over anything dotenv loads from .env.
    try {
        execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
            cwd: project.config.root,
            env: { ...process.env, DATABASE_URL: databaseUrl },
            stdio: 'inherit',
        });
    } catch (error) {
        // No teardown is registered yet, so stop the container here instead of
        // leaving it to the Ryuk reaper.
        await container.stop();
        throw error;
    }

    // Hand the URL to the workers; test/integration/setup-env.ts reads it with inject().
    project.provide('databaseUrl', databaseUrl);

    return async () => {
        await container.stop();
    };
}

declare module 'vitest' {
    export interface ProvidedContext {
        databaseUrl: string;
    }
}
