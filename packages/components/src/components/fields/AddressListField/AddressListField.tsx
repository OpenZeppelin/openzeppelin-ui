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
  /**
   * Identifies this field in the DOM. The field renders a cluster rather than a
   * single control, so the id lands in two places:
   *
   * - as `id` on the **active entry control** — the single-mode address input or
   *   the bulk-mode textarea, whichever is rendered — matching how every other
   *   kit field places its `id`. Only one entry control exists at a time, so the
   *   id never duplicates across modes.
   * - as `data-field-id` on the field's **root element**, so the surrounding
   *   controls that carry no id of their own (Add, the entry-mode toggle, each
   *   row's remove button) still resolve to this field via
   *   `element.closest('[data-field-id]')`.
   *
   * Consumers reading `document.activeElement.id` therefore see this id only
   * while the entry control holds focus — and never while the field is
   * {@link disabled} or at {@link maxItems}, since the entry control is disabled
   * (and so unfocusable) in both cases. Resolving through `closest` covers the
   * whole cluster in every state.
   *
   * Defaults to a generated id; the generated inner ids are not a stable
   * contract, so pass this whenever you need to identify the field.
   */
  id?: string;
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
  id,
}: AddressListFieldProps) {
  const generatedId = useId();
  const singleEntryId = id ?? `address-list-single-${generatedId}`;
  const bulkEntryId = id ?? `address-list-bulk-${generatedId}`;
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
    <div className={cn('space-y-3', className)} data-field-id={id}>
      {label ? <Label className="text-sm font-medium leading-none">{label}</Label> : null}
      {helperText && entryMode === 'single' ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{helperText}</p>
      ) : null}

      {entryMode === 'single' ? (
        <AddressListSingleEntry
          inputId={singleEntryId}
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
          inputId={bulkEntryId}
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
