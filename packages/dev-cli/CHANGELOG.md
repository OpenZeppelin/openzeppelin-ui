# @openzeppelin/ui-dev-cli

## 0.6.0

### Minor Changes

- [#138](https://github.com/OpenZeppelin/openzeppelin-ui/pull/138) [`dee027a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/dee027af1eb070715cd2811571c867b364573b00) Thanks [@pasevin](https://github.com/pasevin)! - Add `allowAdapterPrereleases` hook to the generated `.pnpmfile.cjs` so consumer
  apps can resolve pre-release adapter versions (e.g. `2.0.0-rc.1`) without manual
  pnpmfile edits. Uses correct caret semantics for `0.x` upper bounds.

### Patch Changes

- [#138](https://github.com/OpenZeppelin/openzeppelin-ui/pull/138) [`549a438`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/549a438b14e55a21d279330709fc0c1031a251cf) Thanks [@pasevin](https://github.com/pasevin)! - Publish `@openzeppelin/ui-tailwind-utils` on npm so `@openzeppelin/ui-dev-cli` can resolve its runtime dependency outside the monorepo.

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027) Thanks [@pasevin](https://github.com/pasevin)! - Fix local adapter development installs by resolving first-party workspace packages that are
  outside the public family package map. Derive pnpmfile family data from the canonical
  `STANDARD_FAMILIES` definition instead of maintaining a hardcoded duplicate. Also formalize
  partial `UiKitConfiguration` overrides in the public types and ensure wallet state initializes
  adapter-managed UI kits consistently.
- Updated dependencies [[`549a438`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/549a438b14e55a21d279330709fc0c1031a251cf)]:
  - @openzeppelin/ui-tailwind-utils@0.1.1

## 0.5.1

### Patch Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Fix local adapter development installs by resolving first-party workspace packages that are
  outside the public family package map. Derive pnpmfile family data from the canonical
  `STANDARD_FAMILIES` definition instead of maintaining a hardcoded duplicate. Also formalize
  partial `UiKitConfiguration` overrides in the public types and ensure wallet state initializes
  adapter-managed UI kits consistently.

## 0.5.0

### Minor Changes

- [#110](https://github.com/OpenZeppelin/openzeppelin-ui/pull/110) [`1ab4767`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/1ab476706b8d147bf74ac0302dcb0ec9fbd52693) Thanks [@pasevin](https://github.com/pasevin)! - Rename CLI binary from `oz-dev` to `oz-ui-dev` to scope the tool under the UI ecosystem namespace and avoid usurping the broader OpenZeppelin CLI namespace.

  Consumer apps must update their `package.json` scripts to reference `oz-ui-dev` instead of `oz-dev`.

## 0.4.0

### Minor Changes

- [#108](https://github.com/OpenZeppelin/openzeppelin-ui/pull/108) [`f9abe2c`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f9abe2cff5bd22e967f66069192715cdcab59ade) Thanks [@pasevin](https://github.com/pasevin)! - Add Tailwind doctor, fix, and print commands for consumer apps.

## 0.2.3

### Patch Changes

- [#102](https://github.com/OpenZeppelin/openzeppelin-ui/pull/102) [`932eb82`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/932eb82f939e0eae970fd7ce837a52e979c7a153) Thanks [@pasevin](https://github.com/pasevin)! - Update the local adapters development workflow to recognize the published
  `@openzeppelin/adapters-vite` helper package and align the example app with the
  new higher-level Vite integration API.

- [#106](https://github.com/OpenZeppelin/openzeppelin-ui/pull/106) [`ca20232`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/ca2023208e2bac98ddd62f47469e2eaa409a1913) Thanks [@pasevin](https://github.com/pasevin)! - Fix `oz-dev use local --json` so it emits clean machine-readable stdout while local package builds run.

## 0.2.2

### Patch Changes

- [#98](https://github.com/OpenZeppelin/openzeppelin-ui/pull/98) [`6a10c57`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6a10c57d4fb5a1d01dc7809a709ffef6f89b3d62) Thanks [@pasevin](https://github.com/pasevin)! - Stream build output to terminal during `use local` and verify dist freshness after build

## 0.2.1

### Patch Changes

- [#93](https://github.com/OpenZeppelin/openzeppelin-ui/pull/93) [`117d28f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/117d28fdd8eb2e934d2803e0e348e74a03a11242) Thanks [@pasevin](https://github.com/pasevin)! - Fix `use local` to rebuild internal workspace dependencies before packing

  The build step now uses pnpm's `<package>...` filter syntax to include
  transitive workspace dependencies. This ensures internal packages like
  `@openzeppelin/adapter-evm-core` are rebuilt before their consumers are
  bundled and packed, so source changes are always reflected in local dev.

## 0.2.0

### Minor Changes

- [#91](https://github.com/OpenZeppelin/openzeppelin-ui/pull/91) [`082de4f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/082de4f4792fc981654a13eb1a0b9361e3f4a70e) Thanks [@pasevin](https://github.com/pasevin)! - Prepare `@openzeppelin/ui-dev-cli` for npm publishing and switch generated consumer scripts to use the published CLI entrypoint.
