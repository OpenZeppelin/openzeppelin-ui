import { useEcosystem } from '../context';
import { useMainnetL1FallbackOptIn } from '../context/mainnetL1FallbackOptInContext';
import { networkLabel } from './networkOptions';
import { NetworkRequirementHint } from './NetworkRequirementHint';

/**
 * Network id whose ENS registry backs the demo's canonical mainnet presets
 * (`vitalik.eth`, CCIP-Read names, …). Kept in sync with `networkOptions.ts`.
 */
export const ENS_RESOLUTION_NETWORK_ID = 'ethereum-mainnet';

const SEPOLIA_NETWORK_ID = 'ethereum-sepolia';

/**
 * Contextual banner when the active network is not Ethereum Mainnet. Explains
 * mainnet-fallback opt-in on testnets (e.g. Sepolia) or nudges a switch to
 * Mainnet when fallback is off.
 */
export function NameResolutionNetworkHint({
  className,
}: {
  className?: string;
}): React.ReactElement | null {
  const { network } = useEcosystem();
  const { enabled: mainnetFallbackEnabled } = useMainnetL1FallbackOptIn();
  const activeLabel = network?.name ?? networkLabel(network?.id ?? 'this network');
  const mainnetLabel = networkLabel(ENS_RESOLUTION_NETWORK_ID);
  const sepoliaLabel = networkLabel(SEPOLIA_NETWORK_ID);

  if (network?.id === ENS_RESOLUTION_NETWORK_ID) {
    return null;
  }

  if (mainnetFallbackEnabled) {
    return (
      <NetworkRequirementHint requiredNetworkId={ENS_RESOLUTION_NETWORK_ID} className={className}>
        Mainnet fallback is <span className="font-medium">on</span> for{' '}
        <span className="font-medium">{activeLabel}</span> (
        <code className="bg-muted rounded px-1">{network?.id}</code>). The adapter queries the bound
        network first; missing records may resolve from{' '}
        <span className="font-medium">{mainnetLabel}</span>. Uncheck the toggle above to turn
        fallback off — forward and reverse results re-resolve immediately.
      </NetworkRequirementHint>
    );
  }

  return (
    <NetworkRequirementHint requiredNetworkId={ENS_RESOLUTION_NETWORK_ID} className={className}>
      On <span className="font-medium">{activeLabel}</span>, most sample names are not in the local
      registry
      {network?.id === SEPOLIA_NETWORK_ID ? (
        <>
          {' '}
          — only <span className="font-medium">brantly.eth</span> has a native{' '}
          <span className="font-medium">{sepoliaLabel}</span> record
        </>
      ) : null}
      . Enable{' '}
      <span className="font-medium">
        Allow mainnet fallback when name not found on connected network
      </span>{' '}
      above to resolve mainnet-only records while staying on this network, or switch the header
      selector to <span className="font-medium">{mainnetLabel}</span>.
    </NetworkRequirementHint>
  );
}
