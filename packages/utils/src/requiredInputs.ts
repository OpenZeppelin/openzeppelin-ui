import type { ContractLoadingCapability, FormFieldType, FormValues } from '@openzeppelin/ui-types';

type RequiredInputSnapshot = Record<string, unknown>;

function normalizeSnapshotValue(value: unknown): unknown {
  if (value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      lastModified: value.lastModified,
    };
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === undefined) {
    return null;
  }

  return value;
}

function extractRequiredFields(contractLoading: ContractLoadingCapability | null): FormFieldType[] {
  if (!contractLoading) {
    return [];
  }

  try {
    const inputs = contractLoading.getContractDefinitionInputs() || [];
    return inputs.filter((field) => field.validation?.required);
  } catch {
    return [];
  }
}

/**
 * Builds a snapshot of required form input values.
 * @param adapter - Contract adapter to get field definitions from
 * @param formValues - Current form values
 * @returns Snapshot of required field values, or null if no required fields
 */
export function buildRequiredInputSnapshot(
  contractLoading: ContractLoadingCapability | null,
  formValues: FormValues | null | undefined
): RequiredInputSnapshot | null {
  if (!formValues) {
    return null;
  }

  const requiredFields = extractRequiredFields(contractLoading);
  if (requiredFields.length === 0) {
    return null;
  }

  const snapshot: RequiredInputSnapshot = {};
  const values = formValues as Record<string, unknown>;

  for (const field of requiredFields) {
    const key = field.name || field.id;
    if (!key) continue;
    snapshot[key] = normalizeSnapshotValue(values[key]);
  }

  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

/**
 * Compares two required input snapshots for equality.
 * @param a - First snapshot to compare
 * @param b - Second snapshot to compare
 * @returns True if snapshots are equal, false otherwise
 */
export function requiredSnapshotsEqual(
  a: RequiredInputSnapshot | null,
  b: RequiredInputSnapshot | null
): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i += 1) {
    if (keysA[i] !== keysB[i]) {
      return false;
    }

    const valueA = a[keysA[i]];
    const valueB = b[keysA[i]];

    if (
      typeof valueA === 'object' &&
      valueA !== null &&
      typeof valueB === 'object' &&
      valueB !== null
    ) {
      if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
        return false;
      }
    } else if (valueA !== valueB) {
      return false;
    }
  }

  return true;
}
