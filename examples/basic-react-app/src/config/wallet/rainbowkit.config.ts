/**
 * RainbowKit Configuration for the Example App
 *
 * This configuration is dynamically loaded when the user selects 'rainbowkit' as the wallet kit.
 * It provides settings for:
 *  - wagmiParams: Parameters for RainbowKit's getDefaultConfig() (appName, projectId, etc.)
 *  - providerProps: Props for the RainbowKitProvider component (theme, appInfo, etc.)
 *  - customizations: UI customizations for the ConnectButton
 */

import { type RainbowKitProvider } from '@rainbow-me/rainbowkit';

import type { RainbowKitCustomizations } from '@openzeppelin/ui-builder-adapter-evm';

// Infer props type from RainbowKitProvider for stronger typing
type InferredRainbowKitProviderProps = React.ComponentProps<typeof RainbowKitProvider>;

const rainbowKitAppConfig = {
  wagmiParams: {
    appName: 'OpenZeppelin UI Example',
    // WalletConnect Project ID - Get yours at https://cloud.walletconnect.com/
    projectId: '9f7100fc84f2327968f7bb11d38a4c2b',
    // SSR mode - set to true if using server-side rendering
    ssr: false,
  },
  providerProps: {
    // Theme configuration - import and use darkTheme() or lightTheme() from rainbowkit if needed
    // theme: darkTheme(),
    showRecentTransactions: true,
    appInfo: {
      appName: 'OpenZeppelin UI Example',
      learnMoreUrl: 'https://openzeppelin.com',
    },
  } as Partial<InferredRainbowKitProviderProps>,

  /**
   * Custom UI enhancements using RainbowKit's native prop types
   * See: https://www.rainbowkit.com/docs/connect-button
   */
  customizations: {
    connectButton: {
      chainStatus: 'icon', // Show network switcher with icon ('full' | 'icon' | 'name' | 'none')
      accountStatus: 'full', // Show full account info ('full' | 'avatar' | 'address')
      showBalance: false, // Hide balance for cleaner UI
    },
  } as RainbowKitCustomizations,
};

export default rainbowKitAppConfig;
