import * as React from 'react';

import { AddressNameProvider } from '@openzeppelin/ui-components';
import { useResolveAddress, type UseResolveAddressOptions } from '@openzeppelin/ui-react';
import type { NetworkConfig, NetworkLabelResolver } from '@openzeppelin/ui-types';
import { isChainScopeMismatch } from '@openzeppelin/ui-utils';

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
   * Row network that scopes reverse display. When set, the resolved name is
   * served when the display request's `networkId` matches and provenance scope
   * allows it: globally scoped records (no non-empty `scopedToNetworkId`) pass
   * on any row network; network-local records pass only when
   * `scopedToNetworkId` strictly equals this id.
   */
  readonly networkId?: string;

  /**
   * When set, reverse resolution uses this network's runtime via
   * {@link RuntimeProvider} instead of the wallet-global active runtime.
   * When both `network` and `networkId` are set, `network.id` is authoritative
   * for scope gating so resolution and display cannot diverge.
   */
  readonly network?: NetworkConfig;

  /**
   * Forwarded to `useResolveAddress` — `enabled` (e.g. gate on row visibility
   * for long lists) and `debounceMs`. Gating lives here in the react layer,
   * never in the base component (INV-63).
   */
  readonly options?: Omit<UseResolveAddressOptions, 'network'>;

  /**
   * Optional network slug → display name; forwarded to `AddressNameProvider`.
   */
  readonly resolveNetworkLabel?: NetworkLabelResolver;

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
 * When `networkId` is set, provenance scope gating (INV-151..153) suppresses
 * the record via `isChainScopeMismatch(record.provenance, networkId)` — wallet
 * active network is never consulted (INV-154). Unscoped rows skip scope gating
 * (INV-155).
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
  network,
  options,
  resolveNetworkLabel,
  children,
}: AddressNameResolutionProviderProps): React.ReactElement {
  const rowNetworkId = network?.id ?? networkId;

  const rev = useResolveAddress(
    address ?? null,
    network != null ? { ...options, network } : options
  );

  const record = rev.status === 'resolved' ? rev.data : undefined;

  // Serve the record only for the address + network this provider resolves.
  // Address compared case-insensitively: the display asks with its original
  // checksum-preserving prop (INV-53 — the record's lowercased echo is never
  // used for rendering), which may differ from this provider's `address` only
  // by case. Provenance scope gating (INV-151..153) keys on base
  // `scopedToNetworkId` vs row `networkId` — not wallet active network.
  const resolveAddressName = React.useCallback(
    (requested: string, requestedNetworkId?: string) => {
      if (record === undefined || address == null) return undefined;
      if (requested.toLowerCase() !== address.toLowerCase()) return undefined;

      if (rowNetworkId !== undefined) {
        // INV-157: display and provider row networks must agree.
        if (requestedNetworkId !== undefined && requestedNetworkId !== rowNetworkId) {
          return undefined;
        }
        // INV-152: suppress network-local provenance mismatches (INV-133).
        if (isChainScopeMismatch(record.provenance, rowNetworkId)) {
          return undefined;
        }
      }

      return record;
    },
    [record, address, rowNetworkId]
  );

  return (
    <AddressNameProvider
      resolveAddressName={resolveAddressName}
      resolveNetworkLabel={resolveNetworkLabel}
    >
      {children}
    </AddressNameProvider>
  );
}
