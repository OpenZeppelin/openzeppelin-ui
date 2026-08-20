# @openzeppelin/ui-cli

## 2.0.0

### Major Changes

- [#210](https://github.com/OpenZeppelin/openzeppelin-ui/pull/210) [`f7498bc`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f7498bce0eb6952dd08c516b16147b08a28c05d8) Thanks [@pasevin](https://github.com/pasevin)! - Remove WalletConnect support entirely.

  WalletConnect's provider pulls in `@reown/appkit`, which moved to the Reown
  Community License at 1.8.3 — commercial fees above 500 monthly active users, a
  clause making it a material condition that all use connect to Reown's gateway, and
  a confidentiality clause. Pinning is a dead end: every non-deprecated
  `@walletconnect/ethereum-provider` release pins a community-licensed AppKit, and
  every release still pinning Apache-2.0 AppKit 1.7.8 is deprecated on npm.

  ## Breaking changes
  - **`@openzeppelin/ui-utils`** — `AppConfigService` no longer reads
    `VITE_APP_CFG_WALLETCONNECT_PROJECT_ID`. The generic
    `VITE_APP_CFG_SERVICE_<NAME>_<PARAM>` mechanism is unchanged, so if you still
    need an arbitrary service value you can express it that way; nothing in the
    stack consumes a WalletConnect project ID any more.
  - **`@openzeppelin/ui-cli`** — `oz-ui init` no longer writes a
    `globalServiceConfigs.walletconnect.projectId` placeholder into
    `public/app.config.json`, nor documents it in `app.config.json.example`.
    `oz-ui migrate init` no longer tells you to set a WalletConnect project ID.
    `detectWalletEcosystem()` no longer returns `hasWalletConnect` — that field was
    already computed and never consumed.

  Remove any `globalServiceConfigs.walletconnect` entry from your `app.config.json`;
  it is inert.

  ## Other changes
  - **`@openzeppelin/ui-dev-cli`** — the generated `.pnpmfile.cjs` now also strips
    `@walletconnect/ethereum-provider` from `@wagmi/connectors`, and
    `@walletconnect/modal` plus `sign-client` from the Stellar wallets kit, alongside
    the existing Trezor strip. Without this, regenerating a consumer repo's hook
    would silently drop the WalletConnect strip and quietly reintroduce
    `@reown/appkit`.
  - `GlobalServiceConfigs` no longer uses WalletConnect as its docstring example.

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
