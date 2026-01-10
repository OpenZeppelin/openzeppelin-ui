import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  AddressField,
  AmountField,
  ArrayField,
  BigIntField,
  BooleanField,
  Button,
  BytesField,
  DateTimeField,
  EnumField,
  FileUploadField,
  MapField,
  NumberField,
  PasswordField,
  RadioField,
  SelectField,
  SelectGroupedField,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TextAreaField,
  TextField,
  UrlField,
} from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import { CodeBlock } from './CodeBlock';
import { DemoSection } from './DemoSection';
import { EcosystemIndicator } from './EcosystemIndicator';

// Form data interface with all field types
interface FormFieldsData {
  // Text fields
  textField: string;
  textAreaField: string;
  passwordField: string;
  urlField: string;
  // Number fields
  numberField: number;
  amountField: string;
  bigIntField: string;
  // Selection fields
  selectField: string;
  selectGroupedField: string;
  radioField: string;
  enumField: string;
  booleanField: boolean;
  // Data fields
  addressField: string;
  bytesField: string;
  dateTimeField: string;
  fileUploadField: File | null;
  // Complex fields
  arrayField: string[];
  mapField: Array<{ key: string; value: string }>;
}

/**
 * FormFieldsDemo - Comprehensive demonstration of specialized form fields
 * from @openzeppelin/ui-components/fields organized into tabbed categories.
 */
export function FormFieldsDemo(): React.ReactElement {
  const [submittedData, setSubmittedData] = useState<Partial<FormFieldsData> | null>(null);

  const { ecosystem, adapter, sampleAddresses, metadata } = useEcosystem();

  const form = useForm<FormFieldsData>({
    defaultValues: {
      textField: '',
      textAreaField: '',
      passwordField: '',
      urlField: '',
      numberField: 0,
      amountField: '',
      bigIntField: '',
      selectField: '',
      selectGroupedField: '',
      radioField: '',
      enumField: '',
      booleanField: false,
      addressField: '',
      bytesField: '',
      dateTimeField: '',
      fileUploadField: null,
      arrayField: [],
      mapField: [],
    },
    mode: 'onChange',
  });

  const onSubmit = (data: FormFieldsData): void => {
    setSubmittedData(data);
  };

  const codeExample = `import {
  TextField,
  AmountField,
  AddressField,
  // ... and more
} from '@openzeppelin/ui-components';
import { useForm, FormProvider } from 'react-hook-form';
import { useEcosystem } from './context/EcosystemContext';

// Get real adapter from context
const { adapter, ecosystem } = useEcosystem();
const form = useForm({ defaultValues: { ... } });

<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <TextField
      id="name"
      name="name"
      label="Name"
      control={form.control}
      placeholder="Enter name"
      validation={{ required: true }}
    />
    
    {/* AddressField uses real adapter for validation */}
    <AddressField
      id="address"
      name="address"
      label="Wallet Address"
      control={form.control}
      placeholder="0x..."
      adapter={adapter}  // Real adapter validates addresses
    />
    
    <AmountField
      id="amount"
      name="amount"
      label="Amount"
      control={form.control}
      symbol={ecosystem === 'evm' ? 'ETH' : 'XLM'}
      decimals={18}
    />
  </form>
</FormProvider>`;

  return (
    <DemoSection
      title="Form Fields"
      description="Specialized form field components for blockchain applications. All fields integrate with react-hook-form and include validation, accessibility, and consistent styling."
      codeExample={codeExample}
    >
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-5">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="number">Number</TabsTrigger>
              <TabsTrigger value="selection">Selection</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="complex">Complex</TabsTrigger>
            </TabsList>

            {/* Text Fields Tab */}
            <TabsContent value="text" className="space-y-6">
              <div className="rounded-lg border p-6">
                <h3 className="mb-4 text-lg font-medium">Text Fields</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Basic text input fields for various text-based data entry.
                </p>
                <div className="grid gap-6">
                  <TextField
                    id="textField"
                    name="textField"
                    label="Text Field"
                    control={form.control}
                    placeholder="Enter text..."
                    helperText="A basic text input field"
                    validation={{ required: true, minLength: 2 }}
                  />

                  <TextAreaField
                    id="textAreaField"
                    name="textAreaField"
                    label="Text Area Field"
                    control={form.control}
                    placeholder="Enter longer text..."
                    helperText="Multi-line text input for longer content"
                  />

                  <PasswordField
                    id="passwordField"
                    name="passwordField"
                    label="Password Field"
                    control={form.control}
                    placeholder="Enter password..."
                    helperText="Secure password input with toggle visibility"
                  />

                  <UrlField
                    id="urlField"
                    name="urlField"
                    label="URL Field"
                    control={form.control}
                    placeholder="https://example.com"
                    helperText="URL input with validation"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Number Fields Tab */}
            <TabsContent value="number" className="space-y-6">
              <div className="rounded-lg border p-6">
                <h3 className="mb-4 text-lg font-medium">Number Fields</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Numeric input fields for integers, decimals, and blockchain amounts.
                </p>
                <div className="grid gap-6">
                  <NumberField
                    id="numberField"
                    name="numberField"
                    label="Number Field"
                    control={form.control}
                    placeholder="0"
                    helperText="Standard number input for safe integers"
                    min={0}
                    max={1000}
                  />

                  <AmountField
                    id="amountField"
                    name="amountField"
                    label="Amount Field"
                    control={form.control}
                    placeholder="0.00"
                    helperText={`Token amount with symbol and decimal handling (${ecosystem === 'evm' ? 'ETH' : 'XLM'})`}
                    symbol={ecosystem === 'evm' ? 'ETH' : 'XLM'}
                    decimals={ecosystem === 'evm' ? 18 : 7}
                  />

                  <BigIntField
                    id="bigIntField"
                    name="bigIntField"
                    label="BigInt Field"
                    control={form.control}
                    placeholder="1000000000000000000"
                    helperText="Large integer input for uint256/u128 values"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Selection Fields Tab */}
            <TabsContent value="selection" className="space-y-6">
              <div className="rounded-lg border p-6">
                <h3 className="mb-4 text-lg font-medium">Selection Fields</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Fields for selecting from predefined options.
                </p>
                <div className="grid gap-6">
                  <SelectField
                    id="selectField"
                    name="selectField"
                    label="Select Field"
                    control={form.control}
                    placeholder="Select an option..."
                    helperText="Dropdown selection from options"
                    options={[
                      { label: 'Option A', value: 'a' },
                      { label: 'Option B', value: 'b' },
                      { label: 'Option C', value: 'c' },
                    ]}
                  />

                  <SelectGroupedField
                    id="selectGroupedField"
                    name="selectGroupedField"
                    label="Grouped Select Field"
                    control={form.control}
                    placeholder="Select from groups..."
                    helperText="Dropdown with grouped options"
                    groups={[
                      {
                        label: 'Group 1',
                        options: [
                          { label: 'Item 1A', value: '1a' },
                          { label: 'Item 1B', value: '1b' },
                        ],
                      },
                      {
                        label: 'Group 2',
                        options: [
                          { label: 'Item 2A', value: '2a' },
                          { label: 'Item 2B', value: '2b' },
                        ],
                      },
                    ]}
                  />

                  <RadioField
                    id="radioField"
                    name="radioField"
                    label="Radio Field"
                    control={form.control}
                    helperText="Single selection from radio buttons"
                    options={[
                      { label: 'Low Priority', value: 'low' },
                      { label: 'Medium Priority', value: 'medium' },
                      { label: 'High Priority', value: 'high' },
                    ]}
                  />

                  <EnumField
                    id="enumField"
                    name="enumField"
                    label="Enum Field"
                    control={form.control}
                    helperText="Selection for enum types (e.g., Solidity enums)"
                    enumMetadata={{
                      name: 'Status',
                      variants: [
                        { name: 'Active', type: 'integer', value: 0 },
                        { name: 'Pending', type: 'integer', value: 1 },
                        { name: 'Completed', type: 'integer', value: 2 },
                      ],
                      isUnitOnly: true,
                    }}
                  />

                  <BooleanField
                    id="booleanField"
                    name="booleanField"
                    label="Boolean Field"
                    control={form.control}
                    helperText="Checkbox for boolean values"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Data Fields Tab */}
            <TabsContent value="data" className="space-y-6">
              <div className="rounded-lg border p-6">
                <h3 className="mb-4 text-lg font-medium">Data Fields</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Specialized fields for blockchain-specific data types.
                </p>

                <EcosystemIndicator
                  description={`Address format: ${metadata.addressFormat}`}
                  className="mb-6"
                />

                <div className="grid gap-6">
                  <AddressField
                    id="addressField"
                    name="addressField"
                    label={`${metadata.name} Address`}
                    control={form.control}
                    placeholder={sampleAddresses.wallet?.slice(0, 20) + '...'}
                    helperText={`Validated ${metadata.name} address input`}
                    adapter={adapter}
                  />

                  <BytesField
                    id="bytesField"
                    name="bytesField"
                    label="Bytes Field"
                    control={form.control}
                    placeholder="0x..."
                    helperText="Hexadecimal bytes input (e.g., bytes32, calldata)"
                  />

                  <DateTimeField
                    id="dateTimeField"
                    name="dateTimeField"
                    label="DateTime Field"
                    control={form.control}
                    helperText="Date and time selection (converts to timestamp)"
                  />

                  <FileUploadField
                    id="fileUploadField"
                    name="fileUploadField"
                    label="File Upload Field"
                    control={form.control}
                    helperText="File upload for contract metadata, ABIs, etc."
                    accept=".json,.txt,.sol"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Complex Fields Tab */}
            <TabsContent value="complex" className="space-y-6">
              <div className="rounded-lg border p-6">
                <h3 className="mb-4 text-lg font-medium">Complex Fields</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Dynamic fields for arrays, maps, and structured data.
                </p>
                <div className="grid gap-6">
                  <ArrayField
                    id="arrayField"
                    name="arrayField"
                    label="Array Field"
                    control={form.control}
                    helperText="Dynamic array of values (add/remove items)"
                    elementType="text"
                    minItems={0}
                    maxItems={5}
                    renderElement={(field, index) => (
                      <TextField
                        key={field.id}
                        id={field.id}
                        name={field.name as `arrayField.${number}`}
                        label=""
                        control={form.control}
                        placeholder={`Item ${index + 1}`}
                      />
                    )}
                  />

                  <MapField
                    id="mapField"
                    name="mapField"
                    label="Map Field"
                    control={form.control}
                    helperText="Key-value pairs (e.g., mapping(address => uint256))"
                    renderKeyField={(field, index) => (
                      <TextField
                        key={`key-${index}`}
                        id={field.id}
                        name={`mapField.${index}.key` as `mapField.${number}.key`}
                        label=""
                        control={form.control}
                        placeholder="Key"
                      />
                    )}
                    renderValueField={(field, index) => (
                      <TextField
                        key={`value-${index}`}
                        id={field.id}
                        name={`mapField.${index}.value` as `mapField.${number}.value`}
                        label=""
                        control={form.control}
                        placeholder="Value"
                      />
                    )}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit">Submit All Fields</Button>
          </div>
        </form>
      </FormProvider>

      {/* Submitted Data Display */}
      {submittedData && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-medium">Submitted Data</h3>
          <CodeBlock
            language="json"
            code={JSON.stringify(
              submittedData,
              (_key, value) => {
                // Handle File objects for JSON serialization
                if (value instanceof File) {
                  return { name: value.name, size: value.size, type: value.type };
                }
                return value;
              },
              2
            )}
          />
        </div>
      )}
    </DemoSection>
  );
}
