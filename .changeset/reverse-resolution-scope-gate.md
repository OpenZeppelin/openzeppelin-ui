---
"@openzeppelin/ui-renderer": minor
---

Reverse-resolution display gate in `AddressNameResolutionProvider` now keys on the chain-agnostic base `ResolutionProvenance.scopedToNetworkId` (absent = global/mainnet identity, shows on any network-bound row; present and not equal to the row network = network-local, withheld), replacing the prior wallet-active-network vs row-network suppression. Display-only; no public API change. Complements openzeppelin-adapters 002, which emits `scopedToNetworkId`.
