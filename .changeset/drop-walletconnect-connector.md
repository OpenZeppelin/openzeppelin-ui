---
'@openzeppelin/ui-cli': major
'@openzeppelin/ui-utils': major
'@openzeppelin/ui-dev-cli': minor
'@openzeppelin/ui-types': patch
---

Remove WalletConnect support entirely.

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
