import type { ContractLoadingCapability, FormValues } from '@openzeppelin/ui-types';

/**
 * Returns names of adapter-declared required inputs that are missing/empty in values.
 */
export function getMissingRequiredContractInputs(
  contractLoading: ContractLoadingCapability,
  values: FormValues
): string[] {
  try {
    const inputs = contractLoading.getContractDefinitionInputs();
    const required = inputs.filter((field: unknown) => {
      const f = field as { validation?: { required?: boolean } };
      return f?.validation?.required === true;
    });
    const missing: string[] = [];
    for (const field of required as Array<{ name?: string; id?: string }>) {
      const key = field.name || field.id || '';
      const raw = (values as Record<string, unknown>)[key];
      if (raw == null) {
        missing.push(key);
        continue;
      }
      if (typeof raw === 'string' && raw.trim().length === 0) {
        missing.push(key);
      }
    }
    return missing;
  } catch {
    return [];
  }
}

/**
 * True if any adapter-declared required inputs are missing/empty.
 */
export function hasMissingRequiredContractInputs(
  contractLoading: ContractLoadingCapability | null | undefined,
  values: FormValues
): boolean {
  if (!contractLoading) return false;
  return getMissingRequiredContractInputs(contractLoading, values).length > 0;
}
