# ENS Address Input — API Reference

Complete reference for every public member shipped by SF-3, across four packages.

- [`@openzeppelin/ui-types`](#openzeppelinui-types) — the `NameResolver` seam + resolution data shapes
- [`@openzeppelin/ui-utils`](#openzeppelinui-utils) — pure classifier + message mapper
- [`@openzeppelin/ui-components`](#openzeppelinui-components) — the ENS-capable `AddressField`, the provider, and the resolution machine
- [`@openzeppelin/ui-react`](#openzeppelinui-react) — `useRuntimeNameResolver`, the runtime→seam wiring
- [`@openzeppelin/ui-renderer`](#openzeppelinui-renderer) — ambient wiring (no new exports)
- [Error codes](#error-codes) — the seven `NameResolutionError` codes and their messages

---

## `@openzeppelin/ui-types`

Value types only — this package exports no runtime code.

### `NameResolver`

The injection seam for **forward** name resolution (name → address). This is the shape
you provide to `NameResolverProvider`, and the shape `useRuntimeNameResolver()`
returns. Forward-only by design: reverse display resolution (address → name) is a
separate synchronous seam owned by the address-display component
(`AddressNameResolver` / `AddressNameProvider`, SF-4) — no async `resolveAddress` arm
exists here.

```ts
interface NameResolver {
  /**
   * Synchronous name-shape check. Lets the field classify input without a
   * round-trip. Absent → the field falls back to its built-in conservative
   * `looksLikeName` heuristic.
   */
  readonly isValidName?: (name: string) => boolean;

  /**
   * Forward resolution (name → address). Absent → forward resolution is
   * unsupported on this runtime; a typed name surfaces UNSUPPORTED_NETWORK.
   * MUST resolve with a ResolutionResult (ok / error) — it MUST NOT reject
   * for expected failures.
   */
  readonly resolveName?: (name: string) => Promise<ResolutionResult<ResolvedAddress>>;
}
```

Both methods are optional so a runtime may wire neither or only one. Every failure
rides in the closed 7-code `error` union — the seam adds no new error or provenance
type.

### Resolution data shapes

These come unchanged from SF-1. Shown here so integrators reading a resolved result
know its shape.

```ts
/** Discriminated result union — check `ok` before touching `value` / `error`. */
type ResolutionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: NameResolutionError };

/** Successful forward-resolution result (name → address). */
interface ResolvedAddress {
  /** Name the caller asked about (echoed). */
  readonly name: string;
  /** Address the name forward-resolves to — the value that gets submitted. */
  readonly address: string;
  /** How the result was obtained. */
  readonly provenance: ResolutionProvenance;
}

/** Chain-agnostic provenance record on every resolution result. */
interface ResolutionProvenance {
  /** Human-readable mechanism label, safe to render (e.g. 'ENS'). Display only —
   *  downstream code MUST NOT branch on its value. */
  readonly label: string;
  /** Whether resolution went through an external/off-chain gateway (higher latency). */
  readonly external: boolean;
  /** If present, the address is scoped to this network id (opaque string, e.g.
   *  `eip155:8453`). SF-6 reads this **only** for internal submit gating via
   *  `isChainScopeMismatch` — never for success-display branching. */
  readonly scopedToNetworkId?: string;
}
```

---

## `@openzeppelin/ui-utils`

Two pure, framework-free helpers. Neither performs I/O; both are synchronous and
deterministic.

### `classifyAddressInput(value, predicates?): AddressInputClassification`

Classifies what the user typed into an address field, synchronously. Drives the field's
branch: `'hex'` → passthrough, `'name-candidate'` → resolve inline, `'empty'` /
`'malformed'` → standard sync validation.

```ts
function classifyAddressInput(
  value: string,
  predicates?: AddressInputPredicates,
): AddressInputClassification;
```

**Parameters:**
- `value` (`string`) — the raw input string.
- `predicates` (`AddressInputPredicates`, optional) — injected `isValidAddress` /
  `isValidName`. Both optional so the classifier degrades gracefully when a capability
  is absent.

**Returns:** exactly one of `'empty' | 'hex' | 'name-candidate' | 'malformed'`.

**Order of checks** (first match wins):

1. trimmed-empty → `'empty'`
2. `isValidAddress?.(value) === true` → `'hex'` (checked *before* names, so a value that
   is both hex-valid and name-shaped classifies `'hex'`)
3. `isValidName` present: `isValidName(value)` → `'name-candidate'`, else `'malformed'`
4. `isValidName` absent: `looksLikeName(value)` → `'name-candidate'`, else `'malformed'`

### `looksLikeName(value): boolean`

Conservative built-in "does this look like a name?" heuristic — used **only** as the
no-capability fallback (step 4 above). It exists to let a no-capability network
distinguish a typed name (→ surface `UNSUPPORTED_NETWORK`) from genuine garbage
(→ `'malformed'`); **it never drives real resolution** (that requires an injected
`resolveName`).

```ts
function looksLikeName(value: string): boolean;
```

Returns `true` only for a trimmed string that contains a dot, has non-empty labels, has
a letters-only final label, and is **not** hex-shaped (no `0x` prefix). Pinned vectors:

| Input | Result | Why |
|---|---|---|
| `0xdead` | `false` | hex-shaped |
| `0xDEADBEEF` | `false` | hex-shaped |
| `alice.eth` | `true` | dotted, letters-only final label |
| `alice` | `false` | no dot |
| `a.b.eth` | `true` | dotted, letters-only final label |
| `1.2` | `false` | numeric final label |
| `.eth` | `false` | empty leading label |

### `nameResolutionMessageForCode(code, ctx?): string`

Maps a resolution error `code` to a distinct, actionable, user-facing string. This is
the single i18n seam for resolution errors (plain English today; no i18n infrastructure
exists in the UI packages). See [Error codes](#error-codes) for the full table.

```ts
function nameResolutionMessageForCode(
  code: NameResolutionErrorCode,
  ctx?: NameResolutionMessageContext,
): string;
```

**Parameters:**
- `code` (`NameResolutionErrorCode`) — the `code` from a `NameResolutionError`.
- `ctx` (`NameResolutionMessageContext`, optional) — `ctx.networkName` is interpolated
  into `UNSUPPORTED_NETWORK` / `UNSUPPORTED_NAME`. When absent, the message names "this
  network" generically.

**Returns:** the display string. **Callers must not render raw diagnostic fields**
(`error.message` / `.detail` / `.reason` / `.cause`) — SF-1 marks those log-only.

> Adding a code to SF-1's union makes the internal `switch` non-exhaustive and breaks
> the build (via an `assertNever` guard) — a new code forces a new, distinct message
> rather than a silent collapse.

### Types

```ts
/** Coarse classification of an address-field input, computed synchronously. */
type AddressInputClassification = 'empty' | 'hex' | 'name-candidate' | 'malformed';

/** Injected synchronous predicates. Both optional. */
interface AddressInputPredicates {
  /** The addressing capability's synchronous hex check (authoritative for 'hex'). */
  readonly isValidAddress?: (value: string) => boolean;
  /** The name-resolution capability's synchronous isValidName (authoritative for names). */
  readonly isValidName?: (value: string) => boolean;
}

/** Optional interpolation context for network-naming messages. */
interface NameResolutionMessageContext {
  /** Human-readable active-network name for UNSUPPORTED_NETWORK / UNSUPPORTED_NAME. */
  readonly networkName?: string;
}

/** The closed set of codes the mapper covers (all 7 from SF-1's union). */
type NameResolutionErrorCode = NameResolutionError['code'];
```

### `isChainScopeMismatch(provenance, activeNetworkId): boolean`

Pure helper for coinType wrong-network detection. Used by `AddressField` for internal
submit/hex-write gating only — **not** for success-display branching.

```ts
function isChainScopeMismatch(
  provenance: Pick<ResolutionProvenance, 'scopedToNetworkId'>,
  activeNetworkId: string | null | undefined,
): boolean;
```

Returns `true` **iff** `provenance.scopedToNetworkId` is a non-empty string **and**
`activeNetworkId` is a non-empty string **and** the two differ (strict `===` equality).
When `activeNetworkId` is `null`, `undefined`, or `''`, returns `false` — the gate is
**off**.

### `nameResolutionChainScopeMismatchMessage(ctx?): string`

Distinct, actionable, mechanism-neutral copy when a resolved name's scoped network does
not match the active network. **Not** part of the SF-1 seven-code union — the field
renders this in the chain-scope mismatch arm only (no retry).

```ts
function nameResolutionChainScopeMismatchMessage(
  ctx?: ChainScopeMessageContext,
): string;

interface ChainScopeMessageContext {
  readonly scopedNetworkName?: string;
  readonly activeNetworkName?: string;
}
```

When **both** `scopedNetworkName` and `activeNetworkName` are non-empty, interpolates
them (e.g. `"This name resolves to an address on Base, not Optimism."`). Otherwise
returns the generic fallback:
`"This name resolves to an address for a different network."`

---

## `@openzeppelin/ui-components`

The chain-agnostic component layer: the ENS-capable `AddressField`, the
`NameResolverProvider` that activates it, the low-level resolution machine, and the
(unchanged) suggestion surface. Everything here is capability-free — nothing in this
package reads a wallet, a runtime, or anything ENS-specific; resolution arrives only
through the injected context.

### `AddressField(props): React.ReactElement`

The address input field, registered by the renderer for the `'blockchain-address'`
field type. Inline name resolution is **opt-in via context**: with a
`NameResolverProvider` mounted, the field accepts a name or a hex address; with no
provider, it is byte-identical to its pre-ENS behavior.

- **Hex input:** passthrough — the RHF value tracks the input, validated exactly as
  before (`addressing.isValidAddress`). No divergence.
- **Name input** (provider mounted): resolved inline via the injected `resolveName`;
  the RHF value stays `''` (submit gated) until `status === 'resolved'` and the
  resolved name still matches what the user sees, then becomes the resolved hex.
- **Name input** (provider mounted but no `resolveName` on this runtime): surfaces
  `UNSUPPORTED_NETWORK` with submit gated, zero resolution calls.

```ts
function AddressField<TFieldValues extends FieldValues = FieldValues>(
  props: AddressFieldProps<TFieldValues>,
): React.ReactElement;
```

#### Props: `AddressFieldProps<TFieldValues>`

Extends `BaseFieldProps<TFieldValues>` (the standard `id`, `label`, `placeholder`,
`helperText`, `width`, `validation`, `control`, `name`, `readOnly` a dynamic-form field
receives).

```ts
interface AddressFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** Sync hex validation capability (prop-drilled adapter). Authoritative for HEX only. */
  addressing?: AddressingCapability;
  /**
   * Explicit suggestion list — overrides context resolution and renders as-is.
   * `false` disables suggestions entirely. `undefined` falls back to context.
   */
  suggestions?: AddressSuggestion[] | false;
  /** Called when the user selects a suggestion. */
  onSuggestionSelect?: (suggestion: AddressSuggestion) => void;
  /**
   * Fired when the resolved-and-name-matched name changes. Emits the resolved
   * NAME (never the hex) on resolved + name-match, and `undefined` in every other
   * state. Read-only notification — does NOT participate in the resolved-hex
   * write path. With no injected resolver it only ever emits `undefined`.
   */
  onResolvedNameChange?: (name: string | undefined) => void;
}
```

> **`onResolvedNameChange` note.** This prop is an additive, read-only notification
> channel added for the AddressBookWidget (SF-5), which needs the human-readable name to
> seed its alias suggestion. It surfaces the resolved *name* only, through the same
> name-match guard as the hex write, and never touches `field.onChange`, so it cannot
> reorder, gate, or re-trigger the funds-critical write. When absent, the field's
> behavior is unchanged.

**Authority split.** The field reads two sources with disjoint jobs:

| Concern | Source | Authoritative for |
|---|---|---|
| Name → address resolution | injected `NameResolver` (context) | resolving names; supplies the network id for messages |
| Synchronous hex validation | prop-drilled `addressing` adapter | validating whatever hex lands in the field value |

They never arbitrate the same decision, so a prop/context divergence cannot produce a
wrong resolution. No new capability prop is introduced — name resolution comes from
context (zero call-site wiring).

#### Rendered structure

- The `<input>` — always shows the *typed* string, never the resolved hex. With a
  resolver mounted the default placeholder becomes `0x... or name` (else `0x...`).
- The suggestion dropdown (when active) — `AddressSuggestionList`.
- The legacy RHF error region (`${id}-error`) — unchanged; the internal pending-gate
  string is suppressed from it.
- A dedicated `aria-live="polite"` region (`${id}-resolution`), additively associated
  via `aria-describedby` and rendered **only when a resolver is mounted**, that
  announces exactly one outcome per resolution status:
  - `idle` → nothing
  - `debouncing` / `loading` → **"Resolving…"**, then **"Still resolving…"** after
    3 seconds of continuous pending time (SF-6; no mechanism words)
  - `resolved` + chain scope OK → **"Resolved to `0x…`"** only (no `provenance.label`
    suffix — mechanism-neutral success, SF-6)
  - `resolved` + chain-scope mismatch → `nameResolutionChainScopeMismatchMessage`
    inside `role="alert"` (no retry)
  - `error` → the per-code message, with a **Retry** button for transient codes only

### `NameResolverProvider(props): React.ReactElement`

Provides forward name resolution to all `AddressField` instances in the subtree. The
provider is deliberately dumb: it memoizes the injected functions into the context
value and nothing else — no hook state, no capability, no chain dependency. The smart
runtime wiring lives in `@openzeppelin/ui-react` (`useRuntimeNameResolver`).

```ts
function NameResolverProvider(props: NameResolverProviderProps): React.ReactElement;

/** Extends NameResolver with optional network context for SF-6 chain-scope gating. */
interface NameResolverProviderProps extends NameResolver {
  children: React.ReactNode;
  /** Opaque active network id (e.g. `eip155:8453`). When absent/empty, coinType
   *  wrong-chain gate is off — integrator must wire for funds-safe behavior. */
  activeNetworkId?: string | null;
  /** Optional display name — interpolated into chain-scope mismatch copy only. */
  activeNetworkName?: string;
}
```

Both functions are optional: an absent `resolveName` means forward resolution is
unsupported and a typed name surfaces `UNSUPPORTED_NETWORK`.

> **Stable resolver identity (integrator contract).** The injected resolver **must be
> referentially stable across renders** — memoize a custom resolver (`useMemo`) or use
> `useRuntimeNameResolver` (stable by construction). A churning identity is detected and
> **bounded** (no unbounded RPC loop), emits a one-shot dev-only warning, and degrades
> the field to a safe gated state until memoized — never a wrong or coerced address —
> while a genuine network swap still re-resolves once. See the integration guide's
> [Stable resolver identity](./integration-guide.md#stable-resolver-identity-integrator-contract)
> contract.

### `useNameResolver(): NameResolverContextValue | null`

Read the injected resolver **and** optional network context from context. Returns
`null` when no `NameResolverProvider` is mounted — the consuming field then treats every
ENS branch as dead code. The return type extends `NameResolver` with optional
`activeNetworkId` / `activeNetworkName`; consumers that destructure only `resolveName` /
`isValidName` remain unaffected.

### `NameResolverContext`

The shared `React.Context<NameResolverContextValue | null>` behind the provider and
hook — a sibling of `AddressSuggestionContext` / `AddressLabelContext`. Exported for
edge cases (testing, custom providers); prefer `NameResolverProvider` / `useNameResolver`.

### `useInjectedNameResolution(params): InjectedNameResolutionResult`

The low-level resolution machine `AddressField` consumes: given a typed input and the
injected `resolveName`, it debounces, dispatches, tracks status, and drops out-of-order
results (last-write-wins). It holds no resolved-hex cache of its own. Exposed for
consumers building a custom name-resolving input on the same guarantees.

```ts
function useInjectedNameResolution(
  params: UseInjectedNameResolutionParams,
): InjectedNameResolutionResult;

interface UseInjectedNameResolutionParams {
  /** The raw typed input (the field's display string). Normalized internally. */
  readonly input: string;
  /** `true` only when the input is a name candidate AND an injected resolveName
   *  exists. `false` forces `idle` with zero calls. */
  readonly enabled: boolean;
  /** The injected forward resolver. Absent → the machine stays `idle`. */
  readonly resolveName?: InjectedResolveName;
  /** Debounce override (ms); `<= 0` disables debouncing. Default 300. */
  readonly debounceMs?: number;
}

/** Forward resolver function injected through NameResolverContext. */
type InjectedResolveName = (name: string) => Promise<ResolutionResult<ResolvedAddress>>;
```

The result is a discriminated union on `status`; `name` is always the normalized
(trim + lowercase) input the arm refers to:

```ts
type InjectedNameResolutionResult =
  | { readonly status: 'idle' }
  | { readonly status: 'debouncing'; readonly name: string }
  | { readonly status: 'loading'; readonly name: string }
  | { readonly status: 'resolved'; readonly name: string; readonly data: ResolvedAddress }
  | { readonly status: 'error'; readonly name: string;
      readonly error: NameResolutionError; readonly retry: () => void };
```

Guarantees: no call unless `enabled` and the debounced copy matches the current input;
a settled result whose requested name no longer matches the current input is discarded;
a rejecting resolver (contract violation) is mapped to a typed `ADAPTER_ERROR` —
nothing throws into the render tree.

> **Same-name memoization.** The machine keeps one settled record keyed by
> (name, resolver identity, retry attempt). Re-entering the *same* name with the *same*
> resolver re-derives `resolved` from the prior record instantly while a fresh dispatch
> revalidates — stale-while-revalidate, matching the react-layer cache semantics. A
> *different* name can never observe the old result.

> **Bounded dispatch under resolver-identity churn (SC-008).** The dispatch effect keys
> on the injected resolver's function identity, so an unstable (non-memoized) resolver
> would re-fire it on every render. The machine caps resolver calls per resolution
> intent — the pair (normalized input × retry attempt) — at the internal
> `MAX_DISPATCHES_PER_INTENT` bound (`8`), **regardless of render count**, so a churning
> identity can never drive an unbounded RPC loop. The budget resets when the intent
> changes (a new name, or `retry()`), so a genuine resolver/network swap still
> re-resolves the current input **exactly once** within budget. On exhaustion under
> sustained churn the machine emits a one-shot, development-only `console.warn` and holds
> the safe gated state (value `''`, submit gated) — never a wrong hex, never a throw.
> Prefer a stable resolver identity; the bound is a backstop. See the integration guide's
> [Stable resolver identity](./integration-guide.md#stable-resolver-identity-integrator-contract).

### `NAME_RESOLUTION_DEBOUNCE_MS`

The default debounce window for typed names: `300` (ms).

### `useAddressSuggestionField(args): UseAddressSuggestionFieldResult`

Headless suggestion-dropdown behavior (unchanged by SF-3): `AddressSuggestionContext`
resolution (explicit `suggestions` prop overrides), a `MAX_SUGGESTIONS` (5) cap on
context-resolved lists, a 200 ms debounce, wrapping ArrowUp/ArrowDown highlight
navigation, and click-outside-to-close. The consuming field owns the value write on
selection and the Enter/Escape handlers.

> **Not the same as `useAddressSuggestions`.** A pre-existing convenience hook
> `useAddressSuggestions(query, networkId)` (a thin context resolver with no debounce /
> cap / keyboard state) is untouched and still exported.

```ts
function useAddressSuggestionField(
  args: UseAddressSuggestionFieldArgs,
): UseAddressSuggestionFieldResult;

interface UseAddressSuggestionFieldArgs {
  /** Current input text — drives the debounce and dropdown visibility. */
  readonly inputValue: string;
  /**
   * Explicit suggestion list overrides context resolution and renders as-is (no cap).
   * `false` disables suggestions entirely. `undefined` falls back to context.
   */
  readonly suggestions?: AddressSuggestion[] | false;
  /** Optional network id forwarded to the context resolver for scoping. */
  readonly networkId?: string;
}

interface UseAddressSuggestionFieldResult {
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly resolvedSuggestions: AddressSuggestion[];
  /** true when the dropdown is open AND there is at least one suggestion. */
  readonly hasSuggestions: boolean;
  /** Index of the keyboard-highlighted option, or -1. */
  readonly highlightedIndex: number;
  /** true when suggestions are explicitly disabled (suggestions === false). */
  readonly suggestionsDisabled: boolean;
  readonly setHighlightedIndex: (index: number) => void;
  readonly closeSuggestions: () => void;
  readonly onInputChange: (value: string) => void;
  /** Container-level keydown handler: wrapping ArrowUp / ArrowDown navigation. */
  readonly onContainerKeyDown: (e: React.KeyboardEvent) => void;
}
```

### `AddressSuggestionList(props): React.ReactElement | null`

Presentational ARIA listbox for the above (unchanged by SF-3). Purely presentational
and capability-free: owns no state and no resolution. Returns `null` when there are no
suggestions.

```ts
function AddressSuggestionList(props: AddressSuggestionListProps): React.ReactElement | null;

interface AddressSuggestionListProps {
  /** Field id — anchors the listbox id (`${id}-suggestions`) and option ids. */
  readonly id: string;
  readonly suggestions: AddressSuggestion[];
  /** Index of the currently highlighted option, or -1. */
  readonly highlightedIndex: number;
  /** Called when an option is selected (click / mouse-down). */
  readonly onSelect: (suggestion: AddressSuggestion) => void;
  /** Called when an option is hovered, to sync the highlight. */
  readonly onHighlight: (index: number) => void;
}
```

Renders `role="listbox"` with `role="option"` children carrying `aria-selected`;
selection is via `onMouseDown` with `preventDefault` (so the input keeps focus).

---

## `@openzeppelin/ui-react`

### `useRuntimeNameResolver(): NameResolver`

Projects the active adapter runtime's name-resolution capability into the injected
`NameResolver` seam. This is the hook an app (or the renderer, which does it for you)
spreads into `NameResolverProvider`:

```tsx
<NameResolverProvider {...useRuntimeNameResolver()}>{form}</NameResolverProvider>
```

**Shared cache.** Each `resolveName` call is backed by the react layer's owned
resolution `QueryClient` (`fetchQuery`), reusing the exact query-key convention of the
`useResolveName` hook — a name resolved through the field and the same name resolved by
a bare `useResolveName` hit the **same** cache entry: shared cache, dedupe, and
out-of-order safety, never a parallel cache. The hook-layer retry policy applies
(transient errors retried up to the configured cap; definitive negatives never).

**Degradation ladder** (all method-omission, never a throw):

| Environment | Returned resolver | Field behavior on a typed name |
|---|---|---|
| No `WalletStateProvider` mounted | `{}` (empty) | `UNSUPPORTED_NETWORK`, zero calls |
| No active runtime, or runtime without the capability | `{}` (empty) | `UNSUPPORTED_NETWORK`, zero calls |
| Capability without `resolveName` | `{ isValidName }` only | `UNSUPPORTED_NETWORK`, zero calls |
| Full capability | `{ isValidName, resolveName }` | resolves inline |

When the capability is present but the *network* is unsupported, the adapter's
`resolveName` resolves `{ ok: false, error: UNSUPPORTED_NETWORK }` and that result
passes through unchanged. The returned resolver is referentially stable for a given
runtime/network, so the provider does not churn the field's resolution machine.

No `NameResolutionProvider` is required — the react layer falls back to a zero-config
default query client when none is mounted. Mount one only to override cache/retry
configuration.

---

## `@openzeppelin/ui-renderer`

SF-3 adds **no renderer exports**. The renderer participates in two internal ways:

- **`fieldRegistry`** binds the `'blockchain-address'` field type to the base
  `AddressField` from `@openzeppelin/ui-components` — the same component as before the
  feature; there is no ENS-specific field component.
- **`TransactionForm`** mounts `<NameResolverProvider {...useRuntimeNameResolver()}
  activeNetworkId={…} activeNetworkName={…}>` around the forms it renders (wallet
  state read via safe context access — no throw when wallet-less), so every address
  field below it resolves names through the active runtime with coinType chain-scope
  gating wired.
- **`AddAliasDialog`** (address book) passes the same network props on its local
  `NameResolverProvider` when name resolution is enabled.

---

## Error codes

Resolution never throws. Every failure is one of these seven `NameResolutionError`
codes. `nameResolutionMessageForCode` maps each to a distinct message — no catch-all
collapses two codes into one. `{network}` is the caller-supplied network name, or
"this network" (inside `AddressField` the identifier comes from the error's own
`networkId` — the component never reads a runtime).

| `code` | Cause (input side) | Message | Retry? | Submit |
|---|---|---|---|---|
| `NAME_NOT_FOUND` | Name has no forward record | "No address is registered for this name." | no | gated |
| `UNSUPPORTED_NAME` | Not a valid name in this system (wrong TLD) | "This is not a valid name on {network}." | no | gated |
| `UNSUPPORTED_NETWORK` | Network/adapter/runtime has no resolution capability | "Name resolution is not supported on {network}." | no | gated |
| `RESOLUTION_TIMEOUT` | Adapter timeout budget exceeded | "Name resolution timed out. Try again." | **yes** | gated |
| `EXTERNAL_GATEWAY_ERROR` | Off-chain resolution service unreachable | "Could not reach the name resolution service. Try again." | **yes** | gated |
| `ADAPTER_ERROR` | Adapter-internal / unclassified failure | "Could not resolve this name. Try again." | **yes** | gated |
| `ADDRESS_NOT_FOUND` | Reverse-only code | "No name is registered for this address." | n/a | n/a |

- **Retry** is offered only for the three transient codes. The three definitive negatives
  show no retry (retrying can't change the outcome).
- `ADDRESS_NOT_FOUND` is a reverse-resolution code, unreachable on the forward input path;
  it is mapped for completeness.
- A resolution failure is **never** rendered as the legacy "Invalid address format for
  the selected chain" — that message survives only for genuine malformed (non-name,
  non-hex) input.
