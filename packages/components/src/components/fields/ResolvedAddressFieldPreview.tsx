import type { AddressingCapability, ResolvedName } from '@openzeppelin/ui-types';

import { AddressDisplay, type AddressDisplayProps } from '../ui/address-display';

export interface ResolvedAddressFieldPreviewProps {
  /** Resolved form value from AddressField (hex after ENS forward resolution). */
  address: string | undefined;
  networkId?: string;
  addressing?: AddressingCapability;
  /**
   * Optional pre-resolved name record. Shadows `AddressNameContext` when set.
   * Omit when a parent `AddressNameProvider` feeds reverse resolution.
   */
  resolvedName?: ResolvedName;
  /** Heading above the display. @default "Resolved account" */
  label?: string;
  /** Props forwarded to the inner `AddressDisplay` (excluding `address` / `networkId`). */
  displayProps?: Omit<AddressDisplayProps, 'address' | 'networkId'>;
}

/**
 * Rich ENS preview shown below an `AddressField` once the value is a valid address.
 * Complements the field's mechanism-neutral "Resolved to 0x…" announcer with
 * reverse-resolved name + avatar via `AddressDisplay`.
 *
 * For async reverse resolution, wrap in `AddressNameProvider` (or
 * `AddressNameResolutionProvider` from `@openzeppelin/ui-renderer`) and omit
 * `resolvedName`. For sync / app-owned resolution, pass `resolvedName` directly.
 */
export function ResolvedAddressFieldPreview({
  address,
  networkId,
  addressing,
  resolvedName,
  label = 'Resolved account',
  displayProps,
}: ResolvedAddressFieldPreviewProps): React.ReactElement | null {
  const trimmed = address?.trim() ?? '';
  const showPreview = trimmed !== '' && addressing?.isValidAddress(trimmed) === true;

  if (!showPreview) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
      aria-label="Resolved address preview"
    >
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <AddressDisplay
        address={trimmed}
        networkId={networkId}
        variant="chip"
        showCopyButton
        resolvedName={resolvedName}
        {...displayProps}
      />
    </div>
  );
}
