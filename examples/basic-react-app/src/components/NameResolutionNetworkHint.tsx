import { useEcosystem } from '../context';
import { NetworkRequirementHint } from './NetworkRequirementHint';

/**
 * Network id whose ENS registry backs the demo's real-name resolution. Kept in
 * sync with the `NetworkSwitcher` catalog — only this network resolves the
 * well-known sample names (e.g. `vitalik.eth`) out of the box.
 */
export const ENS_RESOLUTION_NETWORK_ID = 'ethereum-mainnet';

/**
 * Contextual warning shown inside name-resolution surfaces whenever the active
 * network is not the ENS-backed one. Because the app defaults to Sepolia (no
 * ENS registry), a typed name will not resolve until the user switches to
 * Ethereum Mainnet — this nudges them to the header network selector rather
 * than leaving a silent "not found".
 */
export function NameResolutionNetworkHint({
  className,
}: {
  className?: string;
}): React.ReactElement | null {
  const { network } = useEcosystem();
  const networkName = network?.name ?? 'this network';

  return (
    <NetworkRequirementHint requiredNetworkId={ENS_RESOLUTION_NETWORK_ID} className={className}>
      Names won&apos;t resolve on <span className="font-medium">{networkName}</span>. Switch the
      network selector (top-right) to <span className="font-medium">Ethereum - Mainnet</span> to see
      live ENS resolution.
    </NetworkRequirementHint>
  );
}
