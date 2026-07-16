---
'@openzeppelin/ui-utils': minor
'@openzeppelin/ui-components': minor
'@openzeppelin/ui-renderer': minor
---

Add cross-network fallback disclaimer display (initiative 003, SF-2 + SF-3).

`@openzeppelin/ui-utils` adds pure classifiers `isCrossNetworkFallback` and `getFallbackNetworks` reading only base `ResolutionProvenance` fallback fields (Principle II — no ENS adapter imports), plus copy helpers `networkDisplayName`, `nameResolutionCrossNetworkFallbackMessage`, and `crossNetworkFallbackMessageNames` for mechanism-neutral disclaimer text.

`@openzeppelin/ui-components` surfaces the disclaimer when the complete fallback triplet is present. **Reverse (`AddressDisplay`):** a small amber `TriangleAlert` icon inline immediately after the verified name; the locked copy appears in a tooltip on hover and keyboard focus via a focusable button whose `aria-label` is the full message. **Forward (`AddressField`):** a muted `role="note"` line under the resolved success template. Both components expose `showCrossNetworkFallbackDisclaimer?: boolean` (default `true`) to suppress presentation entirely. Classification uses SF-2 helpers only; `002` scope-gate behavior (`isChainScopeMismatch` / `scopedToNetworkId`) is unchanged — the disclaimer is additive copy, not a suppression gate. Optional `resolveNetworkLabel` threads through `AddressNameProvider`, `NameResolverProvider`, and related context types.

`@openzeppelin/ui-renderer` forwards `resolveNetworkLabel` from `AddressNameResolutionProvider`; `TransactionForm` wires a reference resolver via `activeRuntime.networkCatalog`.
