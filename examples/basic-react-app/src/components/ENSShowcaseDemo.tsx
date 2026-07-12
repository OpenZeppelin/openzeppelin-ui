import { useCallback, useLayoutEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import {
  AddressField,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import { getNetworkById } from '../core/ecosystemManager';
import { ENS_RESOLUTION_NETWORK_ID } from './NameResolutionNetworkHint';
import { NetworkRequirementHint } from './NetworkRequirementHint';
import { ResolvedAddressDisplay } from './ResolvedAddressDisplay';

// ----------------------------------------------------------------------------
// Live-verified preset catalog (resolved through local adapter-evm + viem)
// ----------------------------------------------------------------------------

interface ClassicPreset {
  kind: 'classic';
  name: string;
  expectedAddress: string;
}

interface CcipPreset {
  kind: 'ccip';
  name: string;
  expectedAddress: string;
}

interface CoinTypePreset {
  kind: 'cointype';
  name: string;
  expectedByNetwork: Record<string, string>;
}

type EnsPreset = ClassicPreset | CcipPreset | CoinTypePreset;

const CLASSIC_PRESETS: ClassicPreset[] = [
  {
    kind: 'classic',
    name: 'vitalik.eth',
    expectedAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  },
  {
    kind: 'classic',
    name: 'nick.eth',
    expectedAddress: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5',
  },
];

const V2_CCIP_PRESETS: CcipPreset[] = [
  {
    kind: 'ccip',
    name: 'ur.integration-tests.eth',
    expectedAddress: '0x2222222222222222222222222222222222222222',
  },
];

const V2_COINTYPE_PRESETS: CoinTypePreset[] = [
  {
    kind: 'cointype',
    name: 'test.ses.eth',
    expectedByNetwork: {
      'ethereum-mainnet': '0x2B0F09F23193de2Fb66258a10886B9f06903276c',
      'base-mainnet': '0x7d3a48269416507e6d207a9449e7800971823ffa',
    },
  },
];

const ALL_PRESETS: EnsPreset[] = [...CLASSIC_PRESETS, ...V2_CCIP_PRESETS, ...V2_COINTYPE_PRESETS];

const BASE_NETWORK_ID = 'base-mainnet';

const SHOWCASE_RECIPIENT_FIELD_ID = 'ens-showcase-recipient';

interface LiveForm {
  recipient: string;
}

/**
 * Seeds a preset name through the field's native `input` handler so the value
 * flows via `commitTypedValue` (same path as typing). RHF `setValue` bypasses
 * that path and can dispatch resolution before the runtime is ready.
 */
function dispatchProgrammaticInput(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function useProgrammaticNameInput(
  inputId: string,
  seedName: string,
  enabled: boolean,
  seedVersion: string
): void {
  useLayoutEffect(() => {
    if (!enabled || !seedName) {
      return;
    }

    let cancelled = false;

    function attemptSeed(attempt: number): void {
      if (cancelled) {
        return;
      }

      const element = document.getElementById(inputId);
      if (!(element instanceof HTMLInputElement)) {
        if (attempt < 3) {
          requestAnimationFrame(() => attemptSeed(attempt + 1));
        }
        return;
      }

      dispatchProgrammaticInput(element, seedName);
    }

    attemptSeed(0);

    return () => {
      cancelled = true;
    };
  }, [inputId, seedName, enabled, seedVersion]);
}

interface PresetChipGroupProps {
  title: string;
  description: string;
  presets: EnsPreset[];
  activeName: string | null;
  onSelect: (name: string) => void;
}

/**
 * Clickable preset chips that seed the live AddressField with a verified name.
 */
function PresetChipGroup({
  title,
  description,
  presets,
  activeName,
  onSelect,
}: PresetChipGroupProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const isActive = activeName === preset.name;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => onSelect(preset.name)}
              className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <code className="font-mono">{preset.name}</code>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CoinTypeNetworkSwitcherProps {
  activeName: string | null;
}

/**
 * Inline Mainnet / Base quick-switch for the coinType preset — complements the
 * header NetworkSwitcher and makes the per-chain address change obvious.
 */
function CoinTypeNetworkSwitcher({
  activeName,
}: CoinTypeNetworkSwitcherProps): React.ReactElement | null {
  const { network, setNetwork, isLoading } = useEcosystem();
  const coinTypeActive = activeName === 'test.ses.eth';

  const switchTo = useCallback(
    (networkId: string) => {
      if (network?.id === networkId || isLoading) {
        return;
      }
      void getNetworkById(networkId).then((config) => {
        if (config) {
          void setNetwork(config);
        }
      });
    },
    [network?.id, setNetwork, isLoading]
  );

  if (!coinTypeActive) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <p className="text-sm font-medium">coinType — same name, chain-specific address</p>
      <p className="text-muted-foreground text-xs">
        Switch between Ethereum Mainnet and Base. The field re-resolves{' '}
        <code className="bg-muted rounded px-1">test.ses.eth</code> for the active network; submit
        stays blocked when the resolved record is scoped to a different chain.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => switchTo(ENS_RESOLUTION_NETWORK_ID)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            network?.id === ENS_RESOLUTION_NETWORK_ID
              ? 'border-primary bg-primary/10'
              : 'hover:border-primary/50'
          }`}
        >
          Ethereum Mainnet
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => switchTo(BASE_NETWORK_ID)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            network?.id === BASE_NETWORK_ID
              ? 'border-primary bg-primary/10'
              : 'hover:border-primary/50'
          }`}
        >
          Base Mainnet
        </button>
      </div>
    </div>
  );
}

interface LiveShowcaseWidgetProps {
  seedName: string;
  seedKey: number;
  presetKind: EnsPreset['kind'] | null;
}

interface LiveShowcaseFormProps {
  seedName: string;
}

/**
 * Form slice keyed per preset × network so a network switch never leaves a stale
 * resolved hex in RHF that overwrites the re-seeded preset name.
 */
function LiveShowcaseForm({ seedName }: LiveShowcaseFormProps): React.ReactElement {
  const { capabilities, network, isLoading } = useEcosystem();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const networkId = network?.id;
  const fieldSeedVersion = `${seedName}-${networkId ?? 'unknown'}`;

  const { control, handleSubmit, formState } = useForm<LiveForm>({
    mode: 'onChange',
    defaultValues: { recipient: '' },
  });

  const recipient = useWatch({ control, name: 'recipient' });
  const hasResolvedAddress = Boolean(recipient && capabilities?.isValidAddress(recipient));
  const networkName = network?.name ?? '…';

  useProgrammaticNameInput(SHOWCASE_RECIPIENT_FIELD_ID, seedName, true, fieldSeedVersion);

  const onSubmit = handleSubmit((values) => setSubmitted(values.recipient));

  const activePreset = ALL_PRESETS.find((preset) => preset.name === seedName);

  const expectedAddress =
    activePreset?.kind === 'cointype' && networkId
      ? activePreset.expectedByNetwork[networkId]
      : activePreset && activePreset.kind !== 'cointype'
        ? activePreset.expectedAddress
        : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <AddressField
        id={SHOWCASE_RECIPIENT_FIELD_ID}
        name="recipient"
        label="ENS name or address"
        placeholder={`Address or name on ${networkName}`}
        helperText="Preset chips seed this field; resolution follows the active network."
        control={control}
        addressing={capabilities ?? undefined}
        validation={{ required: true }}
      />

      <button
        type="submit"
        disabled={!formState.isValid || isLoading}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit resolved address
      </button>

      {hasResolvedAddress && (
        <div className="bg-muted/30 space-y-2 rounded-lg p-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Resolved address
          </p>
          <ResolvedAddressDisplay
            address={recipient}
            truncate={false}
            showCopyButton
            showExplorerLink
          />
          {expectedAddress && (
            <p className="text-muted-foreground text-xs">
              Verified live preset for <code className="bg-muted rounded px-1">{seedName}</code> on{' '}
              <span className="font-medium">{networkName}</span>:{' '}
              <code className="bg-muted rounded px-1 font-mono">{expectedAddress}</code>
            </p>
          )}
        </div>
      )}

      {submitted && (
        <div className="bg-muted/40 space-y-1 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Submitted payload
          </p>
          <p className="font-mono text-sm break-all">{submitted}</p>
          <p className="text-muted-foreground text-xs">
            Only the resolved hex is submitted — never the typed name.
          </p>
        </div>
      )}
    </form>
  );
}

/**
 * AddressField + submit gate + mechanism-neutral resolved display. Resolution
 * rides the ambient NameResolverProvider; no hand-rolled ENS calls.
 */
function LiveShowcaseWidget({
  seedName,
  seedKey,
  presetKind,
}: LiveShowcaseWidgetProps): React.ReactElement {
  const { capabilities, network, isLoading } = useEcosystem();
  const networkName = network?.name ?? '…';
  const networkId = network?.id;
  const resolverReady = !isLoading && capabilities != null;
  const fieldSeedVersion = `${seedKey}-${networkId ?? 'unknown'}`;

  const needsMainnetHint =
    presetKind === 'classic' || presetKind === 'ccip' ? ENS_RESOLUTION_NETWORK_ID : null;
  const showCoinTypeWrongNetwork =
    presetKind === 'cointype' &&
    networkId !== ENS_RESOLUTION_NETWORK_ID &&
    networkId !== BASE_NETWORK_ID;

  return (
    <div className="space-y-4">
      {needsMainnetHint && (
        <NetworkRequirementHint requiredNetworkId={needsMainnetHint}>
          This preset resolves on <span className="font-medium">Ethereum Mainnet</span>. Switch the
          header network selector (top-right) to Mainnet.
        </NetworkRequirementHint>
      )}

      {showCoinTypeWrongNetwork && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
        >
          <p>
            <code className="bg-muted rounded px-1">test.ses.eth</code> resolves on{' '}
            <span className="font-medium">Ethereum Mainnet</span> or{' '}
            <span className="font-medium">Base Mainnet</span> — pick one from the header selector or
            the inline switch below. On <span className="font-medium">{networkName}</span> the
            coinType record is out of scope and submit stays blocked.
          </p>
        </div>
      )}

      <CoinTypeNetworkSwitcher activeName={seedName || null} />

      {resolverReady ? (
        <LiveShowcaseForm key={fieldSeedVersion} seedName={seedName} />
      ) : (
        <p className="text-muted-foreground text-sm">Preparing resolver for {networkName}…</p>
      )}
    </div>
  );
}

/**
 * ENS v1 & v2 preset showcase — classic on-chain, CCIP-Read, and coinType names
 * resolved through the same AddressField path. Rendered as a section within the
 * Name Resolution demo page.
 */
export function EnsV1V2ShowcaseSection(): React.ReactElement {
  const [activeName, setActiveName] = useState<string | null>(null);
  const [seedKey, setSeedKey] = useState(0);

  const selectPreset = useCallback((name: string) => {
    setActiveName(name);
    setSeedKey((key) => key + 1);
  }, []);

  const activePresetKind = ALL_PRESETS.find((preset) => preset.name === activeName)?.kind ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>ENS v1 &amp; v2 showcase</CardTitle>
        <CardDescription>
          Live names verified against the local adapter-evm stack. Click a chip to populate the
          field — classic on-chain ENS (v1), CCIP-Read off-chain gateway records, and coinType
          cross-chain addresses all resolve through the same{' '}
          <code className="bg-muted rounded px-1">AddressField</code>. The resolved-address display
          is identical regardless of mechanism; the grouping below is demo copy only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PresetChipGroup
          title="Classic (v1)"
          description="On-chain ENS registry — forward resolution on Ethereum Mainnet."
          presets={CLASSIC_PRESETS}
          activeName={activeName}
          onSelect={selectPreset}
        />

        <PresetChipGroup
          title="ENS v2 — CCIP-Read"
          description="Off-chain gateway resolution (EIP-3668). Requires Ethereum Mainnet."
          presets={V2_CCIP_PRESETS}
          activeName={activeName}
          onSelect={selectPreset}
        />

        <PresetChipGroup
          title="ENS v2 — coinType"
          description="Same name, chain-specific address. Use Mainnet or Base (inline switch below)."
          presets={V2_COINTYPE_PRESETS}
          activeName={activeName}
          onSelect={selectPreset}
        />

        {activeName ? (
          <LiveShowcaseWidget
            seedName={activeName}
            seedKey={seedKey}
            presetKind={activePresetKind}
          />
        ) : (
          <p className="text-muted-foreground text-sm">Select a preset above to start resolving.</p>
        )}
      </CardContent>
    </Card>
  );
}
