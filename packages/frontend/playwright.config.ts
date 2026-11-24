import { defineConfig, devices } from '@playwright/test';

// End-to-end smoke tests (ADR 0013) against the production static export in dist/,
// served the way a CDN would serve it: plain files, no Next.js server.
// `pnpm test:e2e` builds first, so the tests never run against a stale dist/.

const isCI = Boolean(process.env['CI']);
// Not 4173 (Vite preview) or 3000 (next dev), so it never collides with another dev server.
const port = 4310;
const baseURL = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    // A stray test.only must not silently skip the rest of the suite in CI.
    forbidOnly: isCI,
    // Retries in CI only. A test that passes on retry is reported as "flaky", not hidden.
    retries: isCI ? 2 : 0,
    // CI: annotations on the PR diff plus an HTML report (uploaded as an artifact on failure).
    reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL,
        // A trace (DOM snapshots, network, console) for each failed first retry.
        trace: 'on-first-retry',
    },
    // Chromium only for now; add firefox and webkit when there is UI worth testing across engines.
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `sirv dist --port ${String(port)} --host 127.0.0.1 --quiet`,
        url: baseURL,
        // Always start a fresh server. sirv (without --dev) caches the file list at startup,
        // so a server left over from an earlier build would 404 the new hashed chunks.
        // It starts in well under a second, so reuse would save nothing.
        reuseExistingServer: false,
    },
});
