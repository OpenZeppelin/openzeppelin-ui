/**
 * Address Suggestion Context
 *
 * Provides a React context for resolving address autocomplete suggestions.
 * When an `AddressSuggestionProvider` is mounted, every `AddressField`
 * in the subtree automatically renders a suggestion dropdown as the user types.
 *
 * @example
 * ```tsx
 * import { AddressSuggestionProvider } from '@openzeppelin/ui-components';
 * import { useAliasSuggestionResolver } from '@openzeppelin/ui-storage';
 *
 * function App() {
 *   const resolver = useAliasSuggestionResolver(db);
 *   return (
 *     <AddressSuggestionProvider {...resolver}>
 *       <MyApp />
 *     </AddressSuggestionProvider>
 *   );
 * }
 * ```
 */
import * as React from 'react';

import type { AddressSuggestionResolver } from '@openzeppelin/ui-types';

import { AddressSuggestionContext } from './context';

/**
 * Props for `AddressSuggestionProvider`.
 *
 * Accepts the same shape as `AddressSuggestionResolver` so the provider can be
 * spread directly from a resolver hook: `<AddressSuggestionProvider {...resolver}>`.
 */
export interface AddressSuggestionProviderProps extends AddressSuggestionResolver {
  children: React.ReactNode;
}

/**
 * Provides address suggestion resolution to all `AddressField` instances in the
 * subtree. Wrap your application (or a subsection) with this provider and
 * supply a `resolveSuggestions` function.
 *
 * @param props - Resolver function and children
 *
 * @example
 * ```tsx
 * <AddressSuggestionProvider
 *   resolveSuggestions={(query, networkId) => filterAliases(query, networkId)}
 * >
 *   <App />
 * </AddressSuggestionProvider>
 * ```
 */
export function AddressSuggestionProvider({
  children,
  resolveSuggestions,
}: AddressSuggestionProviderProps): React.ReactElement {
  const value = React.useMemo<AddressSuggestionResolver>(
    () => ({ resolveSuggestions }),
    [resolveSuggestions]
  );

  return (
    <AddressSuggestionContext.Provider value={value}>{children}</AddressSuggestionContext.Provider>
  );
}
