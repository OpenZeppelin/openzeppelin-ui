import { useForm } from 'react-hook-form';

import {
  AddressField,
  AmountField,
  BigIntField,
  BooleanField,
  Button,
  BytesField,
  DateTimeField,
  EnumField,
  NumberField,
  PasswordField,
  TextAreaField,
  TextField,
  UrlField,
} from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';

type Variant = 'default' | 'neutral';

const VARIANTS: ReadonlyArray<{ key: Variant; title: string }> = [
  { key: 'default', title: 'Default' },
  { key: 'neutral', title: 'showValidState={false}' },
];

type Kind =
  | 'text'
  | 'textArea'
  | 'password'
  | 'url'
  | 'number'
  | 'amount'
  | 'bigInt'
  | 'boolean'
  | 'enum'
  | 'address'
  | 'bytes'
  | 'dateTime';

type ValidStateValues = Record<`${Kind}_${Variant}`, unknown> & { required_neutral: string };

const KINDS: ReadonlyArray<Kind> = [
  'text',
  'textArea',
  'password',
  'url',
  'number',
  'amount',
  'bigInt',
  'boolean',
  'enum',
  'address',
  'bytes',
  'dateTime',
];

function emptyValues(): ValidStateValues {
  const values = { required_neutral: '' } as ValidStateValues;
  for (const kind of KINDS) {
    for (const { key } of VARIANTS) {
      values[`${kind}_${key}`] = kind === 'boolean' ? false : kind === 'enum' ? undefined : '';
    }
  }
  return values;
}

/**
 * ValidStateDemo - `showValidState` on every field that shows the success border.
 *
 * Each row pairs a field without the prop (the default success border once touched)
 * with the same field set to `showValidState={false}` (stays neutral). All fields are
 * optional, except the last one, which is required with `showValidState={false}` to show
 * that the error border still appears.
 *
 * The `data-testid`s are stable hooks for browser checks against the running app.
 */
export function ValidStateDemo(): React.ReactElement {
  const { capabilities, sampleAddresses } = useEcosystem();

  const form = useForm<ValidStateValues>({
    defaultValues: emptyValues(),
    mode: 'onTouched',
  });

  const validValues: Record<Kind, unknown> = {
    text: 'Treasury',
    textArea: 'Monthly payout',
    password: 'correct horse',
    url: 'https://example.com',
    number: 5,
    amount: '1.50',
    bigInt: '123456789',
    boolean: true,
    enum: { tag: 'Active' },
    address: sampleAddresses.wallet ?? '',
    bytes: '0x1234',
    dateTime: '2026-01-15T10:30',
  };

  const fillValid = (): void => {
    for (const kind of KINDS) {
      for (const { key } of VARIANTS) {
        form.setValue(`${kind}_${key}`, validValues[kind], {
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    }
  };

  const renderField = (kind: Kind, variant: Variant): React.ReactElement => {
    const id = `valid-state-${kind}-${variant}`;
    const name = `${kind}_${variant}` as const;
    const common = {
      id,
      name,
      control: form.control,
      showValidState: variant === 'neutral' ? false : undefined,
    };
    switch (kind) {
      case 'text':
        return <TextField {...common} label="Text" />;
      case 'textArea':
        return <TextAreaField {...common} label="Text area" rows={2} />;
      case 'password':
        return <PasswordField {...common} label="Password" />;
      case 'url':
        return <UrlField {...common} label="URL" />;
      case 'number':
        return <NumberField {...common} label="Number" />;
      case 'amount':
        return <AmountField {...common} label="Amount" />;
      case 'bigInt':
        return <BigIntField {...common} label="Big integer" />;
      case 'boolean':
        return <BooleanField {...common} label="Boolean" />;
      case 'enum':
        // Without enum metadata the field takes JSON text, the path that shows the border.
        return <EnumField {...common} label="Enum (JSON)" />;
      case 'address':
        return <AddressField {...common} label="Address" addressing={capabilities ?? undefined} />;
      case 'bytes':
        return <BytesField {...common} label="Bytes" rows={1} />;
      case 'dateTime':
        return <DateTimeField {...common} label="Date and time" />;
    }
  };

  return (
    <section
      className="mt-8 space-y-4"
      aria-labelledby="valid-state-heading"
      data-testid="valid-state-demo"
    >
      <div className="space-y-1">
        <h3 id="valid-state-heading" className="text-lg font-medium">
          Success border opt-out
        </h3>
        <p className="text-muted-foreground text-sm">
          Fields show a success border once touched without an error. Set{' '}
          <code>showValidState={'{false}'}</code> to keep them neutral; error borders still show.
          Tab through both columns, then fill them with valid values.
        </p>
      </div>

      <form noValidate onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          {VARIANTS.map(({ key, title }) => (
            <p key={key} className="hidden text-sm font-medium md:block">
              <code>{title}</code>
            </p>
          ))}
          {KINDS.map((kind) =>
            VARIANTS.map(({ key }) => (
              <div key={`${kind}-${key}`} data-testid={`valid-state-${kind}-${key}`}>
                {renderField(kind, key)}
              </div>
            ))
          )}
          <div data-testid="valid-state-required-neutral">
            <TextField
              id="valid-state-required-neutral"
              name="required_neutral"
              label="Required, showValidState={false}"
              control={form.control}
              showValidState={false}
              validation={{ required: true }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={fillValid} data-testid="valid-state-fill">
            Fill with valid values
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset(emptyValues())}
            data-testid="valid-state-reset"
          >
            Reset
          </Button>
        </div>
      </form>
    </section>
  );
}
