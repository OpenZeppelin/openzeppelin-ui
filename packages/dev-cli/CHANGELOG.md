# @openzeppelin/ui-dev-cli

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
