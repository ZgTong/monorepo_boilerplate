# 0006. Standardise on TypeScript 6.0 across the workspace

- Status: Accepted
- Date: 2026-11-03

## Context

The workspace had drifted to two TypeScript majors: the frontend pinned `typescript@5.4.5` and the backend used `typescript@^7.0.2`. Phase 1 of the roadmap adds shared lint configuration to every package, which means `typescript-eslint` everywhere (the frontend already gets it through `eslint-config-next`).

Verified on 2026-11-03:

- `typescript-eslint@8.72.1` (the version in the lockfile) declares the peer range `typescript: >=4.8.4 <6.1.0`. With TS 7.0.2 installed, ESLint crashes with `typescript-eslint does not support TS 7.0.`
- `typescript@7.0.2` (the native Go port) exposes only `version` from its main entry point. `createProgram` is undefined, and the compiler API is published only under `typescript/unstable/*`. Tools built on the TypeScript compiler API cannot target TS 7 until that API is stable.
- `tsc --noEmit` and `next build` succeed on TS 7.0.2. Only the lint toolchain is blocked.
- On `typescript@6.0.3`, the frontend passes `tsc`, `eslint` and `next build`, and the backend passes `typecheck`, `test` and `build`. The frontend first needs `baseUrl` removed from `tsconfig.json`, with `paths` made relative (`./src/*`). TS 6 reports `baseUrl` as deprecated, and TS 7 removes it.

Not verified: the TypeScript team's timeline for a stable TS 7 API, and whether Next.js 16 officially supports TS 7.

## Options

### TypeScript 6.0 in every package (chosen)

- Pros: the whole toolchain supports it (Next.js, typescript-eslint, tsx, vitest), and every package uses one compiler with the same behaviour. TS 6 is the bridge release: it reports every option and behaviour that TS 7 removes, so code that compiles cleanly on 6.0 is ready for 7. Version management stays simple.
- Cons: the backend loses the native compiler's speed. On a codebase this size the difference is negligible, but it would matter at scale. The backend also takes a major-version downgrade.

### TypeScript 6.0 in the frontend, 7.0 in the backend

- Pros: the backend keeps fast native type checking.
- Cons: two compilers can disagree on diagnostics, so the same code may pass in one package and fail in the other. Shared lint config in Phase 1 would force the backend back to 6.0 anyway. Debugging and onboarding get harder.

### TypeScript 7.0 everywhere, dropping typescript-eslint

- Pros: newest compiler, fastest builds.
- Cons: loses type-aware lint rules and the `eslint-config-next/typescript` rule set. It also works against the Phase 1 lint baseline. Not a realistic production setup.

### TypeScript 6.0 for linting, TS 7 (`tsc`) as a separate fast type checker

- Pros: fast type checks with the lint toolchain still working.
- Cons: two TypeScript installs per package to keep in sync, and diagnostics may differ between them. That complexity is not justified at this project's size.

## Decision

Use `typescript@~6.0.3` in every workspace package. The tilde range allows only 6.0.x patches. TypeScript does not follow strict semver, and typescript-eslint caps support at `<6.1.0`, so a caret range would let `pnpm update` pull in 6.1 and break lint.

The owner's position is that ecosystem compatibility is TS 7's job: it has to ship a stable programmatic API before downstream tools can be expected to support it. We will not work around the gap. If tools add TS 7 support on their own before then, that also unblocks the upgrade.

## Consequences

- The frontend `tsconfig.json` drops `baseUrl`, and its `paths` entries are relative (`./src/*`).
- The frontend's `@types/node` is raised from 20.12.8 to `^26` to match the backend and the Node 26 runtime (ADR 0005). `pnpm dedupe` then moved the backend's transitive `@types/*` packages (Express, pg, supertest) off a leftover `@types/node@20.12.8`, so the lockfile now holds a single `@types/node` version. `skipLibCheck` had been hiding the mismatch.
- Phase 1 can add typescript-eslint to the backend without a compiler change.
- Follow-up: consider a pnpm `catalog:` for `typescript` and `@types/node` so each version is defined once and cannot drift between packages again, and run `pnpm dedupe --check` in CI.

## Revisit when

- TypeScript 7 ships its compiler API outside `typescript/unstable/*`, and typescript-eslint releases a version whose peer range includes `typescript@7`, or
- typescript-eslint adds TS 7 support on its own, or
- typescript-eslint widens its peer range to include TypeScript 6.1 or later (then relax the `~6.0` pin).
