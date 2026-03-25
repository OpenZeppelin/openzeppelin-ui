import { FamilyKey, isFamilyKey } from './families';

/**
 * Validates CLI family flags and removes duplicates while preserving order.
 */
export function parseFamilyValues(values: string[]): FamilyKey[] {
  const selectedFamilies: FamilyKey[] = [];
  const seenValues = new Set<FamilyKey>();

  for (const value of values) {
    if (!isFamilyKey(value)) {
      throw new Error(`Unsupported family "${value}".`);
    }

    if (seenValues.has(value)) {
      continue;
    }

    seenValues.add(value);
    selectedFamilies.push(value);
  }

  return selectedFamilies;
}
