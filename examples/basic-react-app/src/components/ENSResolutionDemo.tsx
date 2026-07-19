import { ArrowRight } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import {
  AddressFieldWithResolvedPreview,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';
import { ResolvedAddressFieldPreviewWithNameResolution } from '@openzeppelin/ui-renderer';
import type { NameResolutionErrorCode } from '@openzeppelin/ui-utils';
import { nameResolutionMessageForCode } from '@openzeppelin/ui-utils';

import { useEcosystem } from '../context';
import { useMainnetL1FallbackOptIn } from '../context/mainnetL1FallbackOptInContext';
import { CodeBlock } from './CodeBlock';
import { DemoSection } from './DemoSection';
import { EcosystemIndicator } from './EcosystemIndicator';
import { EnsV1V2ShowcaseSection } from './ENSShowcaseDemo';
import { MainnetL1FallbackOptInToggle } from './MainnetL1FallbackOptInToggle';
import { NameResolutionNetworkHint } from './NameResolutionNetworkHint';
import { networkLabel } from './networkOptions';
import { ResolvedAddressDisplay } from './ResolvedAddressDisplay';

/**
 * Well-known mainnet addresses with reverse ENS records. On `ethereum-sepolia`,
 * only brantly.eth has a native testnet record; the others resolve via mainnet
 * fallback when runtime opt-in is enabled.
 */
const SAMPLE_REVERSE_ADDRESSES = [
  {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    ensName: 'vitalik.eth',
    sepoliaResolution: 'mainnet-fallback' as const,
  },
  {
    address: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5',
    ensName: 'nick.eth',
    sepoliaResolution: 'mainnet-fallback' as const,
  },
  {
    address: '0x983110309620D911731Ac0932219af06091b6744',
    ensName: 'brantly.eth',
    sepoliaResolution: 'native' as const,
  },
  {
    address: '0x225f137127d9067788314bc7fcc1f36746a3c3B5',
    ensName: 'luc.eth',
    sepoliaResolution: 'mainnet-fallback' as const,
  },
];

/** Typed error codes from the name-resolution contract, in docs order. */
const ERROR_CODES: NameResolutionErrorCode[] = [
  'NAME_NOT_FOUND',
  'UNSUPPORTED_NAME',
  'UNSUPPORTED_NETWORK',
  'RESOLUTION_TIMEOUT',
  'EXTERNAL_GATEWAY_ERROR',
  'ADAPTER_ERROR',
  'ADDRESS_NOT_FOUND',
];

const ZERO_WIRING = `import { TransactionForm } from '@openzeppelin/ui-renderer';
import { WalletStateProvider } from '@openzeppelin/ui-react';

// Nothing to wire: TransactionForm mounts a NameResolverProvider (fed by
// useRuntimeNameResolver), which makes the base AddressField behind every
// 'blockchain-address' field ENS-capable the moment it renders under a
// WalletStateProvider. Consumers change no code — there is no fork component.
<WalletStateProvider adapter={evmAdapter}>
  <TransactionForm schema={erc20TransferSchema} adapter={evmAdapter} contractSchema={contract} />
</WalletStateProvider>;`;

const OPT_IN_WIRING = `import { useCallback, useMemo, useState } from 'react';
import { RuntimeProvider } from '@openzeppelin/ui-react';
import type { CreateRuntimeOptions, NetworkConfig } from '@openzeppelin/ui-types';

const [enableMainnetL1MissFallback, setEnableMainnetL1MissFallback] = useState(false);

// Third createRuntime arg — omit entirely when fallback is off (default).
const runtimeCreationOptions = useMemo((): CreateRuntimeOptions | undefined => {
  if (!enableMainnetL1MissFallback) return undefined;
  return { nameResolution: { enableMainnetL1MissFallback: true } };
}, [enableMainnetL1MissFallback]);

const resolveRuntime = useCallback(
  (networkConfig: NetworkConfig) =>
    ecosystemDefinition.createRuntime('composer', networkConfig, runtimeCreationOptions),
  [runtimeCreationOptions]
);

// RuntimeProvider flushes cached runtimes when resolveRuntime changes,
// so forward + reverse resolution re-run immediately after toggling.
<RuntimeProvider resolveRuntime={resolveRuntime}>
  <WalletStateProvider /* … */>{children}</WalletStateProvider>
</RuntimeProvider>;`;

const PREVIEW_WIRING = `import { useForm, useWatch } from 'react-hook-form';
import { AddressFieldWithResolvedPreview } from '@openzeppelin/ui-components';
import { ResolvedAddressFieldPreviewWithNameResolution } from '@openzeppelin/ui-renderer';

function TransferRecipientField({ control, addressing, networkId }) {
  const previewAddress = useWatch({ control, name: 'recipient' });

  return (
    <AddressFieldWithResolvedPreview
      id="recipient"
      name="recipient"
      label="Recipient"
      control={control}
      addressing={addressing}
      validation={{ required: true }}
      previewAddress={previewAddress}
      previewNetworkId={networkId}
      preview={
        <ResolvedAddressFieldPreviewWithNameResolution
          address={previewAddress}
          networkId={networkId}
          addressing={addressing}
        />
      }
    />
  );
}

// Suppresses the forward "Resolved to 0x…" announcer by default — the preview
// card replaces it. Cross-network fallback disclaimer appears on AddressDisplay
// inside the card (amber triangle-alert) unless you pass resolvedName with custom UI.`;

const DISCLAIMER_PROPS = `import {
  AddressField,
  AddressFieldWithResolvedPreview,
  AddressDisplay,
} from '@openzeppelin/ui-components';

// Base field: muted note under the success template (default on).
<AddressField showCrossNetworkFallbackDisclaimer={false} />

// Rich preview: announcers suppressed by default — disclaimer on the card instead.
<AddressFieldWithResolvedPreview previewAddress={watch('recipient')} /* … */ />

// Reverse-only: amber triangle-alert + tooltip after the verified name (default on).
<AddressDisplay address={hex} resolvedName={record} showCrossNetworkFallbackDisclaimer />`;

interface DemoProps {
  onNavigate?: (key: string) => void;
}

interface LiveForm {
  recipient: string;
}

/**
 * Integration story for ENS name resolution. This page is the narrative + a live
 * resolver widget; the individual components have dedicated gallery pages (linked
 * below). Resolution follows the app-wide active network (choose it from the
 * header network selector) — pick Ethereum Mainnet to resolve real names.
 */
export function ENSResolutionDemo({ onNavigate }: DemoProps): React.ReactElement {
  const { metadata } = useEcosystem();

  // Gate only the initial load — brief isLoading during network switches must not
  // unmount live demo widgets (preset selection, typed names, etc.).
  if (!metadata) {
    return (
      <DemoSection title="Name Resolution" description="Loading...">
        <div className="text-muted-foreground">Loading runtime...</div>
      </DemoSection>
    );
  }

  return (
    <DemoSection
      title="Name Resolution"
      description="ENS across the UIKit: type a name into any address field (forward), render an address as its reverse-ENS name (reverse), or opt an address book into ENS. Use AddressFieldWithResolvedPreview for the recommended forward + rich preview card UX. Resolution follows the app-wide active network (`ethereum-mainnet`, `ethereum-sepolia`, …) — switch networks from the header selector. On Sepolia, only brantly.eth has a native testnet record; enable mainnet fallback below to resolve mainnet-only names while staying on Sepolia. Forward and reverse both honor the toggle and show a provenance disclaimer when fallback was used."
      codeExample={ZERO_WIRING}
    >
      <EcosystemIndicator
        description="Name resolution is provided by an EVM/ENS adapter for the app's active network (choose it from the header network selector)."
        className="mb-2"
      />

      <OptInWiringReference />

      <MainnetL1FallbackOptInToggle />

      <LiveResolverWidget />

      <EnsV1V2ShowcaseSection />

      <ZeroWiringNote />

      <ErrorMessageReference networkName={metadata.name} />

      <ComponentLinks onNavigate={onNavigate} />
    </DemoSection>
  );
}

function OptInWiringReference(): React.ReactElement {
  return (
    <div className="mb-6 space-y-4">
      <div>
        <h3 className="text-lg font-medium">Integrator wiring</h3>
        <p className="text-muted-foreground text-sm">
          This app mirrors production setup in{' '}
          <code className="bg-muted rounded px-1">AppProviders.tsx</code>: runtime creation options
          gate adapter fallback; UI disclaimer props gate presentation only.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Runtime opt-in (default off)</p>
        <CodeBlock code={OPT_IN_WIRING} language="tsx" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Rich preview field (recommended)</p>
        <CodeBlock code={PREVIEW_WIRING} language="tsx" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Disclaimer presentation (default on)</p>
        <CodeBlock code={DISCLAIMER_PROPS} language="tsx" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Live resolver widget — network picker (driver) + forward field + reverse list
// ----------------------------------------------------------------------------

/**
 * A single self-contained ENS-resolver widget driven by the app-wide active
 * network: the forward field resolves a typed name and the reverse list renders
 * a set of well-known addresses, both reacting live to the network chosen from
 * the header selector. Forward resolution rides the ambient `NameResolverProvider`
 * (fed by `useRuntimeNameResolver` in the app providers); reverse resolution
 * rides the renderer's `AddressNameResolutionProvider`.
 */
function LiveResolverWidget(): React.ReactElement {
  const { capabilities, network } = useEcosystem();
  const { enabled: mainnetFallbackEnabled } = useMainnetL1FallbackOptIn();
  const { control } = useForm<LiveForm>({ mode: 'onChange', defaultValues: { recipient: '' } });
  const networkName = network?.name ?? '…';
  const networkId = network?.id ?? '…';
  const isSepolia = networkId === 'ethereum-sepolia';
  const mainnetLabel = networkLabel('ethereum-mainnet');
  const sepoliaLabel = networkLabel('ethereum-sepolia');

  // The field writes the RESOLVED hex (never the typed name) to the form value,
  // so watching it gives us the address to render. Gate on the active network's
  // address validation so we only render a display for a settled hex.
  const recipient = useWatch({ control, name: 'recipient' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live ENS resolver</CardTitle>
        <CardDescription>
          Resolve a name against the app&apos;s active network — the outcome follows that
          network&apos;s ENS registry (<code className="bg-muted rounded px-1">{networkId}</code>).
          On <span className="font-medium">{mainnetLabel}</span>,{' '}
          <code className="bg-muted rounded px-1">ens.eth</code> resolves; on{' '}
          <span className="font-medium">{sepoliaLabel}</span> it is not in the testnet registry; on
          a non-ENS network you get a graceful “not supported”. Switch networks from the header
          selector.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <NameResolutionNetworkHint />

        {/* Forward: name → address (ambient app-wide resolver) */}
        <div className="space-y-2">
          <AddressFieldWithResolvedPreview
            id="ens-recipient"
            name="recipient"
            label="Resolve a name"
            placeholder={`Try ens.eth or a hex address on ${networkName}`}
            helperText="Forward resolution — updates when you switch the active network or toggle mainnet fallback."
            control={control}
            addressing={capabilities ?? undefined}
            validation={{ required: true }}
            previewAddress={recipient}
            previewNetworkId={networkId}
            preview={
              <ResolvedAddressFieldPreviewWithNameResolution
                address={recipient}
                networkId={networkId}
                addressing={capabilities ?? undefined}
                label="Resolved address"
                displayProps={{ truncate: false, showCopyButton: true }}
              />
            }
          />
          <p className="text-muted-foreground text-xs">
            Reverse-resolved display for the hex above. Cross-network fallback provenance shows as
            an amber triangle-alert inline after the name (default on).
          </p>
        </div>

        {/* Reverse: address → name + avatar */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Reverse resolution</p>
          <p className="text-muted-foreground text-xs">
            Each row shows how an address reverse-resolves on{' '}
            <span className="font-medium">{networkName}</span> (
            <code className="bg-muted rounded px-1">{networkId}</code>). On{' '}
            <span className="font-medium">{sepoliaLabel}</span>, only{' '}
            <span className="font-medium">brantly.eth</span> has a native testnet record; the others
            resolve only when mainnet fallback is enabled (toggle above). Changing the toggle
            re-resolves every row.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SAMPLE_REVERSE_ADDRESSES.map(({ address, ensName, sepoliaResolution }) => (
              <div key={address} className="bg-muted/30 space-y-2 rounded-lg p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{ensName}</code>
                  {isSepolia && (
                    <span
                      className={
                        sepoliaResolution === 'native'
                          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300'
                          : 'rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300'
                      }
                    >
                      {sepoliaResolution === 'native'
                        ? 'Sepolia native'
                        : mainnetFallbackEnabled
                          ? 'Mainnet fallback'
                          : 'Needs mainnet fallback'}
                    </span>
                  )}
                </div>
                <ResolvedAddressDisplay
                  address={address}
                  showCopyButton
                  showTooltip
                  showExplorerLink
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Zero-wiring note
// ----------------------------------------------------------------------------

function ZeroWiringNote(): React.ReactElement {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">How it works — zero wiring</h3>
      <p className="text-muted-foreground text-sm">
        There is no fork component: the renderer&apos;s field registry maps the{' '}
        <code className="bg-muted rounded px-1">blockchain-address</code> field type to the base{' '}
        <code className="bg-muted rounded px-1">AddressField</code>, and{' '}
        <code className="bg-muted rounded px-1">TransactionForm</code> mounts a{' '}
        <code className="bg-muted rounded px-1">NameResolverProvider</code> fed by{' '}
        <code className="bg-muted rounded px-1">useRuntimeNameResolver</code> (the app-wide active
        network). Every dynamic-form address field becomes ENS-capable automatically — the only
        requirement is an ambient <code className="bg-muted rounded px-1">WalletStateProvider</code>
        . The live widget above uses{' '}
        <code className="bg-muted rounded px-1">AddressFieldWithResolvedPreview</code> with the
        renderer&apos;s{' '}
        <code className="bg-muted rounded px-1">ResolvedAddressFieldPreviewWithNameResolution</code>{' '}
        bridge — the same ambient resolver as dynamic forms, so it follows whichever network you
        select in the header. See the code snippets below.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Error taxonomy
// ----------------------------------------------------------------------------

/**
 * Renders every typed error code through `nameResolutionMessageForCode`, so a dev
 * can see the exact user-facing string each failure maps to (the field renders
 * these internally — never the raw diagnostic fields).
 */
function ErrorMessageReference({ networkName }: { networkName: string }): React.ReactElement {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-medium">Error taxonomy — nameResolutionMessageForCode</h3>
        <p className="text-muted-foreground text-sm">
          Resolution never throws; every failure is one of seven typed codes, each mapped to a
          distinct, actionable message. This is the single i18n seam — consumers render this, never
          raw <code className="bg-muted rounded px-1">error.message</code> /{' '}
          <code className="bg-muted rounded px-1">detail</code>.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs uppercase">
              <th className="py-2 pr-4 font-medium">Code</th>
              <th className="py-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {ERROR_CODES.map((code) => (
              <tr key={code} className="border-b last:border-0">
                <td className="py-2 pr-4 align-top">
                  <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{code}</code>
                </td>
                <td className="text-muted-foreground py-2">
                  {nameResolutionMessageForCode(code, { networkName })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Links to the component gallery pages
// ----------------------------------------------------------------------------

function ComponentLinks({ onNavigate }: DemoProps): React.ReactElement {
  const links = [
    {
      key: 'address-field',
      title: 'AddressField',
      desc: 'Base field + rich ENS preview section (Forms).',
    },
    {
      key: 'address-display',
      title: 'AddressDisplay',
      desc: 'The display — name resolution is an opt-in section (Data Display).',
    },
    {
      key: 'account-alias',
      title: 'Address Book — ENS',
      desc: 'AddressBookWidget with enableNameResolution (Storage).',
    },
  ];

  return (
    <div className="space-y-3 border-t border-border/60 pt-6">
      <h3 className="text-lg font-medium">Explore the components</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {links.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => onNavigate?.(l.key)}
            className="hover:border-primary/60 hover:bg-muted/40 group rounded-lg border p-3 text-left transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{l.title}</span>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0" />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{l.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
