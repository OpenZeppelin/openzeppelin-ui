/**
 * Convenience hook for reading a reverse name record from the nearest
 * `AddressNameProvider`.
 *
 * Kept in its own file so that `address-name-context.tsx` exports only
 * components (required by React Fast Refresh) — mirrors `use-address-label.ts`.
 */
import * as React from 'react';

import type { ResolvedName } from '@openzeppelin/ui-types';

import { AddressNameContext } from './context';

/**
 * Return type for the `useAddressName` convenience hook.
 */
export interface UseAddressNameResult {
  /** Resolved record, or `undefined` if no provider/record exists */
  record: ResolvedName | undefined;
}

/**
 * Reads the `AddressNameContext` for one address, synchronously (INV-122).
 * Returns `{ record: undefined }` when no provider is mounted — never throws,
 * never suspends. Note the record is returned verbatim: callers rendering a
 * name from it must apply the same `forwardVerified === true` gate that
 * `AddressDisplay` applies (INV-52).
 *
 * @param address - The blockchain address to reverse-resolve
 * @param networkId - Optional network identifier scoping the lookup
 * @returns The current best-known record for the address
 *
 * @example
 * ```tsx
 * function EnsBadge({ address }: { address: string }) {
 *   const { record } = useAddressName(address);
 *   return record?.forwardVerified ? <Badge>{record.name}</Badge> : null;
 * }
 * ```
 */
export function useAddressName(address: string, networkId?: string): UseAddressNameResult {
  const resolver = React.useContext(AddressNameContext);

  return { record: resolver?.resolveAddressName(address, networkId) };
}
