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

// ============================================================================
// Hook
// ============================================================================

/**
 * Return type for the `useAddressLabel` convenience hook.
 */
export interface UseAddressLabelResult {
  /** Resolved label, or `undefined` if no resolver/label exists */
  label: string | undefined;
  /** Edit handler bound to this address, or `undefined` if editing is not supported */
  onEdit: (() => void) | undefined;
}

/**
 * Convenience hook that resolves a label for a specific address using the
 * nearest `AddressLabelProvider`. Returns `undefined` values when no provider
 * is mounted.
 *
 * @param address - The blockchain address to resolve
 * @param networkId - Optional network identifier for network-specific aliases
 * @returns Resolved label and edit handler for the address
 *
 * @example
 * ```tsx
 * function MyAddress({ address }: { address: string }) {
 *   const { label, onEdit } = useAddressLabel(address, 'ethereum-mainnet');
 *   return <span>{label ?? address}</span>;
 * }
 * ```
 */
export function useAddressLabel(address: string, networkId?: string): UseAddressLabelResult {
  const resolver = React.useContext(AddressLabelContext);

  const label = resolver?.resolveLabel(address, networkId);
  const onEdit = resolver?.onEditLabel
    ? () => resolver.onEditLabel!(address, networkId)
    : undefined;

  return { label, onEdit };
}
