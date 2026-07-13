# @openzeppelin/ui-cli

## 1.0.0

### Major Changes

- [#183](https://github.com/OpenZeppelin/openzeppelin-ui/pull/183) [`c9cb666`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c9cb666bbdec80408948ee53b5d9fc96c486bb4c) Thanks [@pasevin](https://github.com/pasevin)! - Raise the minimum supported Node.js to `>=22.13.0`.

  The monorepo toolchain moved to pnpm 11, which requires Node 22+. Consumers
  running these packages on Node 20 must upgrade to Node 22.13.0 or later.

## 0.0.2

### Patch Changes

- [#171](https://github.com/OpenZeppelin/openzeppelin-ui/pull/171) [`0abe1fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0abe1fb233d4f3ab1793fae873f79a9d4ec8a861) Thanks [@pasevin](https://github.com/pasevin)! - chore(deps): resolve Dependabot security alerts for transitive dependencies

  Update the workspace `pnpm` overrides so vulnerable transitive dependencies resolve to patched versions:
  - `protobufjs` &rarr; `^7.6.3` (was pinned to `^7.5.5`, still allowed `7.6.x` advisories)
  - `ws` &rarr; `^8.21.0` for the v8 line and `^7.5.11` for the v7 line (was `^8.20.1`)
  - `hono` &rarr; `^4.12.25`
  - `form-data` &rarr; `^4.0.6` (CRLF injection)
  - `ua-parser-js` &rarr; `^2.0.10` (ReDoS)
  - `js-yaml` (v4) &rarr; `^4.2.0` (quadratic-complexity DoS)
  - `uuid` &rarr; `^11.1.1` (missing buffer bounds check)
  - `esbuild` &rarr; `^0.28.1` (dev-server arbitrary file read)
  - `@babel/core` &rarr; `^7.29.6` (arbitrary file read via `sourceMappingURL`)

  `elliptic` (`<= 6.6.1`) has no published fix and remains; it is a low-severity advisory with no upstream patch available.

  These overrides only affect dependency resolution within this monorepo's lockfile and do not change the published packages' declared dependency ranges.

## 0.0.1

### Patch Changes

- [#138](https://github.com/OpenZeppelin/openzeppelin-ui/pull/138) [`058fd18`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/058fd18c89d2e0c63185b7e14d4bb37df14f3073) Thanks [@pasevin](https://github.com/pasevin)! - Publish `@openzeppelin/ui-cli` (`oz-ui`) to npm: consumer CLI for migration and related workflows, with documentation and packaged assets under `packages/cli`.
