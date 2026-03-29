# @openzeppelin/ui-dev-cli

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
