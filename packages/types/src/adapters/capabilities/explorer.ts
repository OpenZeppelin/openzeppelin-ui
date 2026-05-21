/**
 * **Tier 1** — Block explorer URL generation for addresses and transactions.
 *
 * Does not extend `RuntimeCapability`. The active network is typically fixed
 * when the capability is constructed (optional `NetworkConfig` at factory time).
 */
export interface ExplorerCapability {
  /**
   * Resolves a human-readable explorer URL for an address.
   *
   * @param address - Account or contract address.
   * @returns Absolute URL, or `null` when unsupported or unknown.
   */
  getExplorerUrl(address: string): string | null;

  /**
   * Resolves a human-readable explorer URL for a transaction identifier.
   *
   * @param txHash - Transaction hash or chain-specific transaction id.
   * @returns Absolute URL, or `null` when unsupported.
   */
  getExplorerTxUrl?(txHash: string): string | null;
}
