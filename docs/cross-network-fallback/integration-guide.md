# Cross-Network Fallback — Integration Guide

How to adopt initiative `003` in a UIKit-consuming dapp: opt-in wiring, disclaimer
behavior, and humanized network labels. **Default posture is OFF** — cross-network
resolution and copy only activate when you explicitly enable them and the linked adapter
supports the option.

## How the pieces connect

```text
Integrator config (default OFF)
        │  useResolveRuntime / createResolveRuntime
        │  options.nameResolution.enableMainnetL1MissFallback === true
        ▼
RuntimeProvider → ecosystemDefinition.createRuntime(profile, network, options)
        │  adapter-evm threads opt-in into createNameResolution (adapter 003)
        ▼
NameResolutionCapability (immutable opt-in for this instance)
        │  settled ResolvedName / ResolvedAddress + provenance triplet
        ▼
isCrossNetworkFallback (ui-utils) → AddressDisplay / AddressField disclaimer
        │  optional resolveNetworkLabel for human names
        ▼
"Name not found on …, but found on …"
```

**Principle II fence:** the disclaimer path never imports adapter ENS types. Classification
uses `resolvedViaNetworkFallback` and the two network ids only.

---

## Prerequisites

1. **`@openzeppelin/ui-types@^3.3.0`** (and bumped dependent UIKit packages).
2. **Linked `adapter-evm` on adapter initiative `003`** for end-to-end miss-fallback.
   Before that, UIKit opt-in wiring is type-safe but **inert** — `createRuntime` accepts
   options; older adapters ignore the `nameResolution` slice.
3. **`RuntimeProvider` + `WalletStateProvider`** above forms and display surfaces (same
   as existing ENS integration).
4. **No display-level opt-in flag.** Do not add `enableMainnetL1MissFallback` to
   `AddressDisplay`, `AddressField`, or `NameResolutionProvider` — those layers consume
   provenance on settled results only.

---

## Pattern 1: Safe default — opt-in OFF (no changes)

If you omit runtime creation options, behavior matches pre-003 UIKit:

```tsx
import { RuntimeProvider, useResolveRuntime } from '@openzeppelin/ui-react';

const resolveRuntime = useResolveRuntime(evmEcosystemDefinition, {
  profile: 'composer',
  // options omitted → DEFAULT_RUNTIME_CREATION_CONFIG → miss-fallback OFF
});

<RuntimeProvider resolveRuntime={resolveRuntime}>
  <WalletStateProvider getNetworkConfigById={getNetwork} initialNetworkId="ethereum-sepolia">
  </WalletStateProvider>
</RuntimeProvider>
```

- Adapter miss-fallback stays **OFF**.
- No cross-network disclaimer appears (no triplet on results).
- Existing `002` scope-gate behavior unchanged.

This is the recommended posture unless your product explicitly accepts cross-network
ENS lookup risk.

---

## Pattern 2: Static opt-in ON

Enable miss-fallback for all users / deployments with a compile-time or deploy-time flag:

```tsx
const resolveRuntime = useResolveRuntime(evmEcosystemDefinition, {
  profile: 'composer',
  options: {
    nameResolution: { enableMainnetL1MissFallback: true },
  },
});
```

Or without React:

```ts
import { createResolveRuntime } from '@openzeppelin/ui-react';

const resolveRuntime = createResolveRuntime(evmEcosystemDefinition, {
  profile: 'composer',
  options: { nameResolution: { enableMainnetL1MissFallback: true } },
});
```

When the adapter returns a complete triplet, reverse `AddressDisplay` and forward
`AddressField` show the disclaimer automatically — no extra display props.

---

## Pattern 3: Dynamic toggle (example app reference)

The `examples/basic-react-app` demonstrates a user-facing checkbox wired through
`CreateRuntimeOptions`. Role Manager and other first-party apps mirror this with their
own config source.

**1. Hold opt-in state and build options (omit slice when OFF):**

```tsx
const [enableMainnetL1MissFallback, setEnableMainnetL1MissFallback] = useState(false);

const runtimeCreationOptions = useMemo((): CreateRuntimeOptions | undefined => {
  if (!enableMainnetL1MissFallback) return undefined;
  return { nameResolution: { enableMainnetL1MissFallback: true } };
}, [enableMainnetL1MissFallback]);
```

**2. Thread options into `resolveRuntime`:**

```tsx
const resolveRuntime = useCallback(
  (networkConfig) => getRuntime(networkConfig, runtimeCreationOptions),
  [runtimeCreationOptions]
);

<RuntimeProvider resolveRuntime={resolveRuntime}>…</RuntimeProvider>
```

When the checkbox flips, `resolveRuntime` identity changes → `RuntimeProvider` flushes
all cached runtimes → fresh capabilities pick up the new opt-in posture.

**3. Surface the toggle in product UI** (example: `ENSResolutionDemo`):

```tsx
<label htmlFor="ens-mainnet-l1-miss-fallback-opt-in">
  <input
    id="ens-mainnet-l1-miss-fallback-opt-in"
    type="checkbox"
    checked={enabled}
    onChange={(e) => setEnabled(e.target.checked)}
  />
  Allow mainnet fallback when name not found on connected network
</label>
```

Helper copy should explain that an unobtrusive note appears when results carry fallback
provenance — not a mechanism badge or v2/CCIP chrome.

See `examples/basic-react-app/src/providers/AppProviders.tsx` and
`examples/basic-react-app/src/components/ENSResolutionDemo.tsx` for the full reference.

---

## Pattern 4: Humanized network labels

Disclaimer copy interpolates human names when **both** resolve. Wire
`resolveNetworkLabel` on the resolver contexts:

### Reverse display

```tsx
const resolveNetworkLabel = useCallback(
  (id: string) => networks.find((n) => n.id === id)?.name,
  [networks],
);

<AddressNameResolutionProvider
  address={entry.address}
  networkId={entry.networkId}
  resolveNetworkLabel={resolveNetworkLabel}
>
  <AddressDisplay address={entry.address} networkId={entry.networkId} />
</AddressNameResolutionProvider>
```

### Forward input

```tsx
<NameResolverProvider
  {...resolver}
  activeNetworkId={walletState?.activeNetworkId ?? null}
  activeNetworkName={walletState?.activeNetworkConfig?.name}
  resolveNetworkLabel={(id) => runtime.getNetworkById(id)?.name}
>
  <AddressField name="recipient" />
</NameResolverProvider>
```

### Without `resolveNetworkLabel`

Disclaimer still renders with **generic copy**:

*"Name not found on the connected network, but found on another network."*

Raw slugs are used for interpolation only when no resolver is wired (slug-interpolated
copy path in `crossNetworkFallbackMessageNames`).

---

## Pattern 5: Custom classifier / copy (advanced)

Prefer the shipped helpers over inline provenance checks:

```ts
import {
  getFallbackNetworks,
  isCrossNetworkFallback,
  nameResolutionCrossNetworkFallbackMessage,
  crossNetworkFallbackMessageNames,
} from '@openzeppelin/ui-utils';

function formatDisclaimer(provenance: ResolutionProvenance, resolveLabel?: NetworkLabelResolver) {
  if (!isCrossNetworkFallback(provenance)) return undefined;
  const networks = getFallbackNetworks(provenance);
  if (!networks) return undefined;
  return nameResolutionCrossNetworkFallbackMessage(
    networks,
    crossNetworkFallbackMessageNames(networks, resolveLabel)
  );
}
```

**Do not:**

```ts
// WRONG — Principle II violation
if (provenance.label === 'ENS' && !provenance.scopedToNetworkId) { … }

// WRONG — orphan ids without flag
if (provenance.queriedOnNetworkId && provenance.resolvedOnNetworkId) { … }
```

---

## Display behavior vs scope gate (002)

| Situation | Name visible? | Disclaimer? |
|-----------|---------------|-------------|
| Fallback triplet, absent `scopedToNetworkId` | Yes (002 D-R7) | Yes |
| Bound-local `scopedToNetworkId` matches row | Yes | No |
| `scopedToNetworkId` mismatches row | Suppressed / gated | No |
| Incomplete triplet (`true` but missing id) | Per 002 rules | No (classifier false) |
| Opt-in OFF | Per normal resolution | No triplet → no disclaimer |

The disclaimer never overrides `isChainScopeMismatch` submit gating on `AddressField`.

---

## Common mistakes

- **Passing `enableMainnetL1MissFallback: false` explicitly.** UIKit omits the slice when
  OFF; passing `false` is unnecessary and some adapter paths treat absent vs false
  differently. Use omitted options or `useResolveRuntime` without `nameResolution`.
- **Opt-in on `NameResolutionProvider`.** Factory config belongs at `createRuntime` time,
  not on hook cache config.
- **Expecting disclaimer without opt-in ON + adapter 003.** Types and display are ready;
  triplet emission requires the adapter branch.
- **Toggling opt-in without changing `resolveRuntime` identity.** Stale cached capabilities
  would violate SC-004 — always go through `useResolveRuntime` or a memoized callback that
  depends on opt-in state.
- **Branching on `provenance.label` for fallback.** Use `isCrossNetworkFallback` only.
- **Confusing with `AddressBookWidget.enableNameResolution`.** That prop gates whether the
  widget uses ENS at all — orthogonal to mainnet-L1 miss-fallback.

---

## Migration from `ui-types@3.2.x`

**No breaking changes.** New provenance fields are optional readonly additions. Existing
code that ignores them continues to compile.

Integrators who relied on pre-003 always-on adapter L1 behavior (workspace branches) must
set `enableMainnetL1MissFallback: true` explicitly after upgrading — UIKit default matches
adapter safe OFF.

**Cross-repo:** after `ui-types@3.3.0` publishes, raise adapter `003` dependency floor to
`^3.3.0` before expecting triplet emission in production.

---

## Release checklist (SF-5)

1. Merge changesets → `changeset version` generates package CHANGELOGs.
2. Publish **`@openzeppelin/ui-types@3.3.0` first**.
3. Publish dependent UIKit packages in the same release train.
4. Bump `openzeppelin-adapters` `003` to `ui-types@^3.3.0` and merge emission Code.
5. Verify E2E on Sepolia with opt-in ON: name visible + disclaimer + scope gate green.
