/**
 * Schema Mocking Utilities
 *
 * Generates mock schema data for preview purposes when the actual contract
 * schema is not available. All utilities derive from the adapter where possible
 * to ensure ecosystem-aware mock data without hardcoding specific ecosystems.
 */

import type { FormFieldType, TypeMappingCapability } from '@openzeppelin/ui-types';

// ============================================================================
// Types
// ============================================================================

export type SchemaEnhancement = {
  wasEnhanced: boolean;
  message: string | null;
  enhancedSchema: FormFieldType;
};

// ============================================================================
// Primitive Type Helpers
// ============================================================================

/**
 * Extracts representative primitive types from an adapter's type mapping.
 * Returns ecosystem-aware types without hardcoding specific ecosystems.
 */
function getRepresentativeTypes(typeMapping: TypeMappingCapability): {
  addressType: string;
  numericType: string;
  boolType: string;
} {
  const typeInfo = typeMapping.getTypeMappingInfo();
  const primitives = Object.keys(typeInfo.primitives);

  return {
    addressType: primitives.find((t) => t.toLowerCase().includes('address')) || primitives[0],
    numericType:
      primitives.find((t) => /uint256|u128|uint|u64/i.test(t)) ||
      primitives.find((t) => /int|number/i.test(t)) ||
      primitives[1] ||
      primitives[0],
    boolType: primitives.find((t) => /bool/i.test(t)) || primitives[2] || primitives[0],
  };
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generates mock components (FunctionParameter format) using the adapter's own primitive types.
 * This makes the mock data ecosystem-aware (EVM uses address/uint256, Stellar uses Address/U128, etc.)
 *
 * The ObjectField component expects `components` as an array of FunctionParameter objects,
 * which it then passes to adapter.generateDefaultField() for proper field generation.
 */
export function generateMockComponents(typeMapping: TypeMappingCapability): Array<{
  name: string;
  type: string;
  displayName?: string;
  description?: string;
}> {
  const { addressType, numericType, boolType } = getRepresentativeTypes(typeMapping);

  return [
    {
      name: 'recipient',
      type: addressType,
      displayName: 'Recipient',
      description: `Type: ${addressType}`,
    },
    {
      name: 'amount',
      type: numericType,
      displayName: 'Amount',
      description: `Type: ${numericType}`,
    },
    {
      name: 'active',
      type: boolType,
      displayName: 'Active',
      description: `Type: ${boolType}`,
    },
  ];
}

/**
 * Generates mock enum metadata for preview purposes.
 * EnumField expects enumMetadata with variants, not simple options.
 * Uses adapter's primitive types to generate ecosystem-aware payload examples.
 */
export function generateMockEnumMetadata(typeMapping: TypeMappingCapability): {
  name: string;
  variants: Array<{
    name: string;
    type: 'void' | 'tuple' | 'integer';
    payloadTypes?: string[];
  }>;
} {
  const { addressType, numericType } = getRepresentativeTypes(typeMapping);

  return {
    name: 'MockEnum',
    variants: [
      // Simple void variants (unit variants)
      { name: 'None', type: 'void' },
      { name: 'Pending', type: 'void' },
      // Tuple variant with ecosystem-aware payload types
      { name: 'Transfer', type: 'tuple', payloadTypes: [addressType, numericType] },
    ],
  };
}

/**
 * Generates mock select options for preview purposes.
 * These are generic application-level options (not ecosystem-specific).
 */
export function generateMockSelectOptions(): Array<{ label: string; value: string }> {
  return [
    { label: 'Option A', value: 'option_a' },
    { label: 'Option B', value: 'option_b' },
    { label: 'Option C', value: 'option_c' },
  ];
}

// ============================================================================
// Message Generation
// ============================================================================

/**
 * Generate the mock preview message for a given type description.
 */
export function getMockPreviewMessage(typeDescription: string): string {
  return `This preview shows ${typeDescription}. In a real application, the schema comes from the contract ABI/spec. Try builder.openzeppelin.com to see fields generated from real contracts.`;
}

// ============================================================================
// Schema Enhancement
// ============================================================================

/**
 * Detects incomplete schemas and dynamically generates mock data using
 * the adapter's own primitive types. This makes previews ecosystem-aware.
 *
 * Key insight: ObjectField expects `components` (FunctionParameter[]), not `properties`.
 * The adapter.generateDefaultField() is called by ObjectField for each component.
 */
export function enhanceSchemaWithMockData(
  fieldSchema: FormFieldType,
  typeMapping: TypeMappingCapability
): SchemaEnhancement {
  const { type } = fieldSchema;

  // Object types without components - generate mock struct fields
  if (type === 'object') {
    const components = (fieldSchema as { components?: unknown[] }).components;
    if (!components || components.length === 0) {
      return {
        wasEnhanced: true,
        message: getMockPreviewMessage('a mock struct with example fields'),
        enhancedSchema: {
          ...fieldSchema,
          components: generateMockComponents(typeMapping),
        } as FormFieldType,
      };
    }
  }

  // Array-object types without components - generate mock tuple[] fields
  if (type === 'array-object') {
    const components = (fieldSchema as { components?: unknown[] }).components;
    if (!components || components.length === 0) {
      return {
        wasEnhanced: true,
        message: getMockPreviewMessage('a mock array of structs'),
        enhancedSchema: {
          ...fieldSchema,
          components: generateMockComponents(typeMapping),
        } as FormFieldType,
      };
    }
  }

  // Enum types without metadata - generate mock variants
  if (type === 'enum') {
    const enumMetadata = (fieldSchema as { enumMetadata?: { variants?: unknown[] } }).enumMetadata;
    if (!enumMetadata?.variants || enumMetadata.variants.length === 0) {
      return {
        wasEnhanced: true,
        message: getMockPreviewMessage('mock enum variants'),
        enhancedSchema: {
          ...fieldSchema,
          enumMetadata: generateMockEnumMetadata(typeMapping),
        } as FormFieldType,
      };
    }
  }

  // Select types without options - generate mock options
  if (type === 'select') {
    const options = (fieldSchema as { options?: unknown[] }).options;
    if (!options || options.length === 0) {
      return {
        wasEnhanced: true,
        message: getMockPreviewMessage('mock select options'),
        enhancedSchema: {
          ...fieldSchema,
          options: generateMockSelectOptions(),
        } as FormFieldType,
      };
    }
  }

  return { wasEnhanced: false, message: null, enhancedSchema: fieldSchema };
}
