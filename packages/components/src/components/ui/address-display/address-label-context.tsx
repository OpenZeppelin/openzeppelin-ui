/**
 * Address Label Context
 *
 * Provides a React context for resolving human-readable labels for blockchain
 * addresses. When an `AddressLabelProvider` is mounted, every `AddressDisplay`
 * in the subtree automatically resolves and renders labels without any
 * call-site changes.
 *
 * @example
 * ```tsx
 * import { AddressLabelProvider } from '@openzeppelin/ui-components';
 *
 * function App() {
 *   const resolver = useAliasLabelResolver(db);
 *   return (
 *     <AddressLabelProvider {...resolver}>
 *       <MyApp />
 *     </AddressLabelProvider>
 *   );
 * }
 * ```
 */
import * as React from 'react';

import type { AddressLabelResolver } from '@openzeppelin/ui-types';

import { AddressLabelContext } from './context';

// ============================================================================
// Provider
// ============================================================================

/**
 * Props for `AddressLabelProvider`.
 *
 * Accepts the same shape as `AddressLabelResolver` so the provider can be
 * spread directly from a resolver hook: `<AddressLabelProvider {...resolver}>`.
 */
export interface AddressLabelProviderProps extends AddressLabelResolver {
  children: React.ReactNode;
}

/**
 * Provides address label resolution to all `AddressDisplay` instances in the
 * subtree. Wrap your application (or a subsection) with this provider and
 * supply a `resolveLabel` function.
 *
 * @param props - Resolver functions and children
 *
 * @example
 * ```tsx
 * <AddressLabelProvider
 *   resolveLabel={(addr) => addressBook.get(addr)}
 *   onEditLabel={(addr) => openEditor(addr)}
 * >
 *   <App />
 * </AddressLabelProvider>
 * ```
 */
export function AddressLabelProvider({
  children,
  resolveLabel,
  onEditLabel,
}: AddressLabelProviderProps): React.ReactElement {
  const value = React.useMemo<AddressLabelResolver>(
    () => ({ resolveLabel, onEditLabel }),
    [resolveLabel, onEditLabel]
  );

  return <AddressLabelContext.Provider value={value}>{children}</AddressLabelContext.Provider>;
}
