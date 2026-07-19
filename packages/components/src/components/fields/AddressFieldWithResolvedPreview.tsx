import type * as React from 'react';
import type { FieldValues } from 'react-hook-form';

import { cn } from '@openzeppelin/ui-utils';

import { AddressField, type AddressFieldProps } from './AddressField';
import { ResolvedAddressFieldPreview } from './ResolvedAddressFieldPreview';

export type AddressFieldWithResolvedPreviewProps<TFieldValues extends FieldValues> =
  AddressFieldProps<TFieldValues> & {
    /** Current form value watched from the same field `name`. */
    previewAddress: string | undefined;
    previewNetworkId?: string;
    className?: string;
    /**
     * Replace the default `ResolvedAddressFieldPreview`. Use when reverse
     * resolution needs a custom bridge (e.g. `AddressNameResolutionProvider`).
     */
    preview?: React.ReactNode;
  };

/**
 * `AddressField` plus a rich ENS preview card. Suppresses the redundant forward
 * "Resolved to 0x…" announcer — the preview card below replaces it.
 *
 * Parent must `watch` the field and pass the value as `previewAddress`.
 */
export function AddressFieldWithResolvedPreview<TFieldValues extends FieldValues>({
  previewAddress,
  previewNetworkId,
  addressing,
  className,
  preview,
  showCrossNetworkFallbackDisclaimer,
  showForwardResolutionSuccessAnnouncer,
  ...addressFieldProps
}: AddressFieldWithResolvedPreviewProps<TFieldValues>): React.ReactElement {
  return (
    <div
      className={cn(
        'space-y-1',
        // AddressField reserves min-h-5 for the aria-live announcer even when empty
        // (success suppressed). Collapse it so the preview card sits closer.
        '[&_[id$="-resolution"]:empty]:min-h-0',
        className
      )}
    >
      <AddressField
        {...addressFieldProps}
        addressing={addressing}
        // Suppress forward success copy by default — the preview card below replaces it.
        // Conditional suppression raced the form watch: the announcer rendered on the
        // resolution frame before previewAddress caught up with the resolved hex write.
        showCrossNetworkFallbackDisclaimer={showCrossNetworkFallbackDisclaimer ?? false}
        showForwardResolutionSuccessAnnouncer={showForwardResolutionSuccessAnnouncer ?? false}
      />
      {preview ?? (
        <ResolvedAddressFieldPreview
          address={previewAddress}
          networkId={previewNetworkId}
          addressing={addressing}
        />
      )}
    </div>
  );
}
