import type { ContractSchema, FunctionParameter } from '../../contracts/schema';
import { type FieldType } from '../../forms';
import type { FormFieldType } from '../../forms/form-field';
import type { RuntimeSecretPropertyInput, TypeMappingInfo } from '../common';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 2** — Maps chain types to form field types and default field configs.
 *
 * Extends `RuntimeCapability`.
 */
export interface TypeMappingCapability extends RuntimeCapability {
  /**
   * Map a blockchain parameter type to a form field type.
   *
   * @param parameterType - ABI / schema type string.
   */
  mapParameterTypeToFieldType(parameterType: string): FieldType;

  /**
   * Field types compatible with a given parameter type.
   *
   * @param parameterType - ABI / schema type string.
   */
  getCompatibleFieldTypes(parameterType: string): FieldType[];

  /**
   * Build a default form field for a function parameter.
   *
   * @param parameter - Parameter descriptor from the schema.
   * @param contractSchema - Optional contract context (e.g. spec entries).
   */
  generateDefaultField(
    parameter: FunctionParameter,
    contractSchema?: ContractSchema
  ): FormFieldType;

  /**
   * Full primitive + dynamic pattern mapping metadata for tooling and documentation UIs.
   */
  getTypeMappingInfo(): TypeMappingInfo;

  /**
   * Optional runtime-secret field binding metadata for ecosystems that need extra execution-time inputs.
   */
  getRuntimeFieldBinding?():
    | {
        key: string;
        label: string;
        helperText?: string;
        metadata?: Record<string, unknown>;
        propertyNameInput?: RuntimeSecretPropertyInput;
      }
    | undefined;
}
