---
'@openzeppelin/ui-types': minor
---

Add cross-network fallback provenance fields and runtime creation options (initiative 003, SF-1 + SF-4 types).

`@openzeppelin/ui-types@3.3.0` extends the chain-agnostic base `ResolutionProvenance` with three additive optional readonly fields locked to the cross-repo adapters `003` contract: `resolvedViaNetworkFallback`, `queriedOnNetworkId`, and `resolvedOnNetworkId`. Network ids are present only when `resolvedViaNetworkFallback === true`. `scopedToNetworkId` remains orthogonal — L1-fallback hits keep absent scope per initiative `002` display parity. Existing consumers upgrading from `3.2.x` continue to compile without reading the new fields.

Also adds `CreateRuntimeOptions` / `NameResolutionRuntimeOptions` with `enableMainnetL1MissFallback?: boolean` (default OFF when omitted) and threads the options bag through `EcosystemExport.createRuntime`'s additive third argument. Exports optional `NetworkLabelResolver` on `AddressNameResolver` for humanized cross-network disclaimer copy (SF-3 display seam).
