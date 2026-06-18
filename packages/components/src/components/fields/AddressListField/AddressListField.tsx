import { X } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { AddressingCapability } from '@openzeppelin/ui-types';
import { classifyAddressCandidates, cn, parseDelimitedAddressInput } from '@openzeppelin/ui-utils';

import { AddressDisplay } from '../../ui/address-display';
import { Button } from '../../ui/button';
import { TextAreaField } from '../TextAreaField';
import {
  buildAddressListPreviewSummary,
  formatAddressBulkSummary,
  resolveAddressListFieldLabels,
  type AddressListFieldLabels,
} from './labels';

interface AddressListDraftForm {
  input: string;
}

/**
 * AddressListField component properties.
 *
 * Unlike hook-form-integrated fields such as {@link AddressField}, this component
 * uses a controlled `value` / `onChange` API for the committed address list. An
 * internal draft textarea (backed by React Hook Form) is used only for bulk paste
 * workflows before addresses are appended to `value`.
 */
export interface AddressListFieldProps {
  /** Committed addresses currently shown in the list. */
  value: readonly string[];
  /** Called when addresses are added or removed. */
  onChange: (addresses: string[]) => void;
  /** Textarea placeholder — chain-specific examples belong in caller copy. */
  placeholder: string;
  /** Always-visible guidance on accepted list formats (newline, comma, etc.). */
  formatHint: string;
  /** When provided, each candidate is validated via {@link AddressingCapability.isValidAddress}. */
  addressing?: AddressingCapability;
  /** Optional explorer URL resolver passed through to {@link AddressDisplay}. */
  getExplorerUrl?: (address: string) => string | null | undefined;
  /** Optional field label rendered above the draft textarea. */
  label?: string;
  /** Optional domain-specific helper shown above {@link formatHint}. */
  helperText?: string;
  /** Maximum number of addresses allowed in {@link value}. */
  maxItems?: number;
  /** Disables paste input and remove actions. */
  disabled?: boolean;
  /** Maximum invalid entries shown inline before truncating with a count suffix. */
  maxInvalidPreview?: number;
  className?: string;
  /** Optional UI labels to override {@link DEFAULT_ADDRESS_LIST_FIELD_LABELS}. */
  labels?: Partial<AddressListFieldLabels>;
}

/**
 * Multi-address list field for bulk paste workflows.
 *
 * Architecture flow:
 * 1. App or wizard steps hold the committed address list in local or form state
 * 2. AddressListField renders a draft textarea plus the committed list rows
 * 3. Parsing and classification run via `@openzeppelin/ui-utils` helpers
 * 4. Optional {@link AddressingCapability} validates candidates before add
 * 5. {@link AddressDisplay} renders each committed row with copy and explorer links
 *
 * The component includes:
 * - Delimiter-aware bulk paste (newlines, commas, semicolons)
 * - Live preview of accepted, invalid, duplicate, and already-listed candidates
 * - Optional `maxItems` cap with disabled input at the limit
 * - Removable list rows with accessible remove buttons
 * - Caller-controlled copy for placeholders and format hints
 * - Optional `labels` overrides for built-in button and status strings
 *
 * @example
 * ```tsx
 * const [addresses, setAddresses] = useState<string[]>([]);
 *
 * <AddressListField
 *   value={addresses}
 *   onChange={setAddresses}
 *   placeholder="Paste addresses (one per line or comma-separated)"
 *   formatHint="Each entry is validated before it is added."
 *   addressing={capabilities}
 * />
 * ```
 */
export function AddressListField({
  value,
  onChange,
  placeholder,
  formatHint,
  addressing,
  getExplorerUrl,
  label,
  helperText,
  maxItems,
  disabled = false,
  maxInvalidPreview = 3,
  className,
  labels: labelOverrides,
}: AddressListFieldProps) {
  const fieldId = useId();
  const labels = useMemo(() => resolveAddressListFieldLabels(labelOverrides), [labelOverrides]);
  const atLimit = maxItems != null && value.length >= maxItems;
  const inputDisabled = disabled || atLimit;
  const [feedback, setFeedback] = useState<string | null>(null);

  const { control, reset, watch } = useForm<AddressListDraftForm>({
    defaultValues: { input: '' },
    mode: 'onChange',
  });

  const rawInput = watch('input');
  const classification = useMemo(() => {
    if (!rawInput.trim()) return null;
    return classifyAddressCandidates(
      parseDelimitedAddressInput(rawInput),
      value,
      addressing,
      maxItems
    );
  }, [rawInput, value, addressing, maxItems]);

  const previewSummary = useMemo(
    () => buildAddressListPreviewSummary(classification, labels),
    [classification, labels]
  );

  const inlineHelperText = rawInput.trim()
    ? (previewSummary ?? undefined)
    : (feedback ?? undefined);

  const handleAdd = useCallback(() => {
    if (!classification || classification.accepted.length === 0 || atLimit) return;
    onChange([...value, ...classification.accepted]);
    reset({ input: '' });
    setFeedback(formatAddressBulkSummary(classification, classification.accepted.length, labels));
  }, [classification, atLimit, onChange, value, reset, labels]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, currentIndex) => currentIndex !== index));
      setFeedback(null);
    },
    [onChange, value]
  );

  const acceptedCount = classification?.accepted.length ?? 0;
  const addButtonLabel =
    acceptedCount > 0 ? labels.addAddressCount(acceptedCount) : labels.addAddresses;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1">
        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
        <p className="text-xs text-muted-foreground">{formatHint}</p>
      </div>

      <TextAreaField
        id={`address-list-field-${fieldId}`}
        name="input"
        label={label ?? ''}
        placeholder={placeholder}
        helperText={inlineHelperText}
        control={control}
        rows={4}
        validation={{ required: false }}
        readOnly={inputDisabled}
      />

      {classification && classification.invalid.length > 0 && (
        <p className="text-xs text-destructive">
          {labels.invalidPrefix} {classification.invalid.slice(0, maxInvalidPreview).join(', ')}
          {classification.invalid.length > maxInvalidPreview
            ? ` ${labels.invalidMore(classification.invalid.length - maxInvalidPreview)}`
            : ''}
        </p>
      )}

      <Button
        type="button"
        size="sm"
        disabled={inputDisabled || acceptedCount === 0}
        onClick={() => handleAdd()}
      >
        {addButtonLabel}
      </Button>

      {atLimit && maxItems != null && (
        <p className="text-xs text-muted-foreground">{labels.maxItemsReached(maxItems)}</p>
      )}

      {value.length > 0 && (
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
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  aria-label={labels.removeAddress(index)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
