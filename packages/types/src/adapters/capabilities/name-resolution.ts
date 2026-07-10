import type { ResolutionResult, ResolvedAddress, ResolvedName } from '../../common/name-resolution';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 2** — Name → address and address → name resolution for the active
 * network.
 *
 * Extends {@link RuntimeCapability}: the network context is bound at factory
 * time (`CapabilityFactoryMap.nameResolution(config)`) and immutable for the
 * capability's lifetime. There is no `setNetwork` / `switchNetwork` method —
 * switching networks requires disposing the capability and constructing a new
 * one.
 *
 * Both directional methods are optional at the type level so that:
 *  - a system supporting only forward resolution can omit `resolveAddress`,
 *  - a system supporting only reverse can omit `resolveName`,
 *  - adapters for chains without a name-resolution service can omit the whole
 *    capability from their `CapabilityFactoryMap` and `EcosystemRuntime`.
 *
 * The synchronous `isValidName` helper is always required — it lets UI
 * pre-check input shape without a round-trip and is the cheapest way to
 * short-circuit resolution attempts on non-name inputs (e.g. raw hex).
 *
 * Feature detection is structural: `if (capability.resolveName) { ... }`. No
 * separate `supportsForward()` method exists.
 *
 * @remarks
 * All resolution methods return a discriminated {@link ResolutionResult} and
 * MUST NOT throw for expected failure paths (name not found, network
 * unsupported, external-gateway error, timeout). Only unexpected internal
 * failures (a bug in the adapter, an invariant violation) may throw. This is
 * the type-level guarantee downstream input validation relies on: no path
 * silently coerces an unresolved name into a hex address.
 */
export interface NameResolutionCapability extends RuntimeCapability {
  /**
   * Synchronous shape check — is `name` well-formed for this system's naming
   * convention? No network I/O.
   *
   * Used by input-side UI to distinguish "user is typing a name" from "user is
   * typing a hex address" without incurring a resolution call.
   *
   * @param name - Raw input string to shape-check.
   * @returns `true` if `name` is syntactically a name in this system.
   *
   * @remarks
   * Returning `true` is a *necessary* condition for resolution, not sufficient
   * — a syntactically valid name may still not resolve.
   */
  isValidName(name: string): boolean;

  /**
   * Forward resolution: name → address. Optional; omit when the adapter does
   * not support forward lookups.
   *
   * @param name - The name to resolve. Consumers should typically have passed
   *   it through {@link NameResolutionCapability.isValidName} first, but
   *   implementations MUST handle malformed input by returning
   *   `UNSUPPORTED_NAME`, never by throwing.
   * @returns A discriminated result. On `ok: true`, `value` carries the
   *   resolved address plus provenance. On `ok: false`, `error` is a typed
   *   {@link NameResolutionError}.
   */
  resolveName?(name: string): Promise<ResolutionResult<ResolvedAddress>>;

  /**
   * Reverse resolution: address → name. Optional; omit when the adapter does
   * not support reverse lookups.
   *
   * @param address - The address to look up.
   * @returns A discriminated result. On `ok: true`, `value` carries the
   *   resolved name plus provenance and a `forwardVerified` flag.
   *
   * @remarks
   * Implementations SHOULD attempt forward-verification
   * (`forward(name) === address`) and report the outcome via
   * `ResolvedName.forwardVerified`. Skipping forward-verify for latency reasons
   * is allowed provided `forwardVerified: false` is set — the caller decides
   * what to render.
   */
  resolveAddress?(address: string): Promise<ResolutionResult<ResolvedName>>;
}
