import type * as React from 'react';

import {
  ResolvedAddressFieldPreview,
  type ResolvedAddressFieldPreviewProps,
} from '@openzeppelin/ui-components';
import type { NetworkConfig } from '@openzeppelin/ui-types';

import { AddressNameResolutionProvider } from './AddressNameResolutionProvider';

export interface ResolvedAddressFieldPreviewWithNameResolutionProps
  extends ResolvedAddressFieldPreviewProps {
  /**
   * When set, reverse resolution (name + avatar) uses this network's runtime via
   * {@link RuntimeProvider} instead of the wallet-global active runtime.
   */
  readonly network?: NetworkConfig;
}

/**
 * `ResolvedAddressFieldPreview` wired to async reverse resolution via
 * `AddressNameResolutionProvider` (`useResolveAddress` under the hood).
 *
 * Use in wallet-runtime apps; pass `network` when the preview network may differ
 * from the wallet-global runtime (e.g. address-book Add Alias dropdown). For
 * contract-scoped or custom runtimes pass `resolvedName` to the base preview or
 * supply a custom `preview` slot on `AddressFieldWithResolvedPreview`.
 */
export function ResolvedAddressFieldPreviewWithNameResolution({
  network,
  ...props
}: ResolvedAddressFieldPreviewWithNameResolutionProps): React.ReactElement | null {
  const trimmed = props.address?.trim() ?? '';
  const showPreview = trimmed !== '' && props.addressing?.isValidAddress(trimmed) === true;

  if (!showPreview) {
    return null;
  }

  return (
    <AddressNameResolutionProvider
      address={trimmed}
      networkId={network?.id ?? props.networkId}
      network={network}
    >
      <ResolvedAddressFieldPreview {...props} address={trimmed} />
    </AddressNameResolutionProvider>
  );
}
