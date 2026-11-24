import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import { baseConfig } from './base.js';

/**
 * For Next.js apps: Next's React, hooks, a11y and Core Web Vitals rules on top of the base config.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function nextConfig({ tsconfigRootDir }) {
    return defineConfig([
        nextVitals,
        baseConfig({ tsconfigRootDir }),
        // Playwright writes reports and traces (bundled JS) into these; never lint them.
        globalIgnores([
            '.next/**',
            'next-env.d.ts',
            'playwright-report/**',
            'test-results/**',
            'blob-report/**',
        ]),
    ]);
}
