/**
 * Address Suggestion Types
 *
 * Generic interface for providing address autocomplete suggestions.
 * Consumed by `AddressField` via `AddressSuggestionContext` in `@openzeppelin/ui-components`.
 *
 * Implementations may use alias storage, ENS, an address book API, or any other source.
 * The interface is intentionally storage-agnostic to preserve the library's
 * layered architecture (ui-types → ui-components → ui-storage).
 */

/**
 * A single address suggestion displayed in the autocomplete dropdown.
 *
 * @example
 * ```typescript
 * const suggestion: AddressSuggestion = {
 *   label: 'Treasury',
 *   value: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
 *   description: 'Main treasury wallet',
 * };
 * ```
 */
export interface AddressSuggestion {
  /** Human-readable label for the suggestion (e.g., alias name) */
  label: string;
  /** The blockchain address to fill when selected */
  value: string;
  /** Optional secondary text (e.g., network name or description) */
  description?: string;
}

/**
 * Generic interface for resolving address suggestions from a query string.
 *
 * The `resolveSuggestions` function is called on every input change (after
 * debouncing) and **must be synchronous**. Implementations should maintain
 * an in-memory data source (e.g., Dexie `useLiveQuery`) and filter from it.
 *
 * @example
 * ```typescript
 * const resolver: AddressSuggestionResolver = {
 *   resolveSuggestions: (query) =>
 *     aliases
 *       .filter(a => a.alias.toLowerCase().includes(query.toLowerCase()))
 *       .map(a => ({ label: a.alias, value: a.address })),
 * };
 * ```
 */
export interface AddressSuggestionResolver {
  /**
   * Synchronously resolve a query string into a list of address suggestions.
   *
   * @param query - The current input value to match against
   * @param networkId - Optional network identifier for scoping results
   * @returns Array of matching suggestions, ordered by relevance
   */
  resolveSuggestions: (query: string, networkId?: string) => AddressSuggestion[];
}
