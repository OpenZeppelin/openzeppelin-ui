---
'@openzeppelin/ui-dev-cli': minor
---

The generated `.pnpmfile.cjs` now also strips `@metamask/sdk` from `@wagmi/connectors`,
alongside the existing WalletConnect and Trezor strips.

`@metamask/sdk` is not open source. It ships a proprietary licence — "Copyright ConsenSys
Software Inc. 2022. All rights reserved" — granting only a non-exclusive, non-transferable
licence for **Non-Commercial Use**, whose clause 2 requires any Resulting Program to carry that
same restriction forward. The OpenZeppelin adapters are AGPL-3.0, which forbids conveying the
work under added restrictions, so the two cannot both be satisfied.

The conflict is structural rather than a threshold question — it does not depend on any monthly
active user count — and there is no clean version to pin: no published version of
`@metamask/sdk` declares a `license` field at all. The same 2715-byte licence file ships in
`@metamask/sdk`, `@metamask/sdk-communication-layer` and `@metamask/sdk-install-modal-web`.

`@wagmi/connectors` declares `@metamask/sdk` as a **hard dependency**, not an optional peer, so
it installed whether or not a `metaMask()` connector was registered. Dropping the connector
alone is not sufficient, hence the hook.

The strip targets that one package name exactly, **not** the `@metamask/*` scope. Most of that
scope is MIT or ISC (`utils`, `providers`, `json-rpc-engine`, `rpc-errors`, `superstruct`,
`sdk-analytics`, …) and is legitimately required transitively; a scope-wide strip would break
far more than it fixes.

**Consumer repositories must regenerate their hook** (`oz-ui-dev init`, or by copying the
generated file) to pick this up, and will also need a bundler alias pointing `@metamask/sdk` at
a local stub — `@wagmi/connectors` re-exports an unreachable `metaMask` module containing
`await import('@metamask/sdk')`, and Rollup resolves dynamic imports at build time, so without
the alias the production build fails with "Rollup failed to resolve import".
