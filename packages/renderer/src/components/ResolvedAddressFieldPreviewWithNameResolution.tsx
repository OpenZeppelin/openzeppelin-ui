import {
  ResolvedAddressFieldPreview,
  type ResolvedAddressFieldPreviewProps,
} from '@openzeppelin/ui-components';

import { AddressNameResolutionProvider } from './AddressNameResolutionProvider';

/**
 * `ResolvedAddressFieldPreview` wired to async reverse resolution via
 * `AddressNameResolutionProvider` (`useResolveAddress` under the hood).
 *
 * Use in wallet-runtime apps; for contract-scoped or custom runtimes pass
 * `resolvedName` to the base preview or supply a custom `preview` slot on
 * `AddressFieldWithResolvedPreview`.
 */
export function ResolvedAddressFieldPreviewWithNameResolution(
  props: ResolvedAddressFieldPreviewProps
): React.ReactElement | null {
  const trimmed = props.address?.trim() ?? '';
  const showPreview = trimmed !== '' && props.addressing?.isValidAddress(trimmed) === true;

  if (!showPreview) {
    return null;
  }

  return (
    <AddressNameResolutionProvider address={trimmed} networkId={props.networkId}>
      <ResolvedAddressFieldPreview {...props} address={trimmed} />
    </AddressNameResolutionProvider>
  );
}
