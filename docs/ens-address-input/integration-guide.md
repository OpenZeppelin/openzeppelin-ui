# ENS Address Input — Integration Guide

How to adopt ENS-aware address input in a UIKit-consuming dapp. The headline is that
**the common case requires no integration work** — the renderer wires resolution in
ambiently — but there are a few things you must have in place, and a couple of ways to
go beyond the default.

## How the wiring works

Inline resolution lives in the base `@openzeppelin/ui-components` `AddressField` and is
activated by an injected `NameResolver` context:

```
adapter runtime capability
        │  useRuntimeNameResolver()          (@openzeppelin/ui-react)
        ▼
<NameResolverProvider {...resolver}>         (@openzeppelin/ui-components)
        │  context
        ▼
every <AddressField> in the subtree          (base field — no fork, no swap)
```

`TransactionForm` mounts the provider for you — wire once, every field upgrades. With
no provider mounted, `AddressField` is byte-identical to its pre-ENS behavior.

## Prerequisites

1. **A `WalletStateProvider` above your forms** — *for names to actually resolve*.
   `useRuntimeNameResolver` projects the active runtime's name-resolution capability
   into the seam. Without a `WalletStateProvider` (or without an active runtime) it
   degrades to an empty resolver: typed names surface "Name resolution is not supported
   on this network" with submit gated, and hex input keeps working. **Nothing throws.**

2. **An adapter that implements the name-resolution capability.** Same graceful
   degradation: without it, name inputs fail cleanly with the unsupported-network
   message and the field stays fully usable for hex addresses.

3. **No `NameResolutionProvider` is required** — the react layer falls back to a
   zero-config default query client. Mount one only to tune cache/retry behavior.

---

## Pattern 1: Zero-wiring — existing dynamic forms

If your dapp already renders address fields through the renderer's dynamic forms, you
are done. `TransactionForm` ambiently mounts `NameResolverProvider` wired to the active
runtime, and the `'blockchain-address'` field type renders the (now ENS-capable) base
`AddressField` — so every such field resolves names automatically.

```tsx
import { TransactionForm } from '@openzeppelin/ui-renderer';
import { WalletStateProvider } from '@openzeppelin/ui-react';

function TransferPage({ evmAdapter, contract, erc20TransferSchema }) {
  return (
    <WalletStateProvider adapter={evmAdapter}>
      {/* The recipient address field now accepts alice.eth as well as 0x… */}
      <TransactionForm
        schema={erc20TransferSchema}
        adapter={evmAdapter}
        contractSchema={contract}
      />
    </WalletStateProvider>
  );
}
```

What the user experiences:

1. Types `alice.eth` → sees **"Resolving…"** (and **"Still resolving…"** if the lookup
   takes longer than ~3 seconds), then **"Resolved to `0xabc…`"**.
2. Submit is disabled until that resolved line appears.
3. On submit, the form payload carries `0xabc…` — never `alice.eth`.
4. Types a name that doesn't exist → sees "No address is registered for this name.",
   submit stays disabled.

You write no ENS-specific code.

---

## Pattern 2: Render the base `AddressField` directly

If you build a form by hand (not from a schema) and want name resolution, import the
base field from `@openzeppelin/ui-components`, give it an RHF `control` + `name` plus
the `addressing` adapter for hex validation, and mount a `NameResolverProvider` wired
to the runtime. (Fields rendered *inside* a `TransactionForm` inherit its ambient
provider and skip this step.)

```tsx
import { useForm } from 'react-hook-form';
import { AddressField, NameResolverProvider } from '@openzeppelin/ui-components';
import { WalletStateProvider, useRuntimeNameResolver, useWalletState } from '@openzeppelin/ui-react';

function ManualTransferForm({ evmAdapter }) {
  const { control, handleSubmit, formState } = useForm<{ to: string }>({
    mode: 'onChange',
  });
  const resolver = useRuntimeNameResolver(); // must be under WalletStateProvider
  const { activeNetworkId, activeNetworkConfig } = useWalletState();

  return (
    <NameResolverProvider
      {...resolver}
      activeNetworkId={activeNetworkId}
      activeNetworkName={activeNetworkConfig?.name}
    >
      <form onSubmit={handleSubmit((values) => console.log('submit:', values.to))}>
        <AddressField
          id="to"
          name="to"
          label="Recipient"
          control={control}
          addressing={evmAdapter.addressing}
          validation={{ required: true }}
        />
        {/* Gate the button on formState.isValid — the field guarantees the value is
            a valid address only when it is safe to submit. */}
        <button type="submit" disabled={!formState.isValid}>
          Send
        </button>
      </form>
    </NameResolverProvider>
  );
}

function Page({ evmAdapter }) {
  return (
    <WalletStateProvider adapter={evmAdapter}>
      <ManualTransferForm evmAdapter={evmAdapter} />
    </WalletStateProvider>
  );
}
```

The submitted `values.to` is the resolved hex (or the pasted hex). It is never the name,
and never a hex the name hasn't actually resolved to.

Omit the `NameResolverProvider` and the same code renders the legacy hex-only field —
resolution is purely additive.

---

## Pattern 3: Inject a custom resolver

The seam is a plain data contract (`NameResolver` in `@openzeppelin/ui-types`), so you
can back it with anything — a test double, a fixed lookup table, or your own resolution
service — without touching adapters:

```tsx
import { useMemo } from 'react';
import { NameResolverProvider } from '@openzeppelin/ui-components';
import type { NameResolver } from '@openzeppelin/ui-types';

function StaticResolverProvider({ children }) {
  // Memoize: the resolver's function identity keys the field's inline resolution.
  // An unstable identity is bounded + warned (see "Stable resolver identity" below),
  // but a memoized resolver is the contract — without it the field degrades to a
  // gated, non-resolving state until you fix it.
  const resolver = useMemo<NameResolver>(
    () => ({
      isValidName: (name) => name.endsWith('.test'),
      resolveName: async (name) =>
        name === 'alice.test'
          ? {
              ok: true,
              value: {
                name: 'alice.test',
                address: '0x1111111111111111111111111111111111111111',
                provenance: { label: 'Test directory', external: false },
              },
            }
          : { ok: false, error: { code: 'NAME_NOT_FOUND', name } },
    }),
    []
  );
  return <NameResolverProvider {...resolver}>{children}</NameResolverProvider>;
}
```

Contract rules for a custom `resolveName`:

- **Never reject for expected failures** — resolve with `{ ok: false, error }` using
  one of the seven codes. (A rejection is treated as a contract violation and mapped to
  `ADAPTER_ERROR`.)
- Echo the **normalized** (trim + lowercase) name in `value.name` — the field's write
  guard compares against it.
- Omit `resolveName` entirely to declare forward resolution unsupported (typed names
  then surface `UNSUPPORTED_NETWORK` with zero calls).

---

## Pattern 4: Observe the resolved name

If you need the human-readable name that resolved (e.g. to seed a label, as the address
book does), pass `onResolvedNameChange` to the base `AddressField`. It fires with the
name on a resolved + name-match, and `undefined` in every other state. It is a
**read-only notification** — it does not affect the value written to the form or the
submit gate.

```tsx
<AddressField
  id="to"
  name="to"
  label="Recipient"
  control={control}
  addressing={evmAdapter.addressing}
  onResolvedNameChange={(name) => {
    // name === 'alice.eth' on resolve+match; undefined while typing/erroring.
    setSuggestedLabel(name ?? '');
  }}
/>
```

---

## Chain-scope gate (coinType wrong-network)

When an adapter resolves a name to an address scoped to a specific network
(`provenance.scopedToNetworkId`, e.g. from a non–coin-type-60 record), the field
compares that id to `NameResolverProvider.activeNetworkId`. On mismatch:

- The announcer shows `nameResolutionChainScopeMismatchMessage` in `role="alert"`.
- The RHF value stays `''` — no hex is written (INV-134).
- Submit stays disabled — same posture as loading or error.
- **No Retry** button (retrying cannot fix a network mismatch).

The published renderer (`TransactionForm`, `AddAliasDialog` with name resolution)
passes `activeNetworkId` and `activeNetworkName` from wallet state automatically. If you
mount `NameResolverProvider` yourself and your adapter can return
`scopedToNetworkId`, **you must wire `activeNetworkId`** for funds-safe wrong-chain
protection:

```tsx
import { NameResolverProvider } from '@openzeppelin/ui-components';
import { useRuntimeNameResolver, useWalletState } from '@openzeppelin/ui-react';

function FormRoot({ children }) {
  const resolver = useRuntimeNameResolver();
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

When `activeNetworkId` is absent, `null`, or `''`, `isChainScopeMismatch` always
returns `false` — the gate is **off**. A coinType resolve on the wrong chain can then
submit freely; that is an integrator misconfiguration, not a silent field bug.

Optional: pass `scopedNetworkName` into the message helper when building custom fields
that call `nameResolutionChainScopeMismatchMessage` directly. The shipped `AddressField`
currently passes `activeNetworkName` only; when both network names are available the
message interpolates them, otherwise it uses the generic fallback.

---

## Stable resolver identity (integrator contract)

**The injected resolver must be referentially stable across renders.** The field keys
its inline resolution on the resolver's function identity, so a resolver whose identity
changes on every render — a fresh inline function — is a misconfiguration. Satisfy the
contract in one of two ways:

- Use `useRuntimeNameResolver` from `@openzeppelin/ui-react` — **stable by
  construction** (memoized per runtime/network). The zero-wiring path (Pattern 1)
  already does this for you.
- Memoize a custom resolver with `useMemo` (Pattern 3 shows the shape).

**The base component is hardened against a churning resolver — this is enforced, not
just a caveat (SC-008).** If an unstable identity does slip through:

- **Dispatch is bounded per resolution intent.** The field caps resolver calls per
  distinct typed name (the `MAX_DISPATCHES_PER_INTENT` bound, currently `8`)
  **regardless of render count** — a churning identity can never drive an unbounded RPC
  loop (no gateway rate-ban, no runaway cost, no funds-path DoS).
- **A one-shot, development-only warning** names the misconfiguration and points back to
  this section. It never fires in production and never more than once per field.
- **The field degrades to a safe gated state** — the RHF value stays `''` and submit
  stays blocked. It never writes a wrong or silently-coerced address, and it never
  throws. The worst case is a field that will not resolve until you memoize the resolver.
- **A genuine resolver / network swap is still honored.** Switching networks — a single
  identity change for a given typed name — re-resolves the current input **exactly once**,
  within budget. The guardrail bounds *churn*, not legitimate swaps.

Recovery is automatic once the resolver is stable: retyping the name (or hitting Retry)
starts a fresh intent that resolves normally against the now-stable resolver.

The net funds-safety guarantee: **no resolver misconfiguration can cause an unbounded
RPC loop or submit a silently-coerced address.** Still, memoize your resolver — the
bound is a backstop, not a feature to lean on.

---

## Network support matrix

| Environment | Typing a name | Typing a hex |
|---|---|---|
| Provider mounted, adapter resolves the name | resolves inline, submit enabled | passthrough |
| Provider mounted, resolved name scoped to **different** network than `activeNetworkId` | chain-scope mismatch alert, submit gated, RHF `''` | passthrough |
| Provider mounted, name doesn't resolve | typed error message, submit gated | passthrough |
| Provider mounted, runtime/adapter has **no** resolution capability (incl. no `WalletStateProvider`) | "Name resolution is not supported on {network}", submit gated, zero calls | passthrough (still fully usable) |
| **No `NameResolverProvider` mounted** | legacy behavior — the name fails ordinary address validation ("Invalid address format…") | passthrough |

The hex path is identical across all rows — pasting `0x…` behaves exactly as the legacy
field always did.

Note the difference between the last two rows: a mounted provider whose runtime lacks
the capability produces the *actionable* "not supported" message (the field knows a
name was intended); no provider at all means the field has no concept of names and
validates the input as an address, exactly as before this feature.

---

## Common mistakes

- **Forgetting the `WalletStateProvider` (or the capability) and expecting names to
  resolve.** Nothing crashes — the field shows "Name resolution is not supported on
  this network" for every typed name. If names never resolve, check that a
  `WalletStateProvider` is mounted and the active adapter implements the
  name-resolution capability.

- **Gating submit on something other than `formState.isValid`.** The field's whole
  correctness contract routes through the RHF value being `''` until resolution is safe.
  If you read the raw input value and submit that, you bypass the guard and can submit a
  name or an unresolved value. Always gate on `formState.isValid`.

- **Recreating a custom resolver every render.** The field keys inline resolution on
  the resolver's function identity, so a fresh `resolveName` each render is a
  misconfiguration. It is detected and **bounded** (never an unbounded RPC loop),
  flagged by a one-shot dev-only warning, and the field degrades to a safe gated state
  until you fix it — see
  [Stable resolver identity](#stable-resolver-identity-integrator-contract). Memoize
  custom resolvers (`useMemo`); `useRuntimeNameResolver` is already referentially stable.

- **Conflating the input seam with the display seam.** This field's seam
  (`NameResolverProvider`, **async**, name → address) drives address *input*. Address
  *display* (reverse, address → name) uses a separate **synchronous** seam on
  `AddressDisplay` (`AddressNameProvider` / `useAddressName`, SF-4). They are wired
  independently — mounting one does not activate the other.

- **Omitting `activeNetworkId` while using coinType-capable adapters.** The field
  cannot block wrong-chain submits without a non-empty `activeNetworkId` on the
  provider. Wire it from wallet/runtime state — see
  [Chain-scope gate](#chain-scope-gate-cointype-wrong-network).

- **Rendering `error.message` / `error.detail` yourself.** Those are diagnostic /
  log-only. Render `nameResolutionMessageForCode(code, …)` (the field already does this
  internally). Showing raw diagnostic text can leak a gateway URL or stack detail.

- **Branching on `provenance.label` or `provenance.external` for UI.** Adapter labels
  differ by resolution mechanism; the field deliberately omits them on the success path
  so direct-L1 and off-chain resolves look identical (SF-6). Use adapter type guards
  only in adapter-layer code, not in display branching.

---

## Accessibility notes for integrators

The field is a11y-complete for the SF-3 surface; you don't need to add anything, but be
aware of the contract if you customize:

- Resolution outcomes are announced via a dedicated `aria-live="polite"` region,
  separate from the RHF error region. Both are wired into the input's
  `aria-describedby`. The region exists only while a resolver is mounted — with no
  provider, the field's markup is unchanged from its legacy form. Loading copy
  escalates from **"Resolving…"** to **"Still resolving…"** inside this region after
  three seconds of continuous pending time; chain-scope mismatch uses `role="alert"`.
- The announcer never steals focus — focus stays in the `<input>` across all transitions.
- The suggestion dropdown keeps its full keyboard/ARIA contract (`role="listbox"`,
  wrapping arrow nav, Enter-to-select, Escape-to-close, `aria-activedescendant`).

---

## Behavior notes (documented decisions)

1. **Programmatic `form.reset()` / `setValue()`.** External value changes sync into the
   displayed text: resetting a field whose value is a hex (pasted or resolved) clears /
   replaces the display as you'd expect. The one divergence window is an **unresolved
   typed name** — its RHF value is already `''`, so a `reset()` to `''` changes nothing
   and the typed text stays visible. This is safe by construction: the value is empty
   and submit is gated, so no funds risk exists; the user simply still sees what they
   typed.

2. **Same-name re-entry resolves instantly.** The field's machine keeps its one settled
   result keyed by (name, resolver, retry attempt). Re-entering the same name re-derives
   "Resolved to …" immediately while a background dispatch revalidates
   (stale-while-revalidate — the same semantics as the react-layer cache). Expect the
   status line to appear without a "Resolving…" flash in this case. A *different* name
   can never see the old hex.

3. **Retry button inside the `aria-live` region — transient codes only.** The Retry
   affordance is rendered only for the three transient error codes
   (`RESOLUTION_TIMEOUT`, `EXTERNAL_GATEWAY_ERROR`, `ADAPTER_ERROR`), and it sits inside
   the polite live region. Tests confirm it announces and clicks correctly, and it never
   steals focus. If a manual screen-reader pass finds the announcement re-fires
   awkwardly, moving the button just outside the live region is a trivial, contract-safe
   adjustment — no invariant depends on its exact placement.
