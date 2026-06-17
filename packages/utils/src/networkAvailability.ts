import type { NetworkAvailability, NetworkConfig } from '@openzeppelin/ui-types';
import { MAINNET_NETWORKS_DISABLED_FLAG } from '@openzeppelin/ui-types';

import { appConfigService } from './AppConfigService';

const DEFAULT_MAINNET_DISABLED_LABEL = 'Self-host required';

const DEFAULT_MAINNET_DISABLED_DESCRIPTION =
  'Mainnet is not available on this hosted instance. Deploy the app yourself to use mainnet networks.';

const DEFAULT_EXPLICIT_DISABLED_LABEL = 'Unavailable';

const DEFAULT_EXPLICIT_DISABLED_DESCRIPTION =
  'This network is disabled in the current deployment configuration.';

function getConfiguredDisabledNetworkIds(): ReadonlySet<string> {
  const ids = appConfigService.getDisabledNetworkIds();
  return new Set(ids.map((id) => id.toLowerCase()));
}

/**
 * Returns whether any network availability policy is active in the current config.
 */
export function isNetworkAvailabilityPolicyActive(): boolean {
  return (
    appConfigService.isFeatureEnabled(MAINNET_NETWORKS_DISABLED_FLAG) ||
    appConfigService.getDisabledNetworkIds().length > 0
  );
}

/**
 * Resolves selectable/visible state for a network based on AppConfigService policy.
 */
export function getNetworkAvailability(network: NetworkConfig): NetworkAvailability {
  const disabledIds = getConfiguredDisabledNetworkIds();

  if (disabledIds.has(network.id.toLowerCase())) {
    return {
      selectable: false,
      visible: true,
      disabledLabel: DEFAULT_EXPLICIT_DISABLED_LABEL,
      disabledDescription: DEFAULT_EXPLICIT_DISABLED_DESCRIPTION,
    };
  }

  if (
    appConfigService.isFeatureEnabled(MAINNET_NETWORKS_DISABLED_FLAG) &&
    network.type === 'mainnet'
  ) {
    return {
      selectable: false,
      visible: true,
      disabledLabel: DEFAULT_MAINNET_DISABLED_LABEL,
      disabledDescription: DEFAULT_MAINNET_DISABLED_DESCRIPTION,
    };
  }

  return {
    selectable: true,
    visible: true,
  };
}

/** Returns true when the network can be selected and used. */
export function isNetworkSelectable(network: NetworkConfig): boolean {
  return getNetworkAvailability(network).selectable;
}

/** Filters to networks the user is allowed to select. */
export function getSelectableNetworks(networks: NetworkConfig[]): NetworkConfig[] {
  return networks.filter(isNetworkSelectable);
}

/** First selectable network in list order, or null if none. */
export function getDefaultSelectableNetwork(networks: NetworkConfig[]): NetworkConfig | null {
  return getSelectableNetworks(networks)[0] ?? null;
}

/** Resolves a saved or deep-linked network ID to a selectable network, or null. */
export function resolveSelectableNetwork(
  networkId: string | null | undefined,
  networks: NetworkConfig[]
): NetworkConfig | null {
  if (!networkId) {
    return null;
  }

  const match = networks.find((network) => network.id === networkId);
  if (!match || !isNetworkSelectable(match)) {
    return null;
  }

  return match;
}

export interface HostedNetworkAvailabilityNoticeCopy {
  title: string;
  descriptionBeforeLink: string;
  descriptionLinkLabel: string;
}

function isMainnetNetworksDisabled(): boolean {
  return appConfigService.isFeatureEnabled(MAINNET_NETWORKS_DISABLED_FLAG);
}

/** Shared title/description copy for NetworkAvailabilityNotice and rejection toasts. */
export function getHostedNetworkAvailabilityNoticeCopy(
  appName: string
): HostedNetworkAvailabilityNoticeCopy {
  if (isMainnetNetworksDisabled()) {
    return {
      title: `Mainnet networks are disabled on this hosted ${appName}`,
      descriptionBeforeLink: `Testnet and devnet networks remain available here. To use mainnet, deploy ${appName} yourself from `,
      descriptionLinkLabel: 'the source repository',
    };
  }

  return {
    title: `Some networks are disabled on this hosted ${appName}`,
    descriptionBeforeLink: `Certain networks are not available in this deployment. To use them, deploy ${appName} yourself from `,
    descriptionLinkLabel: 'the source repository',
  };
}

/** Message suitable for deep-link and saved-config rejection toasts. */
export function getDisabledNetworkRejectionToast(appName: string): {
  title: string;
  description: string;
} {
  const copy = getHostedNetworkAvailabilityNoticeCopy(appName);
  return {
    title: copy.title,
    description: `${copy.descriptionBeforeLink}${copy.descriptionLinkLabel}.`,
  };
}
