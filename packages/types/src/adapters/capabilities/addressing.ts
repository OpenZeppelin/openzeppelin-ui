/**
 * **Tier 1** — Address validation and formatting helpers.
 *
 * Does not extend `RuntimeCapability`: instances are stateless and may be shared
 * across networks when validation rules are chain-global.
 */
export interface AddressingCapability {
  /**
   * Validates whether `address` is acceptable for this ecosystem.
   *
   * @param address - Raw address string from user input or external data.
   * @param addressType - Optional chain-specific subtype (e.g. contract vs account).
   * @returns `true` if the address is well-formed for this chain.
   */
  isValidAddress(address: string, addressType?: string): boolean;
}
