# 0013. Test the frontend with Vitest + React Testing Library and Playwright smoke tests

- Status: Accepted
- Date: 2026-11-11

## Context

Phase 1 needs tests for every package. The backend has unit and integration tests (ADR 0010). The frontend (Next.js 16 App Router, React 19, static export) had no tests and no `test` script. It is still almost empty, so the value of this step is the setup: when the first real components arrive, writing their tests should need no further decisions.

Two kinds of failure need covering:

- A component renders or behaves wrongly. This needs fast, isolated tests that run on every change.
- The built site is broken even though every component is fine: a hydration error, a missing asset, a bad `next.config.js` or export setting. Only loading the production build in a real browser catches these. Unit-level tools also cannot render async Server Components, and Next.js recommends end-to-end tests for those.

Verified on 2026-11-11:

- Vitest 5.0.5 (already used by the backend), jsdom 31, React Testing Library 16.3, `@testing-library/jest-dom` 7 and `@playwright/test` 1.65 all support Node 26.
- Vite 8, which Vitest 5 runs on, transforms JSX with Oxc using tsconfig's `jsx` setting, and reads tsconfig `paths` natively with `resolve.tsconfigPaths`. Neither `@vitejs/plugin-react` nor `vite-tsconfig-paths` is needed for tests.
- The frontend package is CommonJS (no `"type": "module"`). Vite warns that its upcoming native config loader will treat ESM syntax in a `.ts` config as CommonJS, so the config is `vitest.config.mts`.
- `serve` 14.2.7 pins `compression` to exactly 1.8.1, which has a high advisory (GHSA-vc2v-76pw-4v95). Our audit gate (ADR 0011) failed on it and `pnpm audit --fix=update` cannot fix an exact pin. `sirv-cli` 3 has a small dependency tree with caret ranges and passes the audit.
- Locally, the component test takes about 2 s. `pnpm test:e2e` (build plus one browser test) takes about 16 s.

## Options

### Component tests: DOM environment

- **jsdom (chosen):** the most complete DOM implementation in Node. It is the default in the Testing Library and Next.js examples, so most documentation and answers to problems assume it. Slower than happy-dom, which does not matter at this size.
- **happy-dom:** faster, but implements less of the spec. Tests can then pass in happy-dom and fail in a browser, or the other way round.
- **Vitest Browser Mode (real browser):** the most accurate, but heavier: it needs a browser in every `pnpm test` run. Worth it once components depend on layout, CSS or browser APIs that jsdom does not implement.

### Component tests: runner

- **Vitest (chosen):** already the backend's runner, so one test API, one config style and one set of mocking tools across the monorepo. It is native ESM and TypeScript.
- **Jest:** still common in existing Next.js projects, but it needs a separate transform setup for TypeScript and ESM, and would be a second runner in the repository.

### Browser tests

- **Playwright smoke tests against the static export (chosen):** builds the production site, serves `dist/` as plain files the way S3 and CloudFront will (ADR 0004), and checks it in Chromium. The test runner is the industry standard for new projects, and it has traces, auto-waiting and parallel runs built in.
- **Cypress:** a mature alternative, but it runs inside the browser. Multi-tab, multi-origin and parallel runs are harder or paid.
- **No browser tests until Phase 2:** cheaper now, but the first deploy would be the first time the built site is loaded at all.

## Decision

- **Component tests** in `packages/frontend`: Vitest with `environment: 'jsdom'`, React Testing Library and `@testing-library/jest-dom` matchers, configured in `vitest.config.mts` and `vitest.setup.ts`. Files are named `*.test.tsx` and placed next to the component (`src/**/*.test.{ts,tsx}`), like the backend's unit tests. Tests query by role and accessible name rather than class names or DOM structure. `pnpm test` runs them, so the `Verify` job runs them with no workflow change.
- **Explicit imports** (`import { describe, it, expect } from 'vitest'`) instead of Vitest globals, matching the backend. Because of that, React Testing Library does not unmount after each test automatically, so `vitest.setup.ts` calls `cleanup()` in `afterEach`.
- **Vitest moves to the pnpm `catalog:`**, because two packages now use it.
- **E2E smoke tests:** Playwright with Chromium only, in `packages/frontend/e2e/*.spec.ts`. `pnpm test:e2e` runs `next build` and then `playwright test`. Playwright's `webServer` serves `dist/` with `sirv-cli` on `127.0.0.1:4310`, always as a fresh server, because sirv caches the file list at startup and a server from an earlier build would 404 new chunks. The first test checks the home page's status, title and heading, and fails on any uncaught exception or console error. It waits for `networkidle` before checking errors, because the heading is in the static HTML and is visible before React hydrates. That wait is a stopgap until a client component can set an explicit hydration signal.
- **Playwright in CI** runs with `forbidOnly`, 2 retries (a test that passes on retry is reported as flaky, not hidden), a trace of each first retry, and the `github` reporter. The HTML report, with the traces, is uploaded as an artifact on every run that was not cancelled, so a flaky test that passed on retry still has its trace. It is kept 7 days.
- **CI job `E2E tests`** runs in parallel with the other jobs. It installs only `chromium-headless-shell` and its OS libraries (`playwright install --with-deps --only-shell chromium`), does not cache browsers (following Playwright's advice), and builds the frontend again instead of reusing `Verify`'s build through artifacts. At this size the build takes less time than the artifact round trip.
- **Required check:** `E2E tests` is added to the `main` ruleset in `infra/github/ruleset.tf` (ADR 0012). It is applied after this change is merged, so that the job exists on `main` before it is required.

## Consequences

- Each layer of the test pyramid now has a home: unit and component tests in `pnpm test`, database tests in `pnpm test:integration`, browser tests in `pnpm test:e2e`. All three run on every PR.
- New components get a colocated `*.test.tsx`. Async Server Components and anything that depends on the build are tested in `e2e/` instead.
- Running E2E locally requires a one-time `pnpm --filter frontend exec playwright install chromium` (the browser goes to `~/.cache/ms-playwright`, not the repository). On a fresh Linux or WSL machine, add `--with-deps` for the OS libraries, which uses `sudo`.
- CI gets a fourth parallel job, adding about 1–2 minutes of runner time per run. Each new required job also means a ruleset change; a single summary check would avoid that (see Revisit when).
- `sirv` does not serve Next's `404.html` for unknown paths, so 404 behaviour is not tested here. It depends on the CloudFront configuration and belongs to Phase 2 tests.
- Two required checks (`Verify` and `E2E tests`) now build the frontend, and `next/font/google` downloads the font from Google Fonts at build time. An outage there blocks merges. Switching to `next/font/local` removes that dependency.
- The E2E job tests its own build, not the artifact that `Verify` built or that will be deployed. That is acceptable without deployment, but not in Phase 2 (see Revisit when).

## Revisit when

- Components depend on real layout, CSS or browser APIs: move those tests to Vitest Browser Mode with the Playwright provider.
- The UI is worth testing across engines: add the `firefox` and `webkit` projects.
- The E2E suite grows past a few minutes: shard it across jobs (`--shard`, merged with the blob reporter).
- CD exists (Phase 2): build once, run the E2E tests against that exact artifact, and deploy the same artifact.
- `apt` installs from `--with-deps` become slow or flaky: run the job in the official `mcr.microsoft.com/playwright` image, pinned by digest and updated together with `@playwright/test`.
- The site is deployed (Phase 2): run the same suite against a preview or staging URL after deployment, by setting `baseURL` from the environment.
- The number of required checks keeps growing: replace them in the ruleset with one summary job that `needs` all the others.
