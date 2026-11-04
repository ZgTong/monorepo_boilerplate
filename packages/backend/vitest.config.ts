import { configDefaults, defineConfig } from 'vitest/config';

// Two projects (ADR 0010):
// - unit: fast, no I/O, runs in `pnpm test` and the CI Verify job.
// - integration: *.int.test.ts against a real PostgreSQL started by Testcontainers,
//   runs in `pnpm test:integration` and its own CI job. Needs Docker.
export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['src/**/*.test.ts'],
                    exclude: [
                        ...configDefaults.exclude,
                        'src/**/*.int.test.ts',
                    ],
                },
            },
            {
                test: {
                    name: 'integration',
                    include: ['src/**/*.int.test.ts'],
                    // Project-level, so the container only starts when integration tests run.
                    globalSetup: ['./test/integration/global-setup.ts'],
                    setupFiles: ['./test/integration/setup-env.ts'],
                    testTimeout: 15_000,
                    hookTimeout: 30_000,
                },
            },
        ],
    },
});
