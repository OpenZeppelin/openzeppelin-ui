import * as React from 'react';

import { AddressNameProvider } from '@openzeppelin/ui-components';
import { useResolveAddress, type UseResolveAddressOptions } from '@openzeppelin/ui-react';

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
 * <AddressNameResolutionProvider address={entry.address}>
 *   <AddressDisplay address={entry.address} showCopyButton />
 * </AddressNameResolutionProvider>
 * ```
 */
export function AddressNameResolutionProvider({
  address,
  options,
  children,
}: AddressNameResolutionProviderProps): React.ReactElement {
  const rev = useResolveAddress(address ?? null, options);

  const record = rev.status === 'resolved' ? rev.data : undefined;

  // Serve the record only for the address this provider resolves. Compared
  // case-insensitively: the display asks with its original checksum-preserving
  // prop (INV-53 — the record's lowercased echo is never used for rendering),
  // which may differ from this provider's `address` only by case.
  const resolveAddressName = React.useCallback(
    (requested: string) =>
      record !== undefined && address != null && requested.toLowerCase() === address.toLowerCase()
        ? record
        : undefined,
    [record, address]
  );

  return (
    <AddressNameProvider resolveAddressName={resolveAddressName}>{children}</AddressNameProvider>
  );
}
