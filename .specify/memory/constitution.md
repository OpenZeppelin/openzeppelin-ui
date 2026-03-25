<!--
Sync Impact Report
Version: 1.0.1 → 1.0.2
Modified Principles:
- Section I: Swapped layers 5 and 6 (ui-react → Layer 5, ui-renderer → Layer 6) to reflect actual dependency graph
Templates:
- ✅ No template updates needed
Follow-up TODOs: none
-->

# OpenZeppelin UI Constitution

## Core Principles

### I. Library-First Architecture (NON-NEGOTIABLE)

- Every package in this monorepo MUST be a self-contained, independently publishable npm package under the `@openzeppelin/ui-*` namespace.
- Packages MUST follow the established layering hierarchy:
  - Layer 1: `@openzeppelin/ui-types` — Type definitions only, no runtime code
  - Layer 2: `@openzeppelin/ui-utils` — Framework-agnostic utilities
  - Layer 3: `@openzeppelin/ui-styles` — Tailwind CSS theme and variables
  - Layer 4: `@openzeppelin/ui-components` — React UI primitives (shadcn/ui based)
  - Layer 5: `@openzeppelin/ui-react` — React context providers and hooks (wallet state, adapter context)
  - Layer 6: `@openzeppelin/ui-renderer` — Contract UI rendering (forms, state widgets, transaction status)
  - Layer 7: `@openzeppelin/ui-storage` — IndexedDB storage abstraction
- Lower-layer packages MUST NOT depend on higher-layer packages; circular dependencies are forbidden.
- Each package MUST have its own README and version managed via Changesets (CHANGELOGs are auto-generated on release).
- Rationale: Enables consuming applications (UI Builder, Role Manager, external apps) to import only the packages they need, minimizing bundle size and dependency overhead.

### II. Chain-Agnostic Design (NON-NEGOTIABLE)

- This library MUST remain entirely chain-agnostic; all blockchain-specific logic, dependencies, and polyfills belong exclusively in adapter packages (maintained in consuming repositories like `ui-builder`).
- Packages MUST NOT import or reference any chain-specific SDKs (ethers, viem, web3.js, @stellar/sdk, etc.).
- Type definitions in `@openzeppelin/ui-types` define adapter interfaces (`ContractAdapter`, `NetworkConfig`, etc.) that adapters implement; the library consumes these interfaces without implementing chain behavior.
- Validation utilities MUST accept chain-agnostic callbacks or adapter methods; do not hardcode address formats or chain rules.
- Rationale: Preserves ecosystem neutrality, allowing the library to support EVM, Stellar, Solana, and future chains without modification.

### III. Type Safety & API Stability (NON-NEGOTIABLE)

- TypeScript strict mode MUST be enabled across all packages; `any` types are disallowed without explicit, documented justification.
- Public APIs (exported functions, types, components) MUST include JSDoc annotations describing purpose, parameters, return values, and usage examples.
- Exported types MUST be stable; breaking changes require a major version bump with migration documentation.
- `console` usage in source code is prohibited; use `logger` from `@openzeppelin/ui-utils` (exceptions only in tests, examples, or scripts).
- React components MUST be typed with explicit props interfaces; hooks MUST have explicit return types.
- Rationale: Ensures predictable consumption by downstream projects and enables reliable IntelliSense/documentation generation.

### IV. Design System Ownership (NON-NEGOTIABLE)

- `@openzeppelin/ui-styles` is the single source of truth for the OpenZeppelin design system used across all consuming applications.
- Styling leverages Tailwind CSS v4 with CSS custom properties for theming; all design tokens MUST be defined in `@openzeppelin/ui-styles`.
- `@openzeppelin/ui-components` builds on shadcn/ui primitives; new components MUST follow existing patterns and use the `cn` utility for class composition.
- Icon usage MUST prefer `lucide-react`; avoid emojis or inline SVG when reusable icon components exist.
- Component styling MUST use standard Tailwind tokens; arbitrary values require documented justification.
- Rationale: Guarantees visual consistency across UI Builder, Role Manager, and exported applications.

### V. Testing & Documentation (NON-NEGOTIABLE)

- Vitest is the standard test runner for all packages; each package MUST have its own `vitest.config.ts` extending the shared config.
- All exported utilities, services, and business logic MUST have unit tests; aim for meaningful coverage, not 100% line coverage.
- React components SHOULD have tests for complex logic; visual verification is done through example apps in `examples/`.
- Package READMEs MUST include:
  - Installation instructions
  - Basic usage examples
  - API reference or link to generated docs
  - Peer dependency requirements
- Rationale: Ensures reliability for downstream consumers and reduces onboarding friction for contributors.

### VI. Packaging & Release Management (NON-NEGOTIABLE)

- `pnpm` is the sole package manager; use `pnpm -r` for workspace commands.
- Build outputs use `tsdown` for bundling and type generation; all packages MUST ship both ESM and CJS formats with proper `exports` configuration.
- Versioning relies on Changesets; every PR affecting package functionality MUST include a changeset file describing the change type (major/minor/patch) and summary.
- Releases are triggered by merging the automated Changesets PR; CI publishes to npm after tests, linting, and type checks pass.
- Package `exports` MUST explicitly define entry points; avoid barrel exports that cause tree-shaking issues.
- Rationale: Maintains reproducible builds, enables independent package versioning, and ensures consumers can upgrade selectively.

### VII. Consumer-First Development (NON-NEGOTIABLE)

- API design MUST prioritize ease of use for consuming applications; complex internal logic MUST NOT leak into public interfaces.
- Breaking changes to public APIs MUST:
  - Be discussed in an issue or RFC before implementation
  - Include migration documentation in the package CHANGELOG
  - Update the migration guide at `docs/MIGRATION.md` if affecting cross-package changes
- New features SHOULD be designed with the UI Builder and Role Manager use cases in mind; validate designs against real consumer scenarios.
- Local development against consumer repos MUST be supported via the shared `oz-dev init` bootstrap flow, which writes `.openzeppelin-dev.json` and configures `.pnpmfile.cjs` hooks.
- Rationale: This library exists to serve consuming applications; their needs drive design decisions.

## Additional Constraints

- **Dependencies**: Peer dependencies (React, Tailwind) MUST be declared, not bundled; keep runtime dependencies minimal.
- **No Chain Code**: Do not add chain-specific polyfills, SDKs, or utilities—these belong in adapter packages in consumer repositories.
- **Single Source of Truth**: Shared types MUST live in `@openzeppelin/ui-types`; do not duplicate type definitions across packages.
- **Logging**: Use structured, level-based logging via `logger` from `@openzeppelin/ui-utils`; logging is disabled by default outside development.
- **Security**: Do not hardcode secrets or credentials; library code MUST NOT make network requests except through consumer-provided callbacks.

## Development Workflow and Review Process

- Use `pnpm` for all tasks (`pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`).
- Run `pnpm fix-all` before committing to format and lint-fix all packages.
- Commit messages MUST follow Conventional Commits; scopes include: `types`, `utils`, `styles`, `components`, `renderer`, `react`, `storage`, `deps`, `config`, `ci`, `docs`, `tests`, `release`, `examples`, `common`.
- PRs MUST:
  - Pass all CI checks (tests, lint, typecheck)
  - Include a changeset for package changes
  - Have at least one approval before merge
- Code review enforces:
  - Package layering compliance (no upward dependencies)
  - Chain-agnostic design (no blockchain SDK imports)
  - API stability (no unannounced breaking changes)
  - Documentation for new public APIs
- **Local Consumer Testing**: Test changes against `ui-builder` and `role-manager` using the local dev workflow before merging significant changes.

## Governance

- This constitution supersedes other practices for architecture, quality, and workflow standards; non-negotiable rules MUST be enforced during development and review.
- Amendments require:
  - A documented proposal (issue or PR description)
  - Updates to relevant docs/READMEs
  - Migration notes if affecting consumers
  - Approval via PR review
- Breaking changes demand:
  - A changeset with major version bump
  - Explicit upgrade notes in CHANGELOG
  - Updated `docs/MIGRATION.md`
  - Coordination with consuming repository maintainers
- CI enforces compliance; PRs violating constitutional rules MUST be corrected before merge.
- Version Policy:
  - MAJOR: Breaking changes to public APIs
  - MINOR: New features, non-breaking additions
  - PATCH: Bug fixes, documentation improvements

**Version**: 1.0.2 | **Ratified**: 2026-01-06 | **Last Amended**: 2026-01-06
