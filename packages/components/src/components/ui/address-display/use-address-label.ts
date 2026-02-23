/**
 * Convenience hook for resolving an address label from the nearest
 * `AddressLabelProvider`.
 *
 * Kept in its own file so that `address-label-context.tsx` exports only
 * components (required by React Fast Refresh).
 */
import * as React from 'react';

import { AddressLabelContext } from './context';

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
