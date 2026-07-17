# Cross-Network Fallback — API Reference

Complete reference for the initiative `003` public surface across UIKit packages.
Signatures match `@openzeppelin/ui-types@3.3.0` and dependent releases.

---

## `@openzeppelin/ui-types`

### `ResolutionProvenance` (extended)

Chain-agnostic provenance on every `ResolvedName` / `ResolvedAddress`. Three **new**
optional readonly fields (additive minor `3.3.0`):

```ts
export interface ResolutionProvenance {
  readonly label: string;
  readonly external: boolean;
  readonly scopedToNetworkId?: string;

  /** `true` only after bound-network miss + cross-network consult (opt-in ON). */
  readonly resolvedViaNetworkFallback?: boolean;

  /** Network where the record was found (e.g. `ethereum-mainnet`). Present only when flag is `true`. */
  readonly resolvedOnNetworkId?: string;

  /** Bound network that missed first (e.g. `ethereum-sepolia`). Present only when flag is `true`. */
  readonly queriedOnNetworkId?: string;
}
```

**Triplet integrity (runtime contract, not type-enforced):**

| `resolvedViaNetworkFallback` | `queriedOnNetworkId` | `resolvedOnNetworkId` | Valid |
|-----------------------------|----------------------|----------------------|-------|
| `true` | non-empty | non-empty | Yes — canonical fallback |
| `true` | missing/empty | any | No |
| `undefined` / `false` | absent | absent | Yes — non-fallback |
| `undefined` / `false` | present | any | No — orphan ids |

**Golden fixture (reverse Sepolia miss-fallback):**

```ts
const provenance: ResolutionProvenance = {
  label: 'ENS',
  external: false,
  // scopedToNetworkId intentionally absent (002 D-R7)
  resolvedViaNetworkFallback: true,
  queriedOnNetworkId: 'ethereum-sepolia',
  resolvedOnNetworkId: 'ethereum-mainnet',
};
```

**INV-4:** `keyof ResolutionProvenance` is exactly:

`'label' | 'external' | 'scopedToNetworkId' | 'resolvedViaNetworkFallback' | 'resolvedOnNetworkId' | 'queriedOnNetworkId'`

---

### `NameResolutionRuntimeOptions`

```ts
export interface NameResolutionRuntimeOptions {
  /**
   * When `true`, permits EVM mainnet-L1 miss-fallback after a definitive bound-chain miss.
   * Field name locked to adapter `CreateNameResolutionOptions.enableMainnetL1MissFallback`.
   * Only `=== true` enables; absent/`false` → OFF.
   */
  readonly enableMainnetL1MissFallback?: boolean;
}
```

---

### `CreateRuntimeOptions`

```ts
export interface CreateRuntimeOptions {
  readonly uiKit?: string;
  readonly nameResolution?: NameResolutionRuntimeOptions;
}
```

Passed as the third argument to `EcosystemExport.createRuntime(profile, networkConfig, options?)`.

---

### `NetworkLabelResolver`

```ts
export type NetworkLabelResolver = (networkId: string) => string | undefined;
```

Optional on `AddressNameResolver.resolveNetworkLabel` for humanized disclaimer copy.
Returns `undefined` when unknown — callers fall back to slug interpolation or generic copy.

---

## `@openzeppelin/ui-utils`

All helpers in `nameResolutionFallback.ts`. **Read only base provenance fields** — no
adapter ENS imports.

### `isCrossNetworkFallback(provenance): boolean`

Returns `true` when provenance carries a **complete** fallback triplet:
`resolvedViaNetworkFallback === true` and both network ids are non-empty strings.

Returns `false` for:

- absent or `false` flag
- orphan ids without the flag
- incomplete triplet (`true` but missing either id)
- bound-local records without fallback flag

---

### `getFallbackNetworks(provenance): CrossNetworkFallbackNetworks | undefined`

```ts
export interface CrossNetworkFallbackNetworks {
  readonly queriedOnNetworkId: string;
  readonly resolvedOnNetworkId: string;
}
```

Extracts both ids when `isCrossNetworkFallback` would be `true`; otherwise `undefined`.

---

### `networkDisplayName(networkId, resolveLabel?): string`

Resolves a repo `networkConfig.id` slug to a display string. Falls back to the raw
`networkId` when the resolver is absent or returns empty. Never throws.

---

### `nameResolutionCrossNetworkFallbackMessage(ctx, names?): string`

Mechanism-neutral disclaimer string. **Informational only** — not part of the error taxonomy.

| Condition | Template |
|-----------|----------|
| Both `queriedNetworkName` and `resolvedNetworkName` non-empty | `Name not found on {queried}, but found on {resolved}.` |
| Either name missing | `Name not found on the connected network, but found on another network.` |

---

### `crossNetworkFallbackMessageNames(networks, resolveLabel?)`

Builds the optional name pair for `nameResolutionCrossNetworkFallbackMessage`. When a
resolver is wired, returns trimmed labels (may be `undefined` → generic copy). When
absent, passes repo slugs for interpolated copy.

---

### Exported types

```ts
export type NetworkLabelResolver = (networkId: string) => string | undefined;
export type CrossNetworkFallbackProvenance = Pick<
  ResolutionProvenance,
  'resolvedViaNetworkFallback' | 'queriedOnNetworkId' | 'resolvedOnNetworkId'
>;
export interface CrossNetworkFallbackMessageContext extends CrossNetworkFallbackNetworks {
  readonly queriedNetworkName?: string;
  readonly resolvedNetworkName?: string;
}
```

---

## `@openzeppelin/ui-react`

### `DEFAULT_RUNTIME_CREATION_CONFIG`

```ts
export const DEFAULT_RUNTIME_CREATION_CONFIG: CreateRuntimeOptions = {};
```

Empty object = miss-fallback **OFF**, no `uiKit` override.

---

### `isMainnetL1MissFallbackEnabled(options?): boolean`

```ts
return options?.enableMainnetL1MissFallback === true;
```

Strict-enable normalizer at the UIKit threading boundary.

---

### `createResolveRuntime(ecosystemDefinition, params): ResolveRuntimeFn`

```ts
export interface ResolveRuntimeParams {
  readonly profile: ProfileName;
  readonly options?: CreateRuntimeOptions;
}

export type ResolveRuntimeFn = (networkConfig: NetworkConfig) => Promise<EcosystemRuntime>;
```

Pure factory for `RuntimeProvider`. Forwards `CreateRuntimeOptions` to
`ecosystemDefinition.createRuntime`. When opt-in is OFF, omits the `nameResolution`
slice entirely (never passes `enableMainnetL1MissFallback: false`).

---

### `useResolveRuntime(ecosystemDefinition, params): ResolveRuntimeFn`

Memoized `createResolveRuntime`. Recomputes when `profile`, `uiKit`, or
`enableMainnetL1MissFallback` changes. **Changing the returned function identity
triggers `RuntimeProvider` registry flush** (INV-218).

---

### `RuntimeProvider` (behavior contract)

No new props. When `resolveRuntime` **identity** changes, the provider:

1. Disposes every cached runtime in the registry
2. Clears loading / failed-network tracking
3. Schedules deferred `dispose()` on evicted instances

This makes dynamic opt-in toggles safe.

**Explicitly NOT on these APIs:** `enableMainnetL1MissFallback` on `NameResolutionProvider`,
`useResolveName`, `AddressDisplay`, or `AddressField`.

---

## `@openzeppelin/ui-components`

### `AddressDisplay`

No new public props. When a reverse record is visible (`ensName` on screen) and
`isCrossNetworkFallback(record.provenance)` is true, renders a tertiary `role="note"`
line below the hex row with `nameResolutionCrossNetworkFallbackMessage`.

Reads `resolveNetworkLabel` from `AddressNameContext` (via `AddressNameProvider`).

**No disclaimer when:** explicit `label` prop wins over ENS name, `disableLabel`, hex-only
branch, incomplete triplet, or bound-local / non-fallback provenance.

---

### `AddressField`

On the `resolved` outcome arm (forward path), when chain-scope is not blocked and
`isCrossNetworkFallback(resolution.data.provenance)` is true, renders a muted
`role="note"` line under the frozen *"Resolved to `0x…`"* template.

Reads `resolveNetworkLabel` from `NameResolverProvider` context.

---

### `NameResolverProvider` / `AddressNameProvider`

Optional `resolveNetworkLabel?: NetworkLabelResolver` on context value for humanized
network names in disclaimer copy.

---

## `@openzeppelin/ui-renderer`

### `AddressNameResolutionProvider`

```ts
export interface AddressNameResolutionProviderProps {
  readonly address: string | null | undefined;
  readonly networkId?: string;
  readonly options?: UseResolveAddressOptions;
  readonly resolveNetworkLabel?: NetworkLabelResolver;
  readonly children: React.ReactNode;
}
```

Forwards `resolveNetworkLabel` to `AddressNameProvider`. **Scope-gate callback unchanged**
— still `isChainScopeMismatch` / `scopedToNetworkId` only.

### `TransactionForm`

Reference wiring: `resolveNetworkLabel` from `activeRuntime.networkCatalog` when available.
