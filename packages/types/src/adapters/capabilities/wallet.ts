import type { Connector, WalletConnectionStatus } from '../common';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 3** — Wallet discovery, connect/disconnect, and connection status streaming.
 *
 * Extends `RuntimeCapability`.
 */
export interface WalletCapability extends RuntimeCapability {
  /**
   * Whether this adapter can drive a wallet connection flow for the active network.
   */
  supportsWalletConnection(): boolean;

  /**
   * Connectors the user may choose from (may be empty when unsupported).
   */
  getAvailableConnectors(): Promise<Connector[]>;

  /**
   * Start connection for a specific connector id from {@link WalletCapability.getAvailableConnectors}.
   */
  connectWallet(
    connectorId: string
  ): Promise<{ connected: boolean; address?: string; error?: string }>;

  /**
   * Disconnect the active session.
   */
  disconnectWallet(): Promise<{ disconnected: boolean; error?: string }>;

  /**
   * Snapshot of the current wallet session.
   */
  getWalletConnectionStatus(): WalletConnectionStatus;

  /**
   * Subscribe to wallet status transitions; return an unsubscribe function.
   */
  onWalletConnectionChange?(
    callback: (status: WalletConnectionStatus, previousStatus: WalletConnectionStatus) => void
  ): () => void;
}
