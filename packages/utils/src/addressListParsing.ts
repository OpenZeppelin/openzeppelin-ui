import type { AddressingCapability } from '@openzeppelin/ui-types';

const ADDRESS_DELIMITER_PATTERN = /[\n,;]+/;

/**
 * Splits a bulk paste string into trimmed address candidates.
 *
 * Supports newline, comma, and semicolon delimiters — the same rules used by
 * {@link AddressListField} in `@openzeppelin/ui-components`.
 */
export function parseDelimitedAddressInput(raw: string): string[] {
  return raw
    .split(ADDRESS_DELIMITER_PATTERN)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Result of classifying bulk-pasted address candidates before commit. */
export interface AddressCandidateClassification {
  /** Candidates that can be appended to the committed list. */
  accepted: string[];
  /** Candidates rejected by {@link AddressingCapability.isValidAddress}. */
  invalid: string[];
  /** Repeated values within the same paste batch. */
  duplicatesInInput: string[];
  /** Candidates already present in the committed list. */
  alreadyListed: string[];
}

/**
 * Classifies parsed candidates against an existing list and optional addressing rules.
 *
 * Used by {@link AddressListField} to drive live previews and bulk-add feedback.
 * When `addressing` is omitted, format validation is skipped and all unique candidates
 * are accepted (aside from duplicates and already-listed entries).
 */
export function classifyAddressCandidates(
  candidates: readonly string[],
  existing: readonly string[],
  addressing?: AddressingCapability,
  maxItems?: number
): AddressCandidateClassification {
  const existingSet = new Set(existing);
  const accepted: string[] = [];
  const invalid: string[] = [];
  const duplicatesInInput: string[] = [];
  const alreadyListed: string[] = [];
  const seenInBatch = new Set<string>();
  const atLimit = (nextCount: number) =>
    maxItems != null && existing.length + nextCount >= maxItems;

  for (const candidate of candidates) {
    if (existingSet.has(candidate)) {
      alreadyListed.push(candidate);
      continue;
    }
    if (seenInBatch.has(candidate)) {
      duplicatesInInput.push(candidate);
      continue;
    }
    seenInBatch.add(candidate);
    if (addressing && !addressing.isValidAddress(candidate)) {
      invalid.push(candidate);
      continue;
    }
    if (atLimit(accepted.length)) {
      break;
    }
    accepted.push(candidate);
  }

  return { accepted, invalid, duplicatesInInput, alreadyListed };
}
