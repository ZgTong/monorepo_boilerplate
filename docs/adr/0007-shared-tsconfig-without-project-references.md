# 0007. Share one strict tsconfig base without project references

- Status: Accepted
- Date: 2026-11-03

## Context

Phase 1 requires strict TypeScript in every package. Before this change, the root `tsconfig.json` set `strict`, `composite` and an `include` covering the whole repo, but no package extended it, so none of it applied. The frontend ran with `strict: false`, and the backend repeated its own flags. Strictness was defined in several places and had already drifted.

The two packages are independent applications. Neither imports from the other, and there is no shared library package yet. The frontend is a Next.js app that type-checks with `noEmit`. The backend emits JavaScript with `tsc -p tsconfig.build.json`.

## Options

### Shared `tsconfig.base.json` that packages extend, checked per package (chosen)

- Pros: one place for strictness and module-safety flags, and each package keeps only its own target, module system and output settings. Next.js reads the inherited options without rewriting the file (verified with `next build`). No emit or declaration requirements are added. Easy to understand and to debug with `tsc --showConfig`.
- Cons: `pnpm typecheck` (`pnpm -r typecheck`) runs one `tsc` per package, with no build graph or cross-package incremental cache. That costs nothing at the current size, but checking is not incremental across packages.

### Base config plus TypeScript project references (`composite`, `tsc -b`)

- Pros: incremental builds across packages and correct ordering once packages depend on each other. This is the standard setup for large TypeScript monorepos.
- Cons: `composite` requires declaration output, which conflicts with the Next app's `noEmit`, so it would need workarounds such as `emitDeclarationOnly` into a throwaway directory. With no cross-package imports, the build graph would bring no benefit, and it adds tsbuildinfo and output bookkeeping to every package.

### Shared config as an internal workspace package (for example `@repo/tsconfig`)

- Pros: versioned like any other dependency, and it fits the internal-package pattern we may use for shared ESLint config.
- Cons: an extra package that holds one JSON file. A relative `extends` path does the same job inside one repo.

## Decision

Add a root `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `isolatedModules`, `verbatimModuleSyntax`, `moduleDetection: force`, `esModuleInterop`, `resolveJsonModule` and `skipLibCheck`. Every package extends it, and packages do not relax its flags. The dead root `tsconfig.json` is removed.

Do not use project references yet. Leave `exactOptionalPropertyTypes` off for now, because it adds a lot of friction with third-party types while the codebase is still mostly scaffolding.

This also completes the ADR 0006 follow-up: `typescript` and `@types/node` are now defined once, in the `catalog:` section of `pnpm-workspace.yaml`.

## Consequences

- The frontend is now under `strict` and `noUncheckedIndexedAccess`. Indexed access returns `T | undefined` and must be narrowed.
- The generated Prisma client (`packages/backend/src/generated`) is type-checked under the same flags. If a future Prisma release fails them, exclude the generated directory from type checking rather than loosening the base.
- `packages/backend/prisma.config.ts` is outside the backend's `include` (`src`), so it is not type-checked.

## Revisit when

- A shared workspace package (types, API contracts, UI) is imported by another package. At that point, add project references and `tsc -b`.
- `pnpm typecheck` takes more than about a minute locally or in CI.
- The codebase has real domain code, and we want to evaluate `exactOptionalPropertyTypes`.
