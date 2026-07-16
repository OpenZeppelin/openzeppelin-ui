# Changelog — Cross-Network Fallback (Initiative 003)

UIKit coordinated release. Versions are applied by `changeset version` on merge.

## `@openzeppelin/ui-types@3.3.0`

### Added

- **`ResolutionProvenance` cross-network fallback fields** (locked cross-repo shape):
  - `resolvedViaNetworkFallback?: boolean`
  - `queriedOnNetworkId?: string`
  - `resolvedOnNetworkId?: string`
- **`CreateRuntimeOptions`** and **`NameResolutionRuntimeOptions`** with
  `enableMainnetL1MissFallback?: boolean` (default OFF when omitted).
- **`NetworkLabelResolver`** type on **`AddressNameResolver`** for disclaimer label injection.
- INV-4 updated: `keyof ResolutionProvenance` expands to six keys.

### Migration

Additive minor. Consumers on `3.2.x` compile unchanged. Read new fields only when building
fallback-aware UI.

---

## `@openzeppelin/ui-utils@3.3.0`

### Added

- **`isCrossNetworkFallback`** — complete triplet classifier (base fields only).
- **`getFallbackNetworks`** — extracts `queriedOnNetworkId` / `resolvedOnNetworkId`.
- **`networkDisplayName`**, **`nameResolutionCrossNetworkFallbackMessage`**,
  **`crossNetworkFallbackMessageNames`** — mechanism-neutral copy helpers.

---

## `@openzeppelin/ui-components@3.5.0`

### Added

- Cross-network fallback **disclaimer** on **`AddressDisplay`** (tertiary `role="note"` line)
  and **`AddressField`** (muted line under resolved success).
- Optional **`resolveNetworkLabel`** on **`NameResolverProvider`** and **`AddressNameProvider`**.

### Unchanged

- **`002` scope gate** — `isChainScopeMismatch` / `scopedToNetworkId` only; disclaimer is additive.

---

## `@openzeppelin/ui-renderer@3.3.0`

### Added

- **`resolveNetworkLabel`** prop on **`AddressNameResolutionProvider`**.
- Reference wiring in **`TransactionForm`** via `activeRuntime.networkCatalog`.

---

## `@openzeppelin/ui-react@3.2.0`

### Added

- **`createResolveRuntime`**, **`useResolveRuntime`**, **`DEFAULT_RUNTIME_CREATION_CONFIG`**,
  **`isMainnetL1MissFallbackEnabled`** — consumer opt-in runtime wiring (default OFF).

### Changed

- **`RuntimeProvider`** fully disposes cached runtimes when `resolveRuntime` identity changes
  (INV-218) — safe dynamic opt-in toggling.

### Migration

Wire `enableMainnetL1MissFallback: true` at `createRuntime` time when cross-network
miss-fallback is desired. Omit for safe default OFF.

---

## Cross-repo gate

Publish **`ui-types@3.3.0`** before `openzeppelin-adapters` initiative `003` raises its
`ui-types` floor. Adapter owns L1 miss-fallback ladders and triplet emission.
