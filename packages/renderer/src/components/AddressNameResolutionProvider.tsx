import * as React from 'react';

import { AddressNameProvider } from '@openzeppelin/ui-components';
import {
  useResolveAddress,
  WalletStateContext,
  type UseResolveAddressOptions,
} from '@openzeppelin/ui-react';

/**
 * Props for {@link AddressNameResolutionProvider}.
 */
export interface AddressNameResolutionProviderProps {
  /**
   * Address to reverse-resolve for the wrapped subtree. `null` / `undefined`
   * issues no resolution (the SF-2 hook stays `idle`) — descendants render
   * plain hex, byte-identical to no provider (INV-54).
   */
  readonly address: string | null | undefined;

  /**
   * Network that scopes this reverse lookup. When set, the resolved name is
   * served only when the display request's `networkId` matches AND the active
   * wallet network (the network the resolution actually ran on) matches —
   * so a row scoped to network A never surfaces a name resolved on network B.
   */
  readonly networkId?: string;

  /**
   * Forwarded verbatim to `useResolveAddress` — `enabled` (e.g. gate on row
   * visibility for long lists) and `debounceMs`. Gating lives here in the
   * react layer, never in the base component (INV-63).
   */
  readonly options?: UseResolveAddressOptions;

  readonly children: React.ReactNode;
}

/**
 * Async→sync bridge feeding SF-4's value seam: owns the async
 * `useResolveAddress` call (SF-2) and supplies the resulting `ResolvedName`
 * to descendant `<AddressDisplay>`s through the synchronous
 * `AddressNameProvider` (INV-120/122). This keeps the base component
 * capability-free (INV-121) — it reads a value; this provider does the
 * resolving.
 *
 * The hook's four states collapse to the seam's value domain (INV-65):
 * idle / loading / error → `undefined` (descendants render hex, progressive
 * enhancement INV-61); `resolved` → the record VERBATIM — including
 * `forwardVerified: false` (SF-2 INV-25 passthrough): suppress-to-hex is the
 * display's job (INV-52), not this bridge's.
 *
 * One provider resolves ONE address (the per-instance feed the design names
 * the zero-ambiguity primary channel). Subtree-wide multi-address feeding —
 * cold-resolution strategy, batching — is SF-5's concern.
 *
 * @example
 * ```tsx
 * <AddressNameResolutionProvider address={entry.address} networkId={entry.networkId}>
 *   <AddressDisplay address={entry.address} networkId={entry.networkId} showCopyButton />
 * </AddressNameResolutionProvider>
 * ```
 */
export function AddressNameResolutionProvider({
  address,
  networkId,
  options,
  children,
}: AddressNameResolutionProviderProps): React.ReactElement {
  const rev = useResolveAddress(address ?? null, options);

  const record = rev.status === 'resolved' ? rev.data : undefined;

  // Soft read — resolution runs against the active wallet network; used below
  // to refuse serving a record onto a differently-scoped alias row.
  const walletState = React.useContext(WalletStateContext);
  const resolutionNetworkId = walletState?.activeNetworkId ?? undefined;

  // Serve the record only for the address + network this provider resolves.
  // Address compared case-insensitively: the display asks with its original
  // checksum-preserving prop (INV-53 — the record's lowercased echo is never
  // used for rendering), which may differ from this provider's `address` only
  // by case. Network scoped so a row on network A never shows a name reverse-
  // resolved on active network B.
  const resolveAddressName = React.useCallback(
    (requested: string, requestedNetworkId?: string) => {
      if (record === undefined || address == null) return undefined;
      if (requested.toLowerCase() !== address.toLowerCase()) return undefined;

      if (networkId !== undefined) {
        if (requestedNetworkId !== undefined && requestedNetworkId !== networkId) {
          return undefined;
        }
        if (resolutionNetworkId !== undefined && resolutionNetworkId !== networkId) {
          return undefined;
        }
      }

      return record;
    },
    [record, address, networkId, resolutionNetworkId]
  );

  return (
    <AddressNameProvider resolveAddressName={resolveAddressName}>{children}</AddressNameProvider>
  );
}
