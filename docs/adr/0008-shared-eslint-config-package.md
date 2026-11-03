# 0008. Share ESLint config through an internal workspace package

- Status: Accepted
- Date: 2026-11-03

## Context

Phase 1 requires the same lint standard in every package. Only the frontend had ESLint (Next.js rules, not type-aware), and the backend had none. With strict TypeScript now on everywhere (ADR 0007), type-aware rules such as `no-floating-promises` can catch bugs that `tsc` lets through, for example an un-awaited Prisma call.

Verified on 2026-11-03 with ESLint 9.39.5, typescript-eslint 8.72.1 and eslint-config-next 16.4.4:

- Next's `core-web-vitals` config and typescript-eslint's `strictTypeChecked` compose in one flat config without plugin conflicts.
- Probe files confirmed that `no-floating-promises`, `no-explicit-any`, `react-hooks/rules-of-hooks`, `jsx-a11y/alt-text` and `@next/next/no-img-element` all report.

ESLint stays on 9 because `eslint-plugin-react` (pulled in by `eslint-config-next`) does not declare ESLint 10 support.

## Options

### Internal package `@repo/eslint-config` with config factories (chosen)

- Pros: one owner for the rules. Each package declares the shared config as a dependency, so the dependency graph shows exactly who uses what, and each package can be linted on its own. This is the standard pattern in large monorepos (Turborepo, Vercel), and it shows how workspace packages depend on each other (`workspace:*`). Factories (`nodeConfig({ tsconfigRootDir })`) let each package pass its own tsconfig root, which type-aware linting needs.
- Cons: one more package to maintain. Plugin dependencies live in the config package, so every consumer installs the Next plugins too. That is a dev-only cost.

### Single root `eslint.config.mjs` with per-directory overrides

- Pros: one file, nothing to wire up.
- Cons: it grows with every package. Linting a package from inside its own directory depends on the root config being found. Packages can't move to different ESLint majors independently, and ownership is less clear.

### Each package keeps its own full config

- Pros: maximum independence.
- Cons: duplicated rules that drift apart, which is exactly what Phase 1 is meant to remove.

## Decision

Create `packages/eslint-config` (`@repo/eslint-config`, private) exporting `baseConfig`, `nodeConfig` and `nextConfig`:

- **Base:** `@eslint/js` recommended, typescript-eslint `strictTypeChecked` + `stylisticTypeChecked` with `projectService`, `consistent-type-imports` + `no-import-type-side-effects` (to pair with `verbatimModuleSyntax`), `no-unused-vars` ignoring `^_`-prefixed names, unused disable directives reported as errors, type checking disabled for plain JS config files, and `eslint-config-prettier` last.
- **Next:** `eslint-config-next/core-web-vitals` followed by the base config. `eslint-config-next/typescript` is not used, because the base's typescript-eslint presets are a strict superset of it.
- Two deliberate deviations from the presets:
    - `restrict-template-expressions` allows numbers. Every other `allow*` option is set explicitly to `false`, because ESLint rule options replace the preset's options instead of merging with them. Passing only `{ allowNumber: true }` silently re-enabled `any`, boolean, nullish and RegExp values. A review probe caught this.
    - `dot-notation` is satisfied by enabling `noPropertyAccessFromIndexSignature` in `tsconfig.base.json`, so `process.env['X']` stays bracketed and visibly "may be missing".

`eslint` is defined in the pnpm catalog. Every package lints with `--max-warnings 0`.

## Consequences

- The backend gains linting. Its `tsconfig.json` now includes `prisma.config.ts`, which brings that file under typecheck too. `rootDir: src` and `include: ["src"]` moved into `tsconfig.build.json`, which keeps the emitted `dist/` layout unchanged.
- Any new `.ts` file outside a package's tsconfig `include` makes type-aware lint fail. That is intentional, because it keeps "every TS file is type-checked" true.
- Type-aware linting is slower than syntactic linting. That is negligible at the current size.
- `no-img-element` will warn for any `<img>`, and warnings fail lint. Static export has no default Next image optimisation, so the first real images need a decision: a custom loader, or an explicit, commented rule override.

## Revisit when

- `eslint-plugin-react` / `eslint-config-next` support ESLint 10: upgrade the catalog entry.
- A package needs a different ESLint major or a rule set that conflicts with the base: add a new factory rather than forking the config.
- Lint time in CI exceeds about a minute: consider ESLint caching (`--cache`) or a task runner cache.
