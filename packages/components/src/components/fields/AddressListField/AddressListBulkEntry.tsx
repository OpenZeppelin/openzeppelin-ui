import { Info, Plus } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import type { AddressingCapability } from '@openzeppelin/ui-types';
import { classifyAddressCandidates, parseDelimitedAddressInput } from '@openzeppelin/ui-utils';

import { Button } from '../../ui/button';
import { TextAreaField } from '../TextAreaField';
import {
  buildAddressListPreviewSummary,
  formatAddressBulkSummary,
  type AddressListFieldLabels,
} from './labels';

interface AddressListBulkDraftForm {
  input: string;
}

export interface AddressListBulkEntryProps {
  fieldId: string;
  value: readonly string[];
  onAdd: (addresses: string[]) => void;
  placeholder: string;
  formatHint: string;
  addressing?: AddressingCapability;
  maxItems?: number;
  disabled?: boolean;
  maxInvalidPreview?: number;
  labels: AddressListFieldLabels;
  /** Entry-mode toggle rendered flush to the textarea's right edge. */
  modeToggle?: ReactNode;
}

/** Bulk paste entry — info callout, textarea, and add action in a compact stack. */
export function AddressListBulkEntry({
  fieldId,
  value,
  onAdd,
  placeholder,
  formatHint,
  addressing,
  maxItems,
  disabled = false,
  maxInvalidPreview = 3,
  labels,
  modeToggle,
}: AddressListBulkEntryProps) {
  const atLimit = maxItems != null && value.length >= maxItems;
  const inputDisabled = disabled || atLimit;
  const [feedback, setFeedback] = useState<string | null>(null);

  const { control, reset, watch } = useForm<AddressListBulkDraftForm>({
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

  const statusMessage = rawInput.trim() ? (previewSummary ?? undefined) : (feedback ?? undefined);

  const handleAdd = useCallback(() => {
    if (!classification || classification.accepted.length === 0 || atLimit) return;
    onAdd(classification.accepted);
    reset({ input: '' });
    setFeedback(formatAddressBulkSummary(classification, classification.accepted.length, labels));
  }, [classification, atLimit, onAdd, reset, labels]);

  const acceptedCount = classification?.accepted.length ?? 0;
  const addButtonLabel =
    acceptedCount > 0 ? labels.addAddressCount(acceptedCount) : labels.addAddresses;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">{formatHint}</p>
      </div>

      <div>
        <div className="relative">
          <TextAreaField
            id={`address-list-bulk-${fieldId}`}
            name="input"
            label=""
            placeholder={placeholder}
            helperText={statusMessage}
            control={control}
            rows={4}
            validation={{ required: false }}
            readOnly={inputDisabled}
          />
        </div>
        {modeToggle ? <div className="flex justify-end pr-2">{modeToggle}</div> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {classification && classification.invalid.length > 0 ? (
            <p className="text-xs text-destructive">
              {labels.invalidPrefix} {classification.invalid.slice(0, maxInvalidPreview).join(', ')}
              {classification.invalid.length > maxInvalidPreview
                ? ` ${labels.invalidMore(classification.invalid.length - maxInvalidPreview)}`
                : ''}
            </p>
          ) : null}
          {atLimit && maxItems != null ? (
            <p className="text-xs text-muted-foreground">{labels.maxItemsReached(maxItems)}</p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          disabled={inputDisabled || acceptedCount === 0}
          onClick={() => handleAdd()}
        >
          <Plus className="mr-1 size-4" />
          {addButtonLabel}
        </Button>
      </div>
    </div>
  );
}
