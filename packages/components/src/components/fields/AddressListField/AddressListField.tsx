import { ClipboardPaste, PencilLine } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';

import type { AddressingCapability } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { Label } from '../../ui/label';
import { AddressListBulkEntry } from './AddressListBulkEntry';
import { AddressListEntries } from './AddressListEntries';
import { AddressListSingleEntry } from './AddressListSingleEntry';
import { resolveAddressListFieldLabels, type AddressListFieldLabels } from './labels';

export type AddressListEntryMode = 'single' | 'bulk';

/**
 * AddressListField component properties.
 *
 * Uses a controlled `value` / `onChange` API for the committed address list.
 * Entry defaults to single-address mode ({@link AddressField} with address-book
 * suggestions); users can toggle to bulk paste mode — never both at once.
 */
export interface AddressListFieldProps {
  /** Committed addresses currently shown in the list. */
  value: readonly string[];
  /** Called when addresses are added or removed. */
  onChange: (addresses: string[]) => void;
  /** Placeholder for single-address entry (default mode). */
  placeholder: string;
  /** Placeholder for bulk paste. Defaults to {@link placeholder}. */
  bulkPlaceholder?: string;
  /** Shown in bulk mode only — delimiter and validation guidance. */
  formatHint: string;
  /** When provided, each candidate is validated via {@link AddressingCapability.isValidAddress}. */
  addressing?: AddressingCapability;
  /** Optional explorer URL resolver passed through to {@link AddressDisplay}. */
  getExplorerUrl?: (address: string) => string | null | undefined;
  /** Optional field label rendered above the active entry control. */
  label?: string;
  /** Optional domain-specific helper shown below the header row. */
  helperText?: string;
  /** Maximum number of addresses allowed in {@link value}. */
  maxItems?: number;
  /** Disables entry and remove actions. */
  disabled?: boolean;
  /** Maximum invalid entries shown inline before truncating with a count suffix (bulk mode). */
  maxInvalidPreview?: number;
  className?: string;
  /** Entry mode shown on mount. Defaults to `'single'`. */
  defaultEntryMode?: AddressListEntryMode;
  /**
   * Whether users can switch between single and bulk entry. Defaults to `true`.
   * Set to `false` to hide the toggle and lock the field to {@link defaultEntryMode}.
   */
  allowModeToggle?: boolean;
  /** Optional UI labels to override {@link DEFAULT_ADDRESS_LIST_FIELD_LABELS}. */
  labels?: Partial<AddressListFieldLabels>;
}

/**
 * Multi-address list field with single-entry default and optional bulk paste.
 */
export function AddressListField({
  value,
  onChange,
  placeholder,
  bulkPlaceholder,
  formatHint,
  addressing,
  getExplorerUrl,
  label,
  helperText,
  maxItems,
  disabled = false,
  maxInvalidPreview = 3,
  className,
  defaultEntryMode = 'single',
  allowModeToggle = true,
  labels: labelOverrides,
}: AddressListFieldProps) {
  const fieldId = useId();
  const labels = useMemo(() => resolveAddressListFieldLabels(labelOverrides), [labelOverrides]);
  const [entryMode, setEntryMode] = useState<AddressListEntryMode>(defaultEntryMode);
  const resolvedBulkPlaceholder = bulkPlaceholder ?? placeholder;

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, currentIndex) => currentIndex !== index));
    },
    [onChange, value]
  );

  const handleAddSingle = useCallback(
    (address: string) => {
      onChange([...value, address]);
    },
    [onChange, value]
  );

  const handleAddBulk = useCallback(
    (addresses: string[]) => {
      onChange([...value, ...addresses]);
    },
    [onChange, value]
  );

  const switchToBulk = useCallback(() => setEntryMode('bulk'), []);
  const switchToSingle = useCallback(() => setEntryMode('single'), []);

  const toggleClassName =
    'inline-flex items-center gap-1 rounded-b-md rounded-t-none border border-t-0 border-input bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';
  const modeToggle = !allowModeToggle ? undefined : entryMode === 'single' ? (
    <button type="button" onClick={switchToBulk} className={toggleClassName}>
      <ClipboardPaste className="size-3" />
      {labels.enableBulkEntry}
    </button>
  ) : (
    <button type="button" onClick={switchToSingle} className={toggleClassName}>
      <PencilLine className="size-3" />
      {labels.enableSingleEntry}
    </button>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {label ? <Label className="text-sm font-medium leading-none">{label}</Label> : null}
      {helperText && entryMode === 'single' ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{helperText}</p>
      ) : null}

      {entryMode === 'single' ? (
        <AddressListSingleEntry
          fieldId={fieldId}
          value={value}
          onAdd={handleAddSingle}
          placeholder={placeholder}
          addressing={addressing}
          maxItems={maxItems}
          disabled={disabled}
          labels={labels}
          modeToggle={modeToggle}
        />
      ) : (
        <AddressListBulkEntry
          fieldId={fieldId}
          value={value}
          onAdd={handleAddBulk}
          placeholder={resolvedBulkPlaceholder}
          formatHint={formatHint}
          addressing={addressing}
          maxItems={maxItems}
          disabled={disabled}
          maxInvalidPreview={maxInvalidPreview}
          labels={labels}
          modeToggle={modeToggle}
        />
      )}

      <AddressListEntries
        value={value}
        getExplorerUrl={getExplorerUrl}
        disabled={disabled}
        labels={labels}
        onRemove={handleRemove}
      />
    </div>
  );
}
