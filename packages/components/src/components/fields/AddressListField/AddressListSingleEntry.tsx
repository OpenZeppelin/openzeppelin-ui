import { Plus } from 'lucide-react';
import { useCallback, useMemo, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { AddressingCapability } from '@openzeppelin/ui-types';

import { Button } from '../../ui/button';
import { AddressField } from '../AddressField';
import type { AddressListFieldLabels } from './labels';

interface AddressListSingleDraftForm {
  draft: string;
}

export interface AddressListSingleEntryProps {
  fieldId: string;
  value: readonly string[];
  onAdd: (address: string) => void;
  placeholder: string;
  addressing?: AddressingCapability;
  maxItems?: number;
  disabled?: boolean;
  labels: AddressListFieldLabels;
  /** Entry-mode toggle rendered flush to the input's right edge. */
  modeToggle?: ReactNode;
}

/** Single-address entry — inline {@link AddressField} with an Add button (address-book aware). */
export function AddressListSingleEntry({
  fieldId,
  value,
  onAdd,
  placeholder,
  addressing,
  maxItems,
  disabled = false,
  labels,
  modeToggle,
}: AddressListSingleEntryProps) {
  const atLimit = maxItems != null && value.length >= maxItems;
  const inputDisabled = disabled || atLimit;

  const { control, reset, getValues, handleSubmit } = useForm<AddressListSingleDraftForm>({
    defaultValues: { draft: '' },
    mode: 'onChange',
  });

  const draft = useWatch({ control, name: 'draft' });
  const trimmedDraft = (draft ?? '').trim();

  const validationState = useMemo(() => {
    if (!trimmedDraft) return { canAdd: false, showInvalid: false };
    if (value.includes(trimmedDraft)) return { canAdd: false, showInvalid: false };
    if (atLimit) return { canAdd: false, showInvalid: false };
    if (addressing && !addressing.isValidAddress(trimmedDraft)) {
      return { canAdd: false, showInvalid: true };
    }
    return { canAdd: true, showInvalid: false };
  }, [trimmedDraft, value, atLimit, addressing]);

  const submitAdd = useCallback(() => {
    if (!validationState.canAdd) return;
    onAdd(getValues('draft').trim());
    reset({ draft: '' });
  }, [validationState.canAdd, onAdd, getValues, reset]);

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <AddressField
            id={`address-list-single-${fieldId}`}
            name="draft"
            label=""
            placeholder={placeholder}
            helperText={validationState.showInvalid ? labels.invalidSingleAddress : undefined}
            control={control}
            addressing={addressing}
            validation={{ required: false }}
            readOnly={inputDisabled}
          />
          {modeToggle ? <div className="-mt-px flex justify-end pr-2">{modeToggle}</div> : null}
        </div>
        <Button
          type="button"
          className="h-10 shrink-0"
          disabled={inputDisabled || !validationState.canAdd}
          onClick={handleSubmit(submitAdd)}
        >
          <Plus className="mr-1 size-4" />
          {labels.addSingleAddress}
        </Button>
      </div>

      {atLimit && maxItems != null && (
        <p className="text-xs text-muted-foreground">{labels.maxItemsReached(maxItems)}</p>
      )}
    </div>
  );
}
