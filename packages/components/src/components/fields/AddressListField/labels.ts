import type { AddressCandidateClassification } from '@openzeppelin/ui-utils';

/**
 * Localizable UI strings for {@link AddressListField} built-in chrome
 * (buttons, previews, bulk-add feedback). Domain copy such as placeholders and
 * format hints are passed as component props instead.
 */
export interface AddressListFieldLabels {
  addAddresses: string;
  addAddressCount: (count: number) => string;
  invalidPrefix: string;
  invalidMore: (extraCount: number) => string;
  maxItemsReached: (maxItems: number) => string;
  addressesAdded: (count: number) => string;
  removeAddress: (index: number) => string;
  previewReadyToAdd: (count: number) => string;
  previewInvalid: (count: number) => string;
  previewAlreadyListed: (count: number) => string;
  previewDuplicateInPaste: (count: number) => string;
  bulkNothingAdded: string;
  bulkAdded: (count: number) => string;
  bulkInvalidFormats: (count: number) => string;
  bulkAlreadyListed: (count: number) => string;
  bulkDuplicatesInPaste: (count: number) => string;
}

/** Default English labels for {@link AddressListField}. */
export const DEFAULT_ADDRESS_LIST_FIELD_LABELS: AddressListFieldLabels = {
  addAddresses: 'Add addresses',
  addAddressCount: (count) => `Add ${count} address${count === 1 ? '' : 'es'}`,
  invalidPrefix: 'Invalid:',
  invalidMore: (extraCount) => `(+${extraCount} more)`,
  maxItemsReached: (maxItems) => `Maximum of ${maxItems} addresses reached.`,
  addressesAdded: (count) => `${count} address${count === 1 ? '' : 'es'} added`,
  removeAddress: (index) => `Remove address ${index + 1}`,
  previewReadyToAdd: (count) => `${count} ready to add`,
  previewInvalid: (count) => `${count} invalid`,
  previewAlreadyListed: (count) => `${count} already listed`,
  previewDuplicateInPaste: (count) => `${count} duplicate in paste`,
  bulkNothingAdded: 'No addresses were added. Check formatting and try again.',
  bulkAdded: (count) => `Added ${count} address${count === 1 ? '' : 'es'}`,
  bulkInvalidFormats: (count) => `${count} invalid format${count === 1 ? '' : 's'}`,
  bulkAlreadyListed: (count) => `${count} already listed`,
  bulkDuplicatesInPaste: (count) => `${count} duplicate${count === 1 ? '' : 's'} in paste`,
};

/** Merges {@link DEFAULT_ADDRESS_LIST_FIELD_LABELS} with optional overrides. */
export function resolveAddressListFieldLabels(
  overrides?: Partial<AddressListFieldLabels>
): AddressListFieldLabels {
  return { ...DEFAULT_ADDRESS_LIST_FIELD_LABELS, ...overrides };
}

/** Builds the inline helper preview shown while the user types in the draft textarea. */
export function buildAddressListPreviewSummary(
  classification: AddressCandidateClassification | null,
  labels: AddressListFieldLabels
): string | null {
  if (!classification) return null;

  const skipped =
    classification.invalid.length +
    classification.alreadyListed.length +
    classification.duplicatesInInput.length;
  if (classification.accepted.length === 0 && skipped === 0) return null;

  const parts: string[] = [];
  if (classification.accepted.length > 0) {
    parts.push(labels.previewReadyToAdd(classification.accepted.length));
  }
  if (classification.invalid.length > 0) {
    parts.push(labels.previewInvalid(classification.invalid.length));
  }
  if (classification.alreadyListed.length > 0) {
    parts.push(labels.previewAlreadyListed(classification.alreadyListed.length));
  }
  if (classification.duplicatesInInput.length > 0) {
    parts.push(labels.previewDuplicateInPaste(classification.duplicatesInInput.length));
  }
  return parts.join(' · ');
}

/** Formats post-add feedback after the user commits parsed addresses to the list. */
export function formatAddressBulkSummary(
  classification: AddressCandidateClassification,
  addedCount: number,
  labels: AddressListFieldLabels
): string | null {
  if (addedCount === 0 && classification.accepted.length === 0) {
    const skipped =
      classification.invalid.length +
      classification.alreadyListed.length +
      classification.duplicatesInInput.length;
    if (skipped === 0) return null;
    return labels.bulkNothingAdded;
  }

  const parts: string[] = [];
  if (addedCount > 0) {
    parts.push(labels.bulkAdded(addedCount));
  }
  if (classification.invalid.length > 0) {
    parts.push(labels.bulkInvalidFormats(classification.invalid.length));
  }
  if (classification.alreadyListed.length > 0) {
    parts.push(labels.bulkAlreadyListed(classification.alreadyListed.length));
  }
  if (classification.duplicatesInInput.length > 0) {
    parts.push(labels.bulkDuplicatesInPaste(classification.duplicatesInInput.length));
  }

  if (parts.length === 0) return null;

  return parts.join('. ') + '.';
}
