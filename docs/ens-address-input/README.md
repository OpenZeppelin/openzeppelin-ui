# ENS Address Input Resolution

> Type an ENS name into any address field, watch it resolve to a hex address inline,
> and submit the resolved hex — the form never carries the name, and never a hex the
> name hasn't actually resolved to.

## Overview

This feature makes the UIKit's **address field** accept an ENS name (`alice.eth`) as
well as a raw hex address. When a user types a name, the field resolves it inline
through the active network's adapter, shows the resolved `0x…` address in a dedicated
status region, and gates form submission until the name has resolved and still matches
what the user sees. A pasted hex address behaves exactly as it always has.

**It is for** teams building dapps on top of `@openzeppelin/ui-renderer`'s dynamic
forms (e.g. an ERC-20 transfer form), and for teams composing the base
`@openzeppelin/ui-components` `AddressField` directly. **It does the** forward,
input-side half of ENS support: name → address. **It does not do** reverse resolution /
avatars (that is the address-*display* component, SF-4 — a separate, synchronous seam),
the address book's add-by-ENS flow (SF-5). **SF-6** (shipped) adds mechanism-neutral
v2 UX on this same field: long-latency loading copy, an un-branded gateway-error
message, and a coinType wrong-network submit gate — **no** user-visible v2 / CCIP-Read /
provenance markers or badges.

The single most important thing to know: **ENS support lives in the base `AddressField`
itself and is activated by injecting a resolver through context.** Mount a
`NameResolverProvider` once above your forms and every address field in the subtree
resolves names inline — wire once, every field upgrades. The renderer already does this
for you: `TransactionForm` mounts the provider ambiently, wired to the active adapter
runtime. With **no** provider mounted, the field is byte-identical to its pre-ENS
behavior — existing consumers see zero change.

## Quick Start

There is nothing to install or import for the common case — this ships inside the
existing UIKit packages. If your app already renders a dynamic form through the
renderer, it already works:

```tsx
// Existing consumer code — UNCHANGED. TransactionForm ambiently mounts a
// NameResolverProvider wired to the active runtime, so the address fields it
// renders resolve names inline.
import { TransactionForm } from '@openzeppelin/ui-renderer';
import { WalletStateProvider } from '@openzeppelin/ui-react';

<WalletStateProvider adapter={evmAdapter}>
  <TransactionForm
    schema={erc20TransferSchema}
    adapter={evmAdapter}
    contractSchema={contract}
  />
</WalletStateProvider>;
```

A user types `alice.eth` into the recipient field, sees **"Resolved to `0xabc…`"**
appear below the input, and submits. The submitted payload carries `0xabc…`, never
`alice.eth`. If the name doesn't resolve, submission stays disabled and the user sees
an actionable message — never a silently-wrong address.

To use the field outside the renderer (a hand-built form), mount the provider yourself
and spread in the runtime resolver:

```tsx
import { AddressField, NameResolverProvider } from '@openzeppelin/ui-components';
import { useRuntimeNameResolver, useWalletState } from '@openzeppelin/ui-react';

function FormRoot({ children }) {
  const resolver = useRuntimeNameResolver(); // projects the active adapter runtime
  const { activeNetworkId, activeNetworkConfig } = useWalletState();
  return (
    <NameResolverProvider
      {...resolver}
      activeNetworkId={activeNetworkId}
      activeNetworkName={activeNetworkConfig?.name}
    >
      {children}
    </NameResolverProvider>
  );
}
```

## Key Concepts

- **The injected resolver seam.** The base `AddressField` reads an optional
  `NameResolver` (`{ isValidName?, resolveName? }`, defined in
  `@openzeppelin/ui-types`) from a React context, injected by mounting
  `NameResolverProvider`. The component itself stays chain-agnostic and
  capability-free — it never reads a wallet or runtime; everything arrives through the
  context. No provider → every ENS branch is dead code and the field behaves exactly as
  before.

- **Ambient wiring (wire once, every field upgrades).** `useRuntimeNameResolver()` in
  `@openzeppelin/ui-react` projects the active adapter runtime's name-resolution
  capability into that seam. The renderer's `TransactionForm` mounts
  `<NameResolverProvider {...useRuntimeNameResolver()}>` around every form it renders,
  so all `blockchain-address` fields are ENS-capable with zero consumer code.

- **Shadow-state model.** The `<input>` always shows the *typed string* (the name or
  hex the user entered). The React Hook Form (RHF) field value — the value that gets
  submitted — is the *resolved hex*, and it is `''` in every state except a valid pasted
  hex or a fully-resolved, still-matching name. This split is the correctness spine:
  submit rides `formState.isValid`, and the value is a valid address only when it is
  safe to submit. No async validator is involved.

- **The typed error taxonomy.** Resolution never throws. Every failure surfaces as one
  of **seven** typed error codes (name-not-found, unsupported-network, timeout, gateway
  error, …), each mapped to a distinct, actionable message. See
  [api-reference.md](./api-reference.md#error-codes).

- **Mechanism-neutral success display (SF-6).** A successful resolution shows the
  same frozen announcer — **"Resolved to `0x…`"** — whether the adapter used direct
  L1 lookup, an off-chain gateway path, or a coinType-scoped record. Adapter
  `provenance.label` (e.g. `"ENS"` vs `"ENS via external gateway"`) is **not**
  rendered on the success path; the UI never branches on `provenance.external` or
  `provenance.label` for display.

- **Two-phase loading copy (SF-6).** While a name is debouncing or resolving, the
  announcer shows **"Resolving…"** for the first three seconds, then **"Still
  resolving…"** if the lookup is still in flight — so long off-chain round-trips do
  not look frozen. No mechanism words (`CCIP`, `gateway`, `v2`, …) appear in either
  string.

- **Chain-scope submit gate (SF-6).** When the adapter marks a resolved address with
  `provenance.scopedToNetworkId` and that id does not match the
  `NameResolverProvider`'s injected `activeNetworkId`, the field blocks hex write and
  submit and shows a distinct mismatch message. The published renderer wires
  `activeNetworkId` from wallet state; custom integrators must pass it when coinType
  wrong-chain protection matters.

- **Same-name re-entry is instant (stale-while-revalidate).** If the user edits a
  resolved name and types the *same* name back, the field re-derives "resolved" from
  its prior settled result immediately while a fresh lookup revalidates in the
  background. This is deliberate memoization, not a stale-cache bug — a *different*
  name can never see the old hex.

## API Reference

See [api-reference.md](./api-reference.md) — every exported function, component, and
type across `@openzeppelin/ui-types`, `@openzeppelin/ui-utils`,
`@openzeppelin/ui-components`, and `@openzeppelin/ui-react`, with full TypeScript
signatures.

## Integration Guide

See [integration-guide.md](./integration-guide.md) for the zero-wiring path, direct use
of the base `AddressField`, custom resolver injection, the network-support matrix, and
common mistakes.

## Safety

This is a **funds-critical** input: a wrong resolution sends assets to the wrong
address. The correctness contract integrators rely on:

- **No silent coercion (INV-75).** The submitted value is a valid address *if and only
  if* the user pasted a valid hex, or a name resolved and still matches the typed input.
  In every other state (empty-name, debouncing, loading, error) the value is `''` and
  submit is gated — including for **optional** fields (a pending name gates submit
  regardless of `required`).

- **The name→hex write is guarded and single-sited (INV-79/80/85).** The hex is written
  at exactly one place, only on `status === 'resolved'`, and only when the typed input
  still normalizes (trim + lowercase) to the resolved name. A stale in-flight resolution
  can never write a hex after the user has typed on (out-of-order results are dropped at
  the machine boundary). The field never caches a resolved hex across renders.

- **Edits invalidate synchronously (INV-81).** Editing a resolved field clears the RHF
  value to `''` on the keystroke, before re-resolution — a previous recipient's address
  can never survive an edit.

- **No provider, no change (INV-82).** With no `NameResolverProvider` mounted the field
  is byte-identical to its legacy behavior — same validation, same markup, same
  accessibility wiring. Nothing throws for a missing provider anywhere in this feature.

- **Unsupported networks fail cleanly, never silently.** When the active runtime has no
  resolution capability (or no `WalletStateProvider` / runtime is present at all), a
  typed name surfaces "Name resolution is not supported on {network}" with submit
  gated — it is never accepted as-is. Hex input keeps working unchanged.

- **Wrong-chain coinType resolves cannot submit (INV-134).** When
  `scopedToNetworkId` ≠ injected `activeNetworkId`, the RHF value stays `''` and
  submit is gated — same funds posture as an unresolved name. Without
  `activeNetworkId` on the provider, the gate is **off** and wrong-chain protection
  is the integrator's responsibility. See the integration guide's
  [Chain-scope gate](./integration-guide.md#chain-scope-gate-cointype-wrong-network).

- **A misconfigured (churning) resolver can't loop or coerce (SC-008).** If a custom
  resolver's function identity changes every render, the field bounds resolution
  dispatch per typed name (never an unbounded RPC loop), emits a one-shot dev-only
  warning, and degrades to the safe gated state — it never submits a silently-coerced
  address, and never throws. A genuine network swap still resolves once. Memoize custom
  resolvers or use `useRuntimeNameResolver` (stable by construction); the bound is a
  backstop. See the integration guide's [Stable resolver identity](./integration-guide.md#stable-resolver-identity-integrator-contract).

## Related

- **Address display + avatar (SF-4):** reverse resolution for *rendering* addresses.
  A separate, **synchronous** value seam on the base `AddressDisplay`
  (`AddressNameProvider` / `useAddressName`) — do not confuse it with this field's
  async input seam.
- **AddressBookWidget ENS (SF-5):** add-by-ENS in the address book, behind an
  `enableNameResolution` opt-in prop. Consumes this field's `onResolvedNameChange`
  notification channel to seed alias suggestions.
- **ENS v2 UX (SF-6):** mechanism-neutral success display, two-phase loading copy,
  un-branded `EXTERNAL_GATEWAY_ERROR` message, and coinType wrong-network gating via
  `NameResolverProvider.activeNetworkId` — documented in this same guide set; no
  markers or badges.

## License

Inherits the repository license (see the repo root `LICENSE`).
