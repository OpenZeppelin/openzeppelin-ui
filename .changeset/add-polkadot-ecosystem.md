---
"@openzeppelin/ui-types": minor
---

Add Polkadot ecosystem support

- Add 'polkadot' to Ecosystem union type
- Add `isPolkadotEcosystem` type guard
- Add `PolkadotNetworkConfig` interface extending EVM config with Polkadot-specific fields:
  - `executionType`: 'evm' | 'substrate' for future extensibility
  - `networkCategory`: 'hub' | 'parachain' for UI grouping
  - `relayChain`: optional 'polkadot' | 'kusama' identifier
- Add `isPolkadotNetworkConfig` type guard
- Add helper types: `PolkadotExecutionType`, `PolkadotNetworkCategory`, `PolkadotRelayChain`
