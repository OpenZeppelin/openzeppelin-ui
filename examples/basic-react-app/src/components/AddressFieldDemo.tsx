import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { AddressField, Input, Label } from '@openzeppelin/ui-components';
import { classifyAddressInput } from '@openzeppelin/ui-utils';

import { useEcosystem } from '../context';
import { DemoSection } from './DemoSection';
import { EcosystemIndicator } from './EcosystemIndicator';
import { NameResolutionNetworkHint } from './NameResolutionNetworkHint';

interface ValidationForm {
  recipient: string;
}

interface ResolutionForm {
  recipient: string;
}

const USAGE = `import { useForm } from 'react-hook-form';
import { AddressField } from '@openzeppelin/ui-components';

function TransferForm({ adapter }) {
  const { control, handleSubmit, formState } = useForm({ mode: 'onChange' });

  return (
    <form onSubmit={handleSubmit((v) => console.log('submit:', v.recipient))}>
      {/* Chain-agnostic: validation comes from the adapter's addressing
          capability — EVM, Stellar, Polkadot, ... no chain logic in the field. */}
      <AddressField
        id="recipient"
        name="recipient"
        label="Recipient"
        control={control}
        addressing={adapter.addressing}
        validation={{ required: true }}
      />
      <button type="submit" disabled={!formState.isValid}>Send</button>
    </form>
  );
}

// Optional features are injected via context providers — the field itself
// never changes:
//
// - Alias autocomplete: mount an AddressSuggestionProvider
//   (see the Account Alias demo).
// - Name resolution (e.g. ENS on EVM): mount a NameResolverProvider fed by
//   useRuntimeNameResolver — typed names then resolve inline and the form
//   value is always the resolved address, never the name.
//
//   import { NameResolverProvider } from '@openzeppelin/ui-components';
//   import { useRuntimeNameResolver } from '@openzeppelin/ui-react';
//
//   <NameResolverProvider {...useRuntimeNameResolver()}>
//     <TransferForm adapter={adapter} />
//   </NameResolverProvider>`;

/**
 * Gallery demo for the base {@link AddressField}: a chain-agnostic address
 * input validated through the active network's addressing capability. Optional
 * features — alias autocomplete and inline name resolution — arrive via
 * context providers, never via props or forks; each gets its own sub-section.
 */
export function AddressFieldDemo(): React.ReactElement {
  const { capabilities, metadata, isLoading } = useEcosystem();

  if (isLoading || !capabilities || !metadata) {
    return (
      <DemoSection title="AddressField" description="Loading...">
        <div className="text-muted-foreground">Loading runtime...</div>
      </DemoSection>
    );
  }

  return (
    <DemoSection
      title="AddressField"
      description="Blockchain address input for React Hook Form. Chain-agnostic by design: address validation is delegated to the active network's addressing capability, and optional features (alias autocomplete, name resolution) are injected through context providers — the component itself never changes."
      codeExample={USAGE}
    >
      <EcosystemIndicator
        description="Validation follows the active network's addressing capability."
        className="mb-2"
      />

      <ValidationSection networkName={metadata.name} />

      <SuggestionsNote />

      <NameResolutionSection />

      <InputClassifierPlayground
        isValidAddress={capabilities.isValidAddress}
        networkName={metadata.name}
      />
    </DemoSection>
  );
}

// ----------------------------------------------------------------------------
// Chain-aware validation (the core, chain-agnostic behavior)
// ----------------------------------------------------------------------------

function ValidationSection({ networkName }: { networkName: string }): React.ReactElement {
  const { capabilities } = useEcosystem();
  const [submitted, setSubmitted] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<ValidationForm>({
    mode: 'onChange',
    defaultValues: { recipient: '' },
  });

  const onSubmit = handleSubmit((values) => setSubmitted(values.recipient));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Chain-aware validation</h3>
        <p className="text-muted-foreground text-sm">
          The field validates against the active network&apos;s{' '}
          <code className="bg-muted rounded px-1">addressing</code> capability — paste a valid{' '}
          {networkName} address and submit enables; anything malformed surfaces a format error.
          Switch the ecosystem in the header and the same field validates the new chain&apos;s
          format.
        </p>
      </div>

      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <AddressField
          id="basic-recipient"
          name="recipient"
          label="Recipient"
          placeholder={`Paste a ${networkName} address`}
          helperText="Validation is provided by the adapter — the field has no chain logic."
          control={control}
          addressing={capabilities ?? undefined}
          validation={{ required: true }}
        />

        <button
          type="submit"
          disabled={!formState.isValid}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {submitted && (
        <div className="bg-muted/40 max-w-md space-y-1 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Submitted payload
          </p>
          <p className="font-mono text-sm break-all">{submitted}</p>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Alias autocomplete pointer (feature lives in the Account Alias demo)
// ----------------------------------------------------------------------------

function SuggestionsNote(): React.ReactElement {
  return (
    <div className="space-y-2 border-t border-border/60 pt-6">
      <h3 className="text-lg font-medium">Alias autocomplete (opt-in)</h3>
      <p className="text-muted-foreground text-sm">
        With an <code className="bg-muted rounded px-1">AddressSuggestionProvider</code> mounted
        (app-wide here), every field offers address-book suggestions as the user types — see the{' '}
        <span className="font-medium">Account Alias</span> demo under Storage for the full flow.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Name resolution (opt-in feature, network-dependent)
// ----------------------------------------------------------------------------

function NameResolutionSection(): React.ReactElement {
  const { capabilities, network, isLoading } = useEcosystem();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string | undefined>(undefined);

  const { control, handleSubmit, formState } = useForm<ResolutionForm>({
    mode: 'onChange',
    defaultValues: { recipient: '' },
  });

  const onSubmit = handleSubmit((values) => setSubmitted(values.recipient));

  return (
    <div className="space-y-4 border-t border-border/60 pt-6">
      <div>
        <h3 className="text-lg font-medium">Name resolution (opt-in)</h3>
        <p className="text-muted-foreground text-sm">
          With a <code className="bg-muted rounded px-1">NameResolverProvider</code> mounted, the
          same field also accepts a name — e.g. ENS: try{' '}
          <code className="bg-muted rounded px-1">vitalik.eth</code>. The form value is always the
          resolved address, never the name, and submit stays gated until resolution completes.
          Without the provider (or on networks without a resolver) the field behaves exactly as
          above. This app mounts that provider globally, fed by{' '}
          <code className="bg-muted rounded px-1">useRuntimeNameResolver</code> — so the field
          follows the active network chosen from the header selector.
        </p>
      </div>

      <NameResolutionNetworkHint />

      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <AddressField
          id="ens-recipient"
          name="recipient"
          label="Recipient"
          placeholder={`Address or name on ${network?.name ?? '…'}`}
          helperText="Names resolve inline; the submitted value is always the resolved address."
          control={control}
          addressing={capabilities ?? undefined}
          validation={{ required: true }}
          onResolvedNameChange={setResolvedName}
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!formState.isValid || isLoading}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
          {resolvedName && (
            <span className="text-muted-foreground text-sm">
              Resolved name: <span className="text-foreground font-medium">{resolvedName}</span>
            </span>
          )}
        </div>
      </form>

      {submitted && (
        <div className="bg-muted/40 max-w-md space-y-1 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Submitted payload
          </p>
          <p className="font-mono text-sm break-all">{submitted}</p>
          <p className="text-muted-foreground text-xs">
            The resolved address — never the name the user typed.
          </p>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// classifyAddressInput sub-section (drives the field's branch)
// ----------------------------------------------------------------------------

/**
 * Surfaces the pure `classifyAddressInput` helper that decides the field's branch
 * (hex passthrough vs. name resolution vs. malformed). Purely educational — it
 * performs no I/O.
 */
function InputClassifierPlayground({
  isValidAddress,
  networkName,
}: {
  isValidAddress: (value: string) => boolean;
  networkName: string;
}): React.ReactElement {
  const [value, setValue] = useState('');

  const classification = useMemo(
    () => classifyAddressInput(value, { isValidAddress }),
    [value, isValidAddress]
  );

  const description: Record<typeof classification, string> = {
    empty: 'Nothing typed yet — standard sync validation applies.',
    hex: `Valid ${networkName} address — passthrough, no resolution attempted.`,
    'name-candidate': 'Looks like a name — resolved inline when a resolver is mounted.',
    malformed: 'Neither a valid address nor a name — surfaces the standard format error.',
  };

  return (
    <div className="space-y-3 border-t border-border/60 pt-6">
      <div>
        <h3 className="text-lg font-medium">classifyAddressInput</h3>
        <p className="text-muted-foreground text-sm">
          The synchronous <code className="bg-muted rounded px-1">@openzeppelin/ui-utils</code>{' '}
          classifier that decides the field&apos;s branch. Type below to see how any input is
          categorized before any network call happens.
        </p>
      </div>
      <div className="max-w-md space-y-2">
        <Label htmlFor="classifier-input">Any input</Label>
        <Input
          id="classifier-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a name, an address, or garbage…"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Classification:</span>
          <code className="bg-muted rounded px-1.5 py-0.5 font-medium">{classification}</code>
        </div>
        <p className="text-muted-foreground text-xs">{description[classification]}</p>
      </div>
    </div>
  );
}
