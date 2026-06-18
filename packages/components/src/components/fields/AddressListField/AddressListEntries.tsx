import { X } from 'lucide-react';

import { AddressDisplay } from '../../ui/address-display';
import { Button } from '../../ui/button';
import type { AddressListFieldLabels } from './labels';

export interface AddressListEntriesProps {
  value: readonly string[];
  getExplorerUrl?: (address: string) => string | null | undefined;
  disabled?: boolean;
  labels: AddressListFieldLabels;
  onRemove: (index: number) => void;
}

/** Renders committed addresses with remove actions. Shared by single and bulk entry modes. */
export function AddressListEntries({
  value,
  getExplorerUrl,
  disabled = false,
  labels,
  onRemove,
}: AddressListEntriesProps) {
  if (value.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{labels.addressesAdded(value.length)}</p>
      <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border/70 p-1">
        {value.map((address, index) => (
          <div
            key={`${address}-${index}`}
            className="flex items-center justify-between rounded bg-muted p-2"
          >
            <AddressDisplay
              address={address}
              variant="inline"
              truncateWhenLabeled
              showCopyButton
              explorerUrl={getExplorerUrl?.(address) ?? undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(index)}
              disabled={disabled}
              aria-label={labels.removeAddress(index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
