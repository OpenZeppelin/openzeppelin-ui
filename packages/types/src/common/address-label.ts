/**
 * Address Label Resolution Types
 *
 * Generic interface for resolving human-readable labels for blockchain addresses.
 * Consumed by `AddressDisplay` via `AddressLabelContext` in `@openzeppelin/ui-components`.
 *
 * Implementations may use alias storage, ENS, a REST API, or any other source.
 * The interface is intentionally storage-agnostic to preserve the library's
 * layered architecture (ui-types → ui-components → ui-storage).
 *
 * @see {@link AddressLabelResolver} for the main resolver interface
 */

/**
 * Generic interface for resolving human-readable labels for blockchain addresses.
 *
 * The `resolveLabel` function **must be synchronous** because it is called during
 * React render. Implementations should maintain an in-memory cache or reactive
 * data source (e.g., Dexie `useLiveQuery`) and resolve from it synchronously.
 *
 * @example
 * ```typescript
 * // Minimal implementation backed by a static map
 * const resolver: AddressLabelResolver = {
 *   resolveLabel: (address) => addressBook.get(address.toLowerCase()),
 * };
 *
 * // Full implementation with edit support
 * const resolver: AddressLabelResolver = {
 *   resolveLabel: (address, networkId) =>
 *     aliases.find(a => a.address === address && a.networkId === networkId)?.alias,
 *   onEditLabel: (address, networkId) => openEditDialog(address, networkId),
 * };
 * ```
 */
export interface AddressLabelResolver {
  /**
   * Synchronously resolve an address to a human-readable label.
   *
   * @param address - The blockchain address to resolve
   * @param networkId - Optional network identifier (e.g., 'ethereum-mainnet')
   * @returns The label string, or `undefined` if no label exists for this address
   */
  resolveLabel: (address: string, networkId?: string) => string | undefined;

  /**
   * Optional callback to trigger label editing UI for the given address.
   * When provided, `AddressDisplay` renders an edit affordance (e.g., pencil icon).
   *
   * @param address - The blockchain address to edit the label for
   * @param networkId - Optional network identifier
   */
  onEditLabel?: (address: string, networkId?: string) => void;
}
