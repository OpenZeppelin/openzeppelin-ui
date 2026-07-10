/**
 * Address Name Resolution Types
 *
 * Value-only injection seam for **reverse** name resolution (address → name)
 * into the chain-agnostic display surface (SF-4). Structural sibling of
 * {@link AddressLabelResolver} in `address-label.ts`: same location, same
 * synchronous `resolve*(address, networkId?)` shape, consumed by
 * `AddressDisplay` via `AddressNameContext` in `@openzeppelin/ui-components`.
 *
 * Deliberately a SIBLING rather than a widening of `AddressLabelResolver`
 * (SF-4 design decision 4): the name channel carries a rich record
 * ({@link ResolvedName} — name + avatar + provenance + verification), not a
 * bare label string.
 *
 * This interface references value types only — never the runtime
 * `NameResolutionCapability` and never a `Promise` — so
 * `@openzeppelin/ui-components` stays chain-agnostic and capability-free
 * (SF-4 INV-121, LOCKED). All async resolution (`useResolveAddress`,
 * caching, retry policy) lives in the react/renderer layer, which bridges
 * its state into this synchronous read.
 */
import type { ResolvedName } from './name-resolution';

/**
 * Synchronous, value-only resolver surfacing an already-resolved reverse
 * name record for an address.
 *
 * `resolveAddressName` **must be synchronous** — it is called during React
 * render (no promises, no side effects), exactly like
 * `AddressLabelResolver.resolveLabel`. Implementations resolve from an
 * in-memory cache or reactive source and return the current best-known
 * record, or `undefined` when none is available. Idle, loading, no-record,
 * and error upstream states all collapse to `undefined` at this seam
 * (SF-4 INV-65); a record with `forwardVerified: false` is passed through
 * verbatim — suppression is the display's job (SF-4 INV-52).
 *
 * @example
 * ```typescript
 * // Minimal implementation backed by a pre-resolved map
 * const resolver: AddressNameResolver = {
 *   resolveAddressName: (address) => resolvedRecords.get(address.toLowerCase()),
 * };
 * ```
 */
export interface AddressNameResolver {
  /**
   * Synchronously resolve an address to its reverse name record.
   *
   * Named `resolveAddressName` (address → record) — deliberately DISTINCT
   * from the forward async `NameResolver.resolveName` (name → address), so
   * the reverse direction is unmistakable at a call-site (SF-4 design,
   * dev-resolved 2026-07-06).
   *
   * @param address - The blockchain address to reverse-resolve
   * @param networkId - Optional network identifier scoping the lookup
   *   (mirrors `AddressLabelResolver.resolveLabel`)
   * @returns The current best-known {@link ResolvedName}, or `undefined`
   *   when none is available
   */
  resolveAddressName: (address: string, networkId?: string) => ResolvedName | undefined;
}
