/**
 * Convenience hook that resolves suggestions for a query string using the
 * nearest `AddressSuggestionProvider`. Returns an empty array when no provider
 * is mounted or when the query is empty.
 *
 * @param query - Current input value to match against
 * @param networkId - Optional network identifier for scoping results
 * @returns Object containing the resolved suggestions array
 *
 * @example
 * ```tsx
 * function MyField({ query }: { query: string }) {
 *   const { suggestions } = useAddressSuggestions(query, 'ethereum-mainnet');
 *   return (
 *     <ul>
 *       {suggestions.map(s => <li key={s.value}>{s.label}</li>)}
 *     </ul>
 *   );
 * }
 * ```
 */
import * as React from 'react';

import type { AddressSuggestion } from '@openzeppelin/ui-types';

import { AddressSuggestionContext } from './context';

/**
 * Return type for the `useAddressSuggestions` convenience hook.
 */
export interface UseAddressSuggestionsResult {
  /** Resolved suggestions for the current query */
  suggestions: AddressSuggestion[];
}

/** Resolves address suggestions from the nearest `AddressSuggestionProvider`. */
export function useAddressSuggestions(
  query: string,
  networkId?: string
): UseAddressSuggestionsResult {
  const resolver = React.useContext(AddressSuggestionContext);

  const suggestions = React.useMemo(() => {
    if (!resolver || !query.trim()) return [];
    return resolver.resolveSuggestions(query, networkId);
  }, [resolver, query, networkId]);

  return { suggestions };
}
