# @openzeppelin/ui-tailwind-utils

## 1.0.1

### Patch Changes

- [#214](https://github.com/OpenZeppelin/openzeppelin-ui/pull/214) [`ddd681e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/ddd681eaaeef9fc1e30645e84f1b0e471626979a) Thanks [@pasevin](https://github.com/pasevin)! - Ship the AGPL-3.0 licence text inside each published package.

  The repository has a root `LICENSE`, but npm does not walk up to the repository root
  when packing, and these packages declare narrow `files` arrays (`dist`,
  `README.md`). So every published tarball carried an AGPL-3.0 declaration in its
  `package.json` with no accompanying licence text — confirmed with
  `npm pack --dry-run`, which listed no `LICENSE` entry.

  Each published package now has its own copy, which npm includes automatically.

## 1.0.0

### Major Changes

- [#183](https://github.com/OpenZeppelin/openzeppelin-ui/pull/183) [`c9cb666`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c9cb666bbdec80408948ee53b5d9fc96c486bb4c) Thanks [@pasevin](https://github.com/pasevin)! - Raise the minimum supported Node.js to `>=22.13.0`.

  The monorepo toolchain moved to pnpm 11, which requires Node 22+. Consumers
  running these packages on Node 20 must upgrade to Node 22.13.0 or later.

## 0.1.1

### Patch Changes

- [#138](https://github.com/OpenZeppelin/openzeppelin-ui/pull/138) [`549a438`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/549a438b14e55a21d279330709fc0c1031a251cf) Thanks [@pasevin](https://github.com/pasevin)! - Publish `@openzeppelin/ui-tailwind-utils` on npm so `@openzeppelin/ui-dev-cli` can resolve its runtime dependency outside the monorepo.
