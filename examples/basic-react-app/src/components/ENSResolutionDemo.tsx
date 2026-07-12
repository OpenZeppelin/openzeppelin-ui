import { ArrowRight } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import {
  AddressField,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';
import type { NameResolutionErrorCode } from '@openzeppelin/ui-utils';
import { nameResolutionMessageForCode } from '@openzeppelin/ui-utils';

import { useEcosystem } from '../context';
import { DemoSection } from './DemoSection';
import { EcosystemIndicator } from './EcosystemIndicator';
import { EnsV1V2ShowcaseSection } from './ENSShowcaseDemo';
import { NameResolutionNetworkHint } from './NameResolutionNetworkHint';
import { ResolvedAddressDisplay } from './ResolvedAddressDisplay';

/**
 * Well-known mainnet addresses that all have a primary (reverse) ENS record, so
 * each reverse-resolves to a name + avatar on mainnet and degrades to a truncated
 * hex on networks where it isn't registered.
 */
const SAMPLE_HEX_ADDRESSES = [
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
  '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5', // nick.eth
  '0x983110309620D911731Ac0932219af06091b6744', // brantly.eth
  '0x225f137127d9067788314bc7fcc1f36746a3c3B5', // luc.eth
];

/** The seven typed error codes SF-1 defines, in the order the docs present them. */
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
      description="ENS name resolution across the UIKit: type a name into any address field and it resolves inline; render an address as its reverse-ENS name + avatar; opt an address book into ENS. The showcase below covers classic ENS (v1), CCIP-Read off-chain records, and coinType cross-chain names — all through the same AddressField path. Resolution follows the app-wide active network — switch networks from the header selector (pick Ethereum Mainnet or Base for the live presets) and watch the behavior change."
      codeExample={ZERO_WIRING}
    >
      <EcosystemIndicator
        description="Name resolution is provided by an EVM/ENS adapter for the app's active network (choose it from the header network selector)."
        className="mb-2"
      />

      <LiveResolverWidget />

      <EnsV1V2ShowcaseSection />

      <ZeroWiringNote />

      <ErrorMessageReference networkName={metadata.name} />

      <ComponentLinks onNavigate={onNavigate} />
    </DemoSection>
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
  const { control } = useForm<LiveForm>({ mode: 'onChange', defaultValues: { recipient: '' } });
  const networkName = network?.name ?? '…';

  // The field writes the RESOLVED hex (never the typed name) to the form value,
  // so watching it gives us the address to render. Gate on the active network's
  // address validation so we only render a display for a settled hex.
  const recipient = useWatch({ control, name: 'recipient' });
  const hasResolvedAddress = Boolean(recipient && capabilities?.isValidAddress(recipient));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live ENS resolver</CardTitle>
        <CardDescription>
          Resolve a name against the app&apos;s active network — the outcome follows that
          network&apos;s ENS registry. On <span className="font-medium">Ethereum Mainnet</span>,{' '}
          <code className="bg-muted rounded px-1">ens.eth</code> resolves; on{' '}
          <span className="font-medium">Sepolia</span> it&apos;s not found (not in the testnet
          registry); on a non-ENS network you get a graceful “not supported”. Switch networks from
          the header selector.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <NameResolutionNetworkHint />

        {/* Forward: name → address (ambient app-wide resolver) */}
        <div className="space-y-2">
          <AddressField
            id="ens-recipient"
            name="recipient"
            label="Resolve a name"
            placeholder={`Try ens.eth or a hex address on ${networkName}`}
            helperText="Forward resolution — the outcome updates when you switch the active network in the header."
            control={control}
            addressing={capabilities ?? undefined}
            validation={{ required: true }}
          />

          {hasResolvedAddress && (
            <div className="bg-muted/30 space-y-1 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Resolved address
              </p>
              <ResolvedAddressDisplay
                address={recipient}
                truncate={false}
                showCopyButton
                showExplorerLink
              />
              <p className="text-muted-foreground text-xs">
                The full, untruncated address the field resolved to — reverse-resolved back to its
                name + avatar for display.
              </p>
            </div>
          )}
        </div>

        {/* Reverse: address → name + avatar */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Reverse resolution</p>
          <p className="text-muted-foreground text-xs">
            Each address shows its ENS name + avatar on mainnet, and a truncated hex on networks
            where it isn&apos;t registered.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SAMPLE_HEX_ADDRESSES.map((addr) => (
              <div key={addr} className="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
                <ResolvedAddressDisplay
                  address={addr}
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
        . The live widget above rides that same ambient resolver, so it follows whichever network
        you select in the header. See the code snippet below.
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
      desc: 'The form field — name resolution is an opt-in section (Forms).',
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
