# Cross-Network ENS Fallback (Initiative 003)

> When a name is missing on the connected network but found elsewhere, UIKit surfaces
> honest provenance and an unobtrusive disclaimer — only if the integrator explicitly
> opts in. Default posture is **OFF**.

## Overview

This release (`@openzeppelin/ui-types@3.3.0` and dependent UIKit packages) adds
**chain-agnostic** support for cross-network L1 miss-fallback in ENS name resolution.
The adapter may return a success whose provenance carries a **fallback triplet**:
`resolvedViaNetworkFallback`, `queriedOnNetworkId`, and `resolvedOnNetworkId`. UIKit
classifies that triplet using **base `ResolutionProvenance` fields only** (Principle II —
no ENS adapter types, no `label` branching, no mechanism badges).

**It is for** dapp integrators on UIKit who want optional mainnet-L1 fallback when a
name is not registered on the bound testnet/L2, and for adapter authors who depend on
the published provenance contract. **It does the** type contract, pure classifiers,
informational display copy, and runtime opt-in wiring. **It does not do** adapter
resolution ladders, L1 consult logic, or triplet emission — that lives in
`openzeppelin-adapters` initiative `003`.

The single most important integration point: **`enableMainnetL1MissFallback` on
`CreateRuntimeOptions` at `createRuntime` time, default OFF.** Omit the flag (or leave
it unset) and the adapter never performs miss-fallback. Set it to `true` explicitly and
resolution + disclaimer can activate together when the linked adapter supports the
option.

## Quick Start

Upgrade the UIKit packages (versions ship together via changeset):

```bash
pnpm add @openzeppelin/ui-types@^3.3.0 \
         @openzeppelin/ui-utils@^3.3.0 \
         @openzeppelin/ui-react@^3.2.0 \
         @openzeppelin/ui-components@^3.5.0 \
         @openzeppelin/ui-renderer@^3.3.0
```

**Safe default — no code changes required.** Existing apps keep miss-fallback OFF.
Names resolve on the bound network only; no cross-network disclaimer appears.

**Explicit opt-in** — thread the flag when building runtimes:

```tsx
import { RuntimeProvider, useResolveRuntime } from '@openzeppelin/ui-react';
import { evmEcosystemDefinition } from '@openzeppelin/adapter-evm';

function App() {
  const resolveRuntime = useResolveRuntime(evmEcosystemDefinition, {
    profile: 'composer',
    options: {
      nameResolution: { enableMainnetL1MissFallback: true },
    },
  });

  return (
    <RuntimeProvider resolveRuntime={resolveRuntime}>
      {/* WalletStateProvider, forms, AddressDisplay, etc. */}
    </RuntimeProvider>
  );
}
```

When the adapter returns a complete fallback triplet on a settled result, UIKit shows an
unobtrusive note such as *"Name not found on Ethereum Sepolia, but found on Ethereum
Mainnet."* on `AddressDisplay` (reverse) and under the resolved line on `AddressField`
(forward). Scope-gate behavior from initiative `002` is unchanged — the disclaimer is
**additive copy**, not a suppression gate.

## Key Concepts

| Concept | What to remember |
|--------|------------------|
| **Fallback triplet** | `resolvedViaNetworkFallback === true` plus non-empty `queriedOnNetworkId` and `resolvedOnNetworkId`. Incomplete triplets → no disclaimer (adapter bug, not UI guess). |
| **Principle II** | Classifiers and display read **only** base provenance fields. Never `isEnsProvenance`, `coinType`, or `provenance.label`. |
| **`scopedToNetworkId` orthogonality** | L1-fallback hits keep **absent** scope (002 parity). Name still renders on the bound row; disclaimer explains the lookup path. |
| **Opt-in vs disclaimer** | Opt-in enables adapter behavior at factory time. Disclaimer appears when triplet is **on the result** — display does not read the opt-in flag. |
| **Default OFF** | `undefined`, `false`, or omitted `nameResolution` → adapter miss-fallback OFF. Only `=== true` enables. |

## Package map

| Package | Version (this release) | What changed |
|---------|------------------------|--------------|
| `@openzeppelin/ui-types` | **3.3.0** | Fallback provenance fields; `CreateRuntimeOptions` / `NameResolutionRuntimeOptions`; `NetworkLabelResolver` on `AddressNameResolver` |
| `@openzeppelin/ui-utils` | **3.3.0** | `isCrossNetworkFallback`, `getFallbackNetworks`, copy helpers |
| `@openzeppelin/ui-components` | **3.5.0** | Disclaimer on `AddressDisplay` / `AddressField`; `resolveNetworkLabel` on resolver contexts |
| `@openzeppelin/ui-renderer` | **3.3.0** | `resolveNetworkLabel` on `AddressNameResolutionProvider`; `TransactionForm` reference wiring |
| `@openzeppelin/ui-react` | **3.2.0** | `useResolveRuntime`, `createResolveRuntime`, registry flush on opt-in toggle |

**Release order:** publish `ui-types@3.3.0` before adapter `003` raises its dependency
floor to `^3.3.0`.

## API Reference

See [api-reference.md](./api-reference.md).

## Integration Guide

See [integration-guide.md](./integration-guide.md) for opt-in patterns, label wiring,
and the example-app reference toggle.

## Safety

- **Default OFF is the safe posture.** UIKit never enables miss-fallback implicitly from
  `ensL1Client` wiring or L1 client presence. Integrators must pass
  `enableMainnetL1MissFallback: true` explicitly.
- **Only `=== true` counts.** `false` and `undefined` are normalized to OFF; UIKit omits
  the `nameResolution` slice entirely when OFF (never passes `enableMainnetL1MissFallback:
  false` to the adapter).
- **Opt-in is frozen per capability instance.** Toggling requires a new `resolveRuntime`
  callback identity; `RuntimeProvider` flushes all cached runtimes (INV-218) so stale
  capabilities cannot serve the wrong posture.
- **Disclaimer is informational, not a gate.** Unlike chain-scope mismatch, cross-network
  fallback copy does not block submit on the forward path.
- **Classify from base fields only.** Do not infer fallback from absent
  `scopedToNetworkId`, `external`, or `label` — use `isCrossNetworkFallback`.
- **Adapter dependency.** Opt-in wiring is type-safe before adapter `003` ships; behavior
  is inert until the linked `adapter-evm` threads the option into `createNameResolution`.

## Related

- **ENS address input (`001` SF-3):** forward resolution field — disclaimer extends the
  resolved success arm.
- **Address display (`001` SF-4, `002` scope gate):** reverse display — disclaimer is a
  tertiary line when the ENS name is visible.
- **Sibling repo:** `openzeppelin-adapters` initiative `003` owns L1 miss-fallback
  ladders and triplet emission.

## License

Inherits the repository license (see the repo root `LICENSE`).
