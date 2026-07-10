/**
 * Curated cross-ecosystem network catalog shared by the global `NetworkSwitcher`
 * and any alternate surface that presents the same choices (e.g. the home page's
 * inline picker). Kept in a dedicated module so component files export only
 * components (react-refresh friendly).
 */

export interface NetworkOption {
  /** Network id understood by `getNetworkById` / the ecosystem store. */
  id: string;
  /** Human label shown in the trigger and menu. */
  label: string;
  /** `@web3icons/react` network name used for the leading icon. */
  icon: string;
}

/**
 * The networks the demo exposes globally. Ethereum Mainnet is included so ENS
 * name resolution works out of the box on demand, while Sepolia stays the
 * default (see the ecosystem store) and Stellar Testnet covers the non-EVM path.
 */
export const NETWORK_OPTIONS: NetworkOption[] = [
  { id: 'ethereum-mainnet', label: 'Ethereum - Mainnet', icon: 'ethereum' },
  { id: 'base-mainnet', label: 'Base - Mainnet', icon: 'base' },
  { id: 'ethereum-sepolia', label: 'Ethereum - Sepolia', icon: 'ethereum' },
  { id: 'stellar-testnet', label: 'Stellar - Testnet', icon: 'stellar' },
];
