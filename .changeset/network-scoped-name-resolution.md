---
'@openzeppelin/ui-react': minor
'@openzeppelin/ui-renderer': minor
---

Add optional network-scoped ENS resolution so forward and reverse lookups can follow a selected network (e.g. Address Book Add Alias dropdown) without switching the wallet-global active network.

`useRuntimeNameResolver(scopedNetwork?)` and `useResolveAddress(..., { network })` load the target runtime via `RuntimeProvider.getRuntimeForNetwork`, sharing the same SF-2 cache keys (INV-119). `AddressNameResolutionProvider`, `ResolvedAddressFieldPreviewWithNameResolution`, and `AddAliasDialog` accept an optional `network` prop. Deprecated aliases: `useNetworkNameResolver`, `useNetworkResolveAddress`.
