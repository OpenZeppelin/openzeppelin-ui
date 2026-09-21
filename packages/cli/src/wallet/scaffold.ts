import {
  appConfig,
  ozConfig,
  ozProviders,
  ozRuntime,
  rainbowKitConfig,
  type WalletSupportInput,
} from '../create/support-files';
import type { CreateFile, CreateWallet } from '../create/types';
import { UI_VERSIONS } from '../versions';

export type WalletKit = Extract<CreateWallet, 'custom' | 'rainbowkit'>;

export const EVM_WALLET_DEPENDENCIES: Record<string, string> = {
  '@openzeppelin/adapter-evm': '^2.0.1',
  '@openzeppelin/ui-react': UI_VERSIONS.react,
  '@openzeppelin/ui-types': UI_VERSIONS.types,
  '@tanstack/react-query': '^5.84.1',
  '@wagmi/core': '^2.20.3',
  'react-hook-form': '^7.71.1',
  viem: '^2.33.3',
  wagmi: '^2.17.0',
};

export const RAINBOWKIT_DEPENDENCIES: Record<string, string> = {
  '@rainbow-me/rainbowkit': '^2.2.8',
};

export const EVM_WALLET_DEV_DEPENDENCIES: Record<string, string> = {
  '@openzeppelin/adapters-vite': '^2.0.0',
};

export const WALLET_BASE_DEPENDENCIES: Record<string, string> = {
  '@openzeppelin/ui-components': UI_VERSIONS.components,
  '@openzeppelin/ui-styles': UI_VERSIONS.styles,
  '@openzeppelin/ui-utils': UI_VERSIONS.utils,
};

/**
 * Runtime dependencies needed when wallet support is generated into a project.
 */
export function walletRuntimeDependenciesForKit(kit: CreateWallet): Record<string, string> {
  if (kit === 'none') return {};

  if (kit === 'rainbowkit') {
    return { ...EVM_WALLET_DEPENDENCIES, ...RAINBOWKIT_DEPENDENCIES };
  }

  return EVM_WALLET_DEPENDENCIES;
}

/**
 * Complete install set for adding wallet support to an existing project.
 */
export function walletAddDependenciesForKit(kit: WalletKit): Record<string, string> {
  return {
    ...WALLET_BASE_DEPENDENCIES,
    ...walletRuntimeDependenciesForKit(kit),
    ...EVM_WALLET_DEV_DEPENDENCIES,
  };
}

/**
 * Renders the generated app config as a project file descriptor.
 */
export function walletAppConfigFile(options: WalletSupportInput): CreateFile {
  return { path: 'public/app.config.json', content: appConfig(options) };
}

/**
 * Builds wallet support files shared by `oz-ui create` and `oz-ui add wallet`.
 */
export function buildWalletSupportFiles(
  options: WalletSupportInput,
  config: { includeAppConfig?: boolean } = {}
): CreateFile[] {
  const includeAppConfig = config.includeAppConfig ?? true;
  const files: CreateFile[] = [
    { path: 'src/oz/config.ts', content: ozConfig() },
    { path: 'src/oz/runtime.ts', content: ozRuntime(options) },
    { path: 'src/oz/OzProviders.tsx', content: ozProviders() },
  ];

  if (includeAppConfig) {
    files.unshift(walletAppConfigFile(options));
  }

  if (options.wallet === 'rainbowkit') {
    files.push({ path: 'src/oz/wallet/rainbowkit.config.ts', content: rainbowKitConfig(options) });
  }

  return files;
}
