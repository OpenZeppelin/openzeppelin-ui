import type {
  ContractFunction,
  ContractSchema,
  FormFieldType,
  RenderFormSchema,
  TypeMappingCapability,
} from '@openzeppelin/ui-types';

/**
 * Creates a RenderFormSchema from a contract function
 */
export function createFormSchemaFromFunction(
  contractAddress: string,
  fn: ContractFunction,
  typeMapping: TypeMappingCapability,
  contractSchema: ContractSchema
): RenderFormSchema {
  // Pass contractSchema to generateDefaultField so it can resolve enum types and other complex types
  const fields: FormFieldType[] = fn.inputs.map((input) =>
    typeMapping.generateDefaultField(input, contractSchema)
  );

  return {
    id: `demo-form-${fn.id}`,
    title: fn.displayName || fn.name,
    description: fn.description || `Execute the ${fn.name} function on this contract.`,
    contractAddress,
    functionId: fn.id,
    fields,
    layout: {
      columns: 1,
      spacing: 'normal',
      labelPosition: 'top',
    },
    validation: {
      mode: 'onChange',
      showErrors: 'inline',
    },
    submitButton: {
      text: fn.modifiesState ? 'Execute Transaction' : 'Query',
      loadingText: 'Processing...',
      variant: 'primary',
    },
  };
}

/**
 * Get writable (non-view) functions from a contract schema
 */
export function getWritableFunctions(schema: ContractSchema): ContractFunction[] {
  return schema.functions.filter((fn) => fn.modifiesState);
}
