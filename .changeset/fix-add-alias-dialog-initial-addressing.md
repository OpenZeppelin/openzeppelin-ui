---
'@openzeppelin/ui-renderer': patch
---

fix(renderer): resolve initial addressing in `AddAliasDialog` for the preselected network

`AddAliasDialog` previously seeded `activeAddressing` from the explicit
`addressing` prop only. When opened with a preselected network (via
`currentNetworkId` + `resolveNetwork`) and a `resolveAddressing` resolver, the
network-specific `AddressingCapability` was never applied until the user
manually changed the network selector. As a result, `AddressField` had no
network validator on first render and silently treated any non-empty input as
valid (e.g., accepting `"adad"` as a valid Stellar Testnet address).

The open-effect now also calls `resolveAddressing(initialNetwork)` and
`resolveAddressPlaceholder(initialNetwork)` when the matching resolvers are
provided, then re-triggers validation on the address field once the validator
is in place. Behavior with no `initialNetwork`, no resolvers, or an explicit
`addressing` default is preserved.
