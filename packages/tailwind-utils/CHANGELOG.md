# @openzeppelin/ui-tailwind-utils

## 1.0.0

### Major Changes

- [#183](https://github.com/OpenZeppelin/openzeppelin-ui/pull/183) [`c9cb666`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c9cb666bbdec80408948ee53b5d9fc96c486bb4c) Thanks [@pasevin](https://github.com/pasevin)! - Raise the minimum supported Node.js to `>=22.13.0`.

  The monorepo toolchain moved to pnpm 11, which requires Node 22+. Consumers
  running these packages on Node 20 must upgrade to Node 22.13.0 or later.

## 0.1.1

### Patch Changes

- [#138](https://github.com/OpenZeppelin/openzeppelin-ui/pull/138) [`549a438`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/549a438b14e55a21d279330709fc0c1031a251cf) Thanks [@pasevin](https://github.com/pasevin)! - Publish `@openzeppelin/ui-tailwind-utils` on npm so `@openzeppelin/ui-dev-cli` can resolve its runtime dependency outside the monorepo.
