import { AddressDisplay, type AddressDisplayProps } from '@openzeppelin/ui-components';
import { AddressNameResolutionProvider } from '@openzeppelin/ui-renderer';

import { useEcosystem } from '../context';
import type { DemoCapabilities } from '../core/runtimeCapabilities';

/**
 * Derives an explorer URL from the active runtime's explorer capability,
 * following the app-wide selected network. Returns `undefined` when the
 * capability is missing or rejects an input so the display simply omits the
 * link (the capability may return `null` or throw for unknown inputs).
 */
function safeExplorerUrl(
  capabilities: DemoCapabilities | null,
  address: string
): string | undefined {
  if (!capabilities) {
    return undefined;
  }
  try {
    return capabilities.getExplorerUrl(address) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Base `AddressDisplay` fed through its reverse-resolution value seam by the
 * renderer's app-wide `AddressNameResolutionProvider` bridge (SF-4). The record
 * is resolved against the app's active network — driven by the global
 * `NetworkSwitcher` — so on Ethereum Mainnet a registered address renders as a
 * name + avatar, and everywhere else it degrades to the plain address.
 *
 * When `showExplorerLink` is set, the explorer URL is derived from the active
 * network's explorer capability; an explicit `explorerUrl` still takes
 * precedence.
 */
export function ResolvedAddressDisplay({
  address,
  showExplorerLink = false,
  explorerUrl,
  ...displayProps
}: {
  address: string;
  /** Derive the explorer link from the active network's explorer capability. */
  showExplorerLink?: boolean;
} & Omit<AddressDisplayProps, 'address'>): React.ReactElement {
  const { capabilities } = useEcosystem();

  const resolvedExplorerUrl =
    explorerUrl ?? (showExplorerLink ? safeExplorerUrl(capabilities, address) : undefined);

  return (
    <AddressNameResolutionProvider address={address}>
      <AddressDisplay address={address} explorerUrl={resolvedExplorerUrl} {...displayProps} />
    </AddressNameResolutionProvider>
  );
}
