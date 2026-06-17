/**
 * Network availability types for deployment-specific selection policy.
 */

export interface NetworkAvailability {
  /** Whether the user can select and interact with this network */
  selectable: boolean;
  /** Whether the network appears in selection UIs */
  visible: boolean;
  /** Short label shown on disabled network rows (e.g. "Self-host required") */
  disabledLabel?: string;
  /** Longer explanation shown on hover or beneath disabled items */
  disabledDescription?: string;
}

/** Feature flag name: when enabled, all mainnet networks are non-selectable. */
export const MAINNET_NETWORKS_DISABLED_FLAG = 'mainnet_networks_disabled';
