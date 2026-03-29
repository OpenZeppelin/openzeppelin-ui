/**
 * Type Mapping Demo
 *
 * Demonstrates how real adapters from @openzeppelin/adapter-*
 * map blockchain-specific parameter types to UI form fields.
 */

import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { DynamicFormField } from '@openzeppelin/ui-renderer';
import type {
  ContractAdapter,
  DynamicTypePattern,
  FieldType,
  FormFieldType,
  TypeMappingInfo,
} from '@openzeppelin/ui-types';

import { useEcosystem } from '../context';
import { enhanceSchemaWithMockData, type SchemaEnhancement } from '../utils';
import { DemoSection } from './DemoSection';
import { EcosystemSwitcher } from './EcosystemSwitcher';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate sample syntax examples for dynamic patterns
 */
function generatePatternExamples(pattern: DynamicTypePattern, primitiveTypes: string[]): string[] {
  const examples: string[] = [];
  const syntax = pattern.syntax;

  // Get a few sample primitive types for substitution
  const addressType = primitiveTypes.find((t) => t.toLowerCase().includes('address')) || 'T';
  const numericType = primitiveTypes.find((t) => /uint|int|u\d+|i\d+/i.test(t)) || 'T';

  if (syntax.includes('<T>') || syntax.includes('<T,')) {
    // Generic with single type parameter
    examples.push(syntax.replace('T', addressType));
    examples.push(syntax.replace('T', numericType));
  } else if (syntax.includes('<K,V>')) {
    // Map-like with key-value
    examples.push(syntax.replace('K', addressType).replace('V', numericType));
  } else if (syntax.includes('T[]')) {
    // Array syntax
    examples.push(syntax.replace('T', addressType));
    examples.push(syntax.replace('T', numericType));
  } else if (syntax.includes('T[N]')) {
    // Fixed array
    examples.push(syntax.replace('T', numericType).replace('N', '32'));
  } else if (syntax.includes('<N>')) {
    // Size-parameterized types like BytesN<N> - replace N with a sample size
    examples.push(syntax.replace('<N>', '<32>'));
    examples.push(syntax.replace('<N>', '<64>'));
  } else if (syntax.includes('StructName') || syntax.includes('EnumName')) {
    // Named type placeholders - these can't be concretely instantiated without schema
    // Just show the pattern syntax
    examples.push(syntax);
  } else {
    // Just use the syntax as-is
    examples.push(syntax);
  }

  return examples.slice(0, 2); // Limit to 2 examples per pattern
}

/**
 * Human-readable field type descriptions
 */
const FIELD_TYPE_DESCRIPTIONS: Partial<Record<FieldType, string>> = {
  text: 'Single-line text input',
  textarea: 'Multi-line text input',
  number: 'Numeric input (safe integers)',
  bigint: 'Large integer input (BigInt)',
  amount: 'Token amount with decimals',
  checkbox: 'Boolean toggle',
  select: 'Dropdown selection',
  radio: 'Radio button group',
  'blockchain-address': 'Validated blockchain address',
  bytes: 'Hexadecimal bytes input',
  array: 'Dynamic list of values',
  'array-object': 'Array of objects/structs',
  object: 'Complex object/struct',
  map: 'Key-value pairs',
  enum: 'Enum selection with variants',
  email: 'Email input',
  password: 'Password input',
  url: 'URL input',
  date: 'Date picker',
  'file-upload': 'File upload',
};

// ============================================================================
// Field Type Preview Component
// ============================================================================

interface FieldTypePreviewProps {
  parameterType: string;
  adapter: ContractAdapter;
}

interface FieldTypePreviewResult {
  fieldSchema: FormFieldType;
  enhancement: SchemaEnhancement;
}

/**
 * Hook to generate field schema with dynamic mock data for incomplete types.
 * Uses the adapter's primitive types to generate ecosystem-aware mock data.
 */
function useFieldTypePreview(
  parameterType: string,
  adapter: ContractAdapter
): FieldTypePreviewResult {
  return useMemo(() => {
    const generated = adapter.generateDefaultField({
      name: 'previewField',
      type: parameterType,
    });

    const baseSchema: FormFieldType = {
      ...generated,
      label: `${parameterType} Field`,
      helperText: `This is how a ${parameterType} parameter renders`,
    };

    // Enhance incomplete schemas with mock data using adapter's own types
    const enhancement = enhanceSchemaWithMockData(baseSchema, adapter);

    return {
      fieldSchema: enhancement.enhancedSchema,
      enhancement,
    };
  }, [adapter, parameterType]);
}

/**
 * Renders the field preview with dynamically generated mock data for incomplete types.
 * Uses the adapter's primitive types to make mock data ecosystem-aware.
 */
function PreviewWithSchemaNote({
  parameterType,
  adapter,
}: FieldTypePreviewProps): React.ReactElement {
  const { fieldSchema, enhancement } = useFieldTypePreview(parameterType, adapter);

  // Create a form for the preview field with onChange mode for real-time validation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewForm = useForm<any>({
    mode: 'onChange',
    defaultValues: { previewField: undefined },
  });

  // Split message to make the URL a clickable link
  const renderMessage = (message: string) => {
    const parts = message.split('builder.openzeppelin.com');
    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <a
            href="https://builder.openzeppelin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            builder.openzeppelin.com
          </a>
          {parts[1]}
        </>
      );
    }
    return message;
  };

  return (
    <div className="p-4">
      {enhancement.wasEnhanced && enhancement.message && (
        <div className="bg-primary/5 mb-4 rounded-lg border border-dashed border-primary/30 p-4">
          <p className="text-muted-foreground text-sm">
            <strong className="text-primary">Mock Preview:</strong>{' '}
            {renderMessage(enhancement.message)}
          </p>
        </div>
      )}
      <FormProvider {...previewForm}>
        <form className="w-full" onSubmit={(e) => e.preventDefault()}>
          <DynamicFormField field={fieldSchema} control={previewForm.control} adapter={adapter} />
        </form>
      </FormProvider>
    </div>
  );
}

// ============================================================================
// Type Mapping Content Component
// ============================================================================

interface TypeMappingContentProps {
  adapter: ContractAdapter;
}

/**
 * Interactive component demonstrating how blockchain types map to form fields
 * Uses adapter.getTypeMappingInfo() for dynamic type discovery
 */
function TypeMappingContent({ adapter }: TypeMappingContentProps): React.ReactElement {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPatternName, setSelectedPatternName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'primitives' | 'patterns'>('primitives');

  // Get type mapping info directly from the adapter
  const typeMappingInfo: TypeMappingInfo = useMemo(() => {
    return adapter.getTypeMappingInfo();
  }, [adapter]);

  const primitiveTypes = Object.keys(typeMappingInfo.primitives);
  const dynamicPatterns = typeMappingInfo.dynamicPatterns;

  // Get mapping result for selected type
  const mappedFieldType = selectedType ? adapter.mapParameterTypeToFieldType(selectedType) : null;

  // Get description: use pattern description if available, otherwise UI field type description
  const selectedPattern = selectedPatternName
    ? dynamicPatterns.find((p) => p.name === selectedPatternName)
    : null;
  const typeDescription =
    selectedPattern?.description ||
    (mappedFieldType ? FIELD_TYPE_DESCRIPTIONS[mappedFieldType] : null);

  return (
    <div className="space-y-4">
      {/* Header with tab toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('primitives');
              setSelectedType(null);
              setSelectedPatternName(null);
            }}
            className={`rounded px-3 py-1.5 text-xs transition-colors ${
              activeTab === 'primitives'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Primitives ({primitiveTypes.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('patterns');
              setSelectedType(null);
              setSelectedPatternName(null);
            }}
            className={`rounded px-3 py-1.5 text-xs transition-colors ${
              activeTab === 'patterns'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dynamic Patterns ({dynamicPatterns.length})
          </button>
        </div>
        <EcosystemSwitcher />
      </div>

      {/* Primitives Tab */}
      {activeTab === 'primitives' && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">Click a type to preview its form field.</p>
          <div className="flex flex-wrap gap-1.5">
            {primitiveTypes.map((type) => {
              const fieldType = typeMappingInfo.primitives[type];
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedType(isSelected ? null : type);
                    setSelectedPatternName(null); // Primitives have no pattern
                  }}
                  className={`rounded border px-2.5 py-1 text-xs transition-colors ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50 hover:bg-primary/5'}`}
                >
                  <code className="font-mono">{type}</code>
                  <span
                    className={`ml-1.5 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                  >
                    → {fieldType}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dynamic Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-3">
          {/* Explanation */}
          <p className="text-muted-foreground text-sm">
            Dynamic patterns handle parameterized types using regex matching at runtime. Unlike
            primitives (exact matches), patterns detect structures like arrays and generics.
          </p>
          {/* All examples as flat chips */}
          <div className="flex flex-wrap gap-1.5">
            {dynamicPatterns.flatMap((pattern) => {
              const examples = generatePatternExamples(pattern, primitiveTypes);
              return examples.map((example) => {
                const resolvedFieldType = adapter.mapParameterTypeToFieldType(example);
                const isSelected = selectedType === example;
                return (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedType(null);
                        setSelectedPatternName(null);
                      } else {
                        setSelectedType(example);
                        setSelectedPatternName(pattern.name);
                      }
                    }}
                    className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <code className="font-mono">{example}</code>
                    <span
                      className={`ml-1.5 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                    >
                      → {resolvedFieldType}
                    </span>
                  </button>
                );
              });
            })}
          </div>
        </div>
      )}

      {/* Live Preview - Full width below */}
      {selectedType && mappedFieldType && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <code className="bg-muted rounded px-2 py-0.5 font-mono text-sm">{selectedType}</code>
              <span className="text-muted-foreground">→</span>
              <code className="bg-primary/20 text-primary rounded px-2 py-0.5 font-mono text-sm">
                {mappedFieldType}
              </code>
              <span className="text-muted-foreground text-xs">
                ({typeDescription || 'Form field'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedType(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕ Close
            </button>
          </div>
          {/* Key forces re-mount when type changes, ensuring fresh form state */}
          <PreviewWithSchemaNote
            key={selectedType}
            parameterType={selectedType}
            adapter={adapter}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Code Example
// ============================================================================

const codeExample = `// Using the real adapter's type mapping capabilities
import { EvmAdapter, ethereumSepolia } from '@openzeppelin/adapter-evm';

const adapter = new EvmAdapter(ethereumSepolia);

// Discover all supported types dynamically
const typeInfo = adapter.getTypeMappingInfo();
console.log(typeInfo.primitives);      // { address: 'blockchain-address', uint256: 'bigint', ... }
console.log(typeInfo.dynamicPatterns); // [{ name: 'array', syntax: 'T[]', mapsTo: 'array' }, ...]

// Map specific types to form field types
adapter.mapParameterTypeToFieldType('address');   // → 'blockchain-address'
adapter.mapParameterTypeToFieldType('uint256');   // → 'bigint'
adapter.mapParameterTypeToFieldType('uint256[]'); // → 'array' (dynamic pattern)
adapter.mapParameterTypeToFieldType('tuple');     // → 'object'

// Validate addresses
adapter.isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f1D3F4'); // true`;

// ============================================================================
// Main Export
// ============================================================================

/**
 * TypeMappingDemo - Demonstrates how REAL adapters map blockchain types to UI components
 */
export function TypeMappingDemo(): React.ReactElement {
  const { adapter, isLoading } = useEcosystem();

  // Show loading state while ecosystem data is being loaded
  if (isLoading || !adapter) {
    return (
      <DemoSection title="Type Mapping" description="Loading...">
        <div className="text-muted-foreground">Loading adapter...</div>
      </DemoSection>
    );
  }

  return (
    <DemoSection
      title="Type Mapping"
      description="Real adapters from @openzeppelin/adapter-* automatically map blockchain-specific parameter types to appropriate UI form fields. This enables dynamic form generation from contract ABIs and schemas."
      codeExample={codeExample}
    >
      <div className="space-y-6">
        {/* How it works */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">How It Works</h3>
          <p className="text-muted-foreground text-sm">
            Each adapter exposes <code className="bg-muted rounded px-1">getTypeMappingInfo()</code>{' '}
            which returns all supported primitive types and dynamic patterns. The{' '}
            <code className="bg-muted rounded px-1">mapParameterTypeToFieldType()</code> method then
            converts any blockchain type to a UI field type. This demo dynamically renders types
            from the <strong>real adapter packages</strong>.
          </p>
        </div>

        {/* Interactive Demo */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Interactive Demo</h3>
          <TypeMappingContent adapter={adapter} />
        </div>

        {/* Field Type Reference */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Field Types</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(FIELD_TYPE_DESCRIPTIONS).map(([type, desc]) => (
              <div key={type} className="rounded border p-2">
                <code className="text-primary text-xs font-medium">{type}</code>
                <p className="text-muted-foreground text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
