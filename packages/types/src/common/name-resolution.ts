/**
 * Name Resolution Types
 *
 * Chain-agnostic value types and error taxonomy for name → address (forward)
 * and address → name (reverse) resolution. Consumed by the
 * {@link NameResolutionCapability} in `adapters/capabilities/name-resolution`
 * and by downstream UI (React hooks, address display, address book).
 *
 * This module is intentionally **types-only** — it exports no runtime values,
 * no classes, and no constants. Every field is `readonly`; addresses and names
 * are plain `string` (never ecosystem-branded), keeping `@openzeppelin/ui-types`
 * dependency-free and usable by non-EVM adapters.
 *
 * Ecosystem-specific detail (ENS v1/v2, CCIP-Read, Namechain scoping) is
 * *never* modeled here. Adapters extend {@link ResolutionProvenance} with their
 * own interfaces and export type guards for downstream narrowing.
 *
 * @see {@link NameResolutionCapability} for the capability that returns these types
 */

/**
 * Chain-agnostic provenance record accompanying every resolution result.
 *
 * This is the minimal universal surface — it carries only what a chain-agnostic
 * UI needs to render provenance sensibly:
 *  - a human-readable label (universal),
 *  - trust / latency posture (`external` — universal),
 *  - network scoping (a correctness concern for any system that can produce
 *    network-scoped addresses).
 *
 * Adapters extend this interface with ecosystem-specific fields (e.g., an EVM
 * adapter may add ENS version / mechanism data) and export type guards for
 * downstream narrowing. This package does not enumerate systems, and the base
 * shape has exactly these three fields — no more.
 */
export interface ResolutionProvenance {
  /**
   * Human-readable label of the resolution mechanism, safe to render to the
   * user (e.g. `'ENS'`, `'ENS via external gateway'`, `'SNS'`).
   *
   * Adapter-provided; the UI package never constructs it. This is a **display**
   * string, not a discriminant — downstream code MUST NOT branch on its value
   * (`label === 'ENS'`); ecosystem-aware narrowing uses adapter-exported type
   * guards on the extended provenance type instead.
   */
  readonly label: string;

  /**
   * Whether the resolution went through an external / off-chain gateway
   * (higher latency, weaker trust posture than a canonical on-chain lookup).
   *
   * When `true`, downstream UI may render a provenance marker and expect longer
   * latencies. `false` means the adapter resolved canonically.
   */
  readonly external: boolean;

  /**
   * If present, the resolved address is only valid on this network. UI MUST
   * scope the submitted address to this network or surface a chain-mismatch
   * error. `undefined` means the address is not network-scoped by this
   * resolution.
   */
  readonly scopedToNetworkId?: string;
}

/**
 * Successful reverse-resolution result (address → name).
 */
export interface ResolvedName {
  /** Address the caller asked about (echoed for verification). */
  readonly address: string;

  /** Name the address reverse-resolves to. */
  readonly name: string;

  /**
   * Whether the adapter verified that forward-resolving `name` returns
   * `address`. Always a concrete boolean — never `undefined`.
   *
   * `false` means the reverse record exists but forward-verification failed or
   * was skipped (e.g. for latency). Downstream display code uses this to
   * suppress bare-name rendering of a forward-mismatched address; a `false`
   * value MUST NOT be treated as "assume verified".
   */
  readonly forwardVerified: boolean;

  /** Optional avatar URL if the adapter surfaces one. */
  readonly avatarUrl?: string;

  /** How the result was obtained. */
  readonly provenance: ResolutionProvenance;
}

/**
 * Successful forward-resolution result (name → address).
 */
export interface ResolvedAddress {
  /** Name the caller asked about (echoed for reference / display). */
  readonly name: string;

  /** Address the name forward-resolves to. */
  readonly address: string;

  /** How the result was obtained. */
  readonly provenance: ResolutionProvenance;
}

/**
 * Chain-agnostic name-resolution error taxonomy.
 *
 * A **closed** discriminated union: every expected failure path a resolution
 * call can take has a distinct `code`, letting downstream UI (input validation,
 * v2 UX) render an actionable message per case. Narrowing on `code` narrows the
 * payload.
 *
 * Adapters MUST map their native errors (RPC exceptions, gateway responses,
 * timeouts) into one of these codes and MUST NOT invent codes outside this set
 * — adding a code is a breaking change for consumers with exhaustive `switch`.
 * Implementation-specific detail rides in the free-form fields (`detail`,
 * `message`, `cause`) or in an adapter-exported type guard; this package does
 * not enumerate ecosystem-specific error subtypes.
 *
 * These are plain data objects — this module exports no `Error` subclass, and
 * consumers narrow via the `code` literal, never via `instanceof`.
 */
export type NameResolutionError =
  /** Forward lookup succeeded structurally but no record exists for this name. */
  | { readonly code: 'NAME_NOT_FOUND'; readonly name: string }
  /** Reverse lookup succeeded structurally but no name maps back to this address. */
  | { readonly code: 'ADDRESS_NOT_FOUND'; readonly address: string }
  /**
   * The active network does not support name resolution at all. Distinct from
   * the capability being absent — this is returned when the capability is
   * present but the specific network in the runtime does not support it.
   */
  | { readonly code: 'UNSUPPORTED_NETWORK'; readonly networkId: string }
  /** Input is syntactically not a name in this system (e.g. wrong TLD). */
  | { readonly code: 'UNSUPPORTED_NAME'; readonly name: string; readonly reason: string }
  /** Resolution took longer than the adapter's timeout budget. */
  | { readonly code: 'RESOLUTION_TIMEOUT'; readonly elapsedMs: number }
  /**
   * Resolution went through an external / off-chain gateway and it failed
   * (unreachable, bad signature, malformed response, etc.). `detail` is
   * adapter-supplied free-form text safe to log; downstream code that needs
   * finer discrimination narrows via an adapter type guard, not by parsing
   * `detail`.
   */
  | { readonly code: 'EXTERNAL_GATEWAY_ERROR'; readonly detail: string }
  /**
   * Catch-all for adapter-internal or unclassified failures. `message` is a
   * diagnostic string (safe to log, not necessarily user-facing — render the
   * `code` in user messaging). `cause` carries the underlying error, typed
   * `unknown` — chain-agnostic code MUST NOT narrow it (no `instanceof`, no
   * property access); adapter-exported type guards are the only sanctioned
   * narrowing path.
   */
  | { readonly code: 'ADAPTER_ERROR'; readonly message: string; readonly cause?: unknown };

/**
 * Discriminated result union for name-resolution calls.
 *
 * Consumers MUST check `ok` before accessing `value` or `error` — the two arms
 * share no common non-discriminant field, so `tsc` rejects unnarrowed access.
 * Chosen over throw semantics so that the failure path is un-ignorable at the
 * type level: an unresolved name can never be silently coerced into a hex
 * address downstream.
 *
 * @typeParam T - The success payload ({@link ResolvedAddress} for forward
 *   resolution, {@link ResolvedName} for reverse).
 */
export type ResolutionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: NameResolutionError };

/**
 * Injection seam for **forward** name resolution into the chain-agnostic UI
 * (SF-3). Mirrors the forward half of the runtime `NameResolutionCapability`,
 * but is a plain data contract of injected functions — it references only the
 * value types in this module, never the capability itself — so
 * `@openzeppelin/ui-components` stays capability-free and chain-agnostic.
 *
 * Forward-only by decision (SF-3 OQ4): this seam drives the address *input*
 * field (name → address). Reverse display resolution (address → name) is a
 * separate synchronous value seam owned by SF-4 (`AddressNameResolver` in
 * `address-name.ts`), so no async `resolveAddress` arm exists here.
 *
 * Both methods are optional so a runtime may wire neither or only one. Every
 * method call returns the {@link ResolutionResult} union — provenance rides in
 * `value.provenance`, failure rides in the closed 7-code `error`; the seam adds
 * no new provenance or error type.
 */
export interface NameResolver {
  /**
   * Synchronous name-shape check (the capability's `isValidName`). Lets the
   * field classify input without a round-trip. Absent → the field falls back to
   * its built-in conservative `looksLikeName` heuristic (INV-74) so a
   * name-shaped input on an unsupported network is still routed to the
   * UNSUPPORTED path, not `'malformed'`.
   */
  readonly isValidName?: (name: string) => boolean;

  /**
   * Forward resolution (name → address). Absent → forward resolution is
   * unsupported on this runtime; a name-candidate surfaces
   * `UNSUPPORTED_NETWORK`. MUST resolve the promise with a
   * {@link ResolutionResult} (ok / error) — it MUST NOT reject for expected
   * failures (mirrors the SF-1 / SF-2 no-throw discipline).
   */
  readonly resolveName?: (name: string) => Promise<ResolutionResult<ResolvedAddress>>;
}
