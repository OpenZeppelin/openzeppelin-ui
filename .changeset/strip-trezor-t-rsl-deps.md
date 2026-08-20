---
'@openzeppelin/ui-dev-cli': patch
---

Strip the T-RSL-licensed Trezor stack from the generated `.pnpmfile.cjs` hook.

`@creit.tech/stellar-wallets-kit` hard-depends on `@trezor/connect-web` and
`@trezor/connect-plugin-stellar`, which together pull in 22 `@trezor/*` packages
licensed under the Trezor Reference Source License (T-RSL). T-RSL permits
"reference use" within the company only and excludes the right to distribute.

The generated hook now removes both dependencies from the kit's manifest during
resolution. Nothing reaches that code today: the kit's barrel does not
re-export `modules/trezor.module`, `allowAllModules()` returns only the eight
non-Trezor modules, and `trezor.module` is an isolated leaf. Bundle output is
unchanged; only the install tree shrinks.

Repos that run `oz-ui-dev init` pick this up when they regenerate their hook.
