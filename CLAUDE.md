# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

pnpm workspace monorepo (boilerplate for JS full-stack development). Every directory under `packages/` is a workspace package (`pnpm-workspace.yaml` uses `packages/**`). Currently the only package is `packages/frontend`, a Next.js 14 App Router app in TypeScript + SCSS. Requires Node >= 20 and pnpm >= 9.

## Commands

Use pnpm, not npm/yarn. Run from the repo root:

```bash
pnpm install                          # install all workspace deps
pnpm frontend-start                   # = pnpm --filter frontend dev (next dev)
pnpm --filter frontend build          # static export into packages/frontend/dist
pnpm --filter frontend lint           # next lint (ESLint)
pnpm format / pnpm format:fix         # prettier check / write
```

There is no test framework set up; the `test` scripts are placeholders that exit with an error. Use `lint` and `build` to verify changes.

Note: `prettier` itself is not listed in any `devDependencies` (only `eslint-config-prettier`), so `pnpm format` needs prettier installed first.

## Frontend architecture (`packages/frontend`)

- **Static export**: `next.config.js` sets `output: 'export'` and `distDir: 'dist'`. There is no Node server at runtime, so don't use server-only features (API routes, `headers()`/`cookies()`, dynamic routes without `generateStaticParams`, ISR, middleware, default image optimization).
- **Page extensions** are limited to `tsx`, `ts`, `mdx`. A `.js`/`.jsx` file in `src/app` won't be picked up as a route.
- **SVG imports** go through `@svgr/webpack`, so `import Icon from './icon.svg'` returns a React component, not a URL.
- **Stylelint runs inside the webpack build** (`StylelintPlugin`), so SCSS lint errors show up in `dev`/`build` output. Config: `stylelint-config-standard-scss` + `stylelint-order`.
- **Sass include path** is `packages/frontend/styles` (directory does not exist yet). Shared SCSS partials placed there can be imported by bare name.
- **Path aliases** (in `packages/frontend/tsconfig.json`): `@src/*`, `@app/*`, `@components/*`, `@data/*`, `@hooks/*`, `@utils/*`, `@lib/*` map to `src/<name>/*`; `@root/*` maps to the package root. Use these instead of long relative imports and put new code in the matching `src/` folder.
- TypeScript: the root `tsconfig.json` has `strict: true`, but the frontend `tsconfig.json` overrides it with `strict: false`.

## Code style

- Prettier (`packages/frontend/.prettierrc.json`): 4-space indent, single quotes (including in JSX), semicolons, `trailingComma: es5`.
- ESLint: root `.eslintrc.json` extends `next/babel`, `next/core-web-vitals`, `prettier`; the frontend config just extends the root.
