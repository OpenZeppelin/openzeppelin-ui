/**
 * Address Name Context
 *
 * Provides a React context for surfacing already-resolved reverse name
 * records (`ResolvedName`) for blockchain addresses. When an
 * `AddressNameProvider` is mounted, every `AddressDisplay` in the subtree
 * reads its record synchronously — no call-site changes — and renders the
 * name/avatar only when the record is forward-verified (INV-52).
 *
 * Structural mirror of `AddressLabelProvider` (INV-122): synchronous,
 * value-only, no-op by default. The resolver implementation lives in the
 * react/renderer layer, which bridges async resolution state into this
 * synchronous read; this file stays capability-free (INV-121).
 *
 * @example
 * ```tsx
 * import { AddressNameProvider } from '@openzeppelin/ui-components';
 *
 * <AddressNameProvider resolveAddressName={readFromResolutionCache}>
 *   <TxHistory />  {// rows are plain <AddressDisplay/> — verified names fill in }
 * </AddressNameProvider>
 * ```
 */
import * as React from 'react';

import type { AddressNameResolver } from '@openzeppelin/ui-types';

import { AddressNameContext } from './context';

/**
 * Props for `AddressNameProvider`.
 *
 * Accepts the same shape as `AddressNameResolver` so the provider can be
 * spread directly from a resolver source: `<AddressNameProvider {...resolver}>`.
 */
export interface AddressNameProviderProps extends AddressNameResolver {
  children: React.ReactNode;
}

/**
 * Provides reverse-name resolution to all `AddressDisplay` instances in the
 * subtree. `resolveAddressName` MUST be synchronous — it is called during
 * render (INV-122). A resolver that returns `undefined` for an address is
 * behaviorally identical to mounting no provider (INV-54).
 *
 * @param props - Resolver function and children
 */
export function AddressNameProvider({
  children,
  resolveAddressName,
}: AddressNameProviderProps): React.ReactElement {
  const value = React.useMemo<AddressNameResolver>(
    () => ({ resolveAddressName }),
    [resolveAddressName]
  );

  return <AddressNameContext.Provider value={value}>{children}</AddressNameContext.Provider>;
}
