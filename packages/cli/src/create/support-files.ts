import type { ResolvedCreateOptions } from './types';

/**
 * Renders the generated runtime config JSON.
 */
export function appConfig(options: ResolvedCreateOptions): string {
  return `${JSON.stringify(
    {
      $comment: 'Base runtime config. Override with VITE_APP_CFG_* values in .env.local.',
      featureFlags: {},
      rpcEndpoints: {},
      indexerEndpoints: {},
      globalServiceConfigs: {
        walletconnect: {
          projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
        },
        walletui: {
          evm: {
            kitName: options.wallet,
            kitConfig: {},
          },
          default: {
            kitName: options.wallet,
            kitConfig: {},
          },
        },
      },
    },
    null,
    2
  )}\n`;
}

/**
 * Renders the generated runtime status component.
 */
export function runtimeStatus(): string {
  return `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@openzeppelin/ui-components';
import { useWalletState } from '@openzeppelin/ui-react';

export function RuntimeStatus() {
  const { activeNetworkConfig, activeRuntime, isRuntimeLoading } = useWalletState();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Runtime status</CardTitle>
        <CardDescription>Confirms your adapter, network, and wallet provider are wired.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="font-medium">Network</div>
          <div className="text-muted-foreground">{activeNetworkConfig?.name ?? 'Not selected'}</div>
        </div>
        <div>
          <div className="font-medium">Ecosystem</div>
          <div className="text-muted-foreground">{activeNetworkConfig?.ecosystem ?? 'Unknown'}</div>
        </div>
        <div>
          <div className="font-medium">Runtime</div>
          <div className="text-muted-foreground">
            {isRuntimeLoading ? 'Loading...' : activeRuntime ? 'Ready' : 'Not loaded'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
`;
}

/**
 * Renders the generated app config initializer.
 */
export function ozConfig(): string {
  return `import { appConfigService } from '@openzeppelin/ui-utils';

export async function initializeAppConfig(): Promise<void> {
  await appConfigService.initialize([
    { type: 'json', path: '/app.config.json' },
    { type: 'viteEnv', env: import.meta.env },
  ]);
}
`;
}

/**
 * Renders the generated EVM runtime adapter wiring.
 */
export function ozRuntime(options: ResolvedCreateOptions): string {
  return `import { ecosystemDefinition } from '@openzeppelin/adapter-evm';
import { evmNetworks } from '@openzeppelin/adapter-evm/networks';
import type { EcosystemRuntime, NetworkConfig } from '@openzeppelin/ui-types';

export const DEFAULT_NETWORK_ID = 'ethereum-sepolia';
export const supportedNetworks = evmNetworks;

export function getDefaultNetworkId(): string {
  return DEFAULT_NETWORK_ID;
}

export function getNetworkById(id: string): NetworkConfig | undefined {
  return supportedNetworks.find((network) => network.id === id);
}

export async function resolveRuntime(networkConfig: NetworkConfig): Promise<EcosystemRuntime> {
  return ecosystemDefinition.createRuntime('composer', networkConfig, {
    uiKit: '${options.wallet}',
  });
}
`;
}

/**
 * Renders the generated OpenZeppelin React provider wrapper.
 */
export function ozProviders(): string {
  return `import { useCallback, type ReactNode } from 'react';
import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';
import type { NativeConfigLoader } from '@openzeppelin/ui-types';

import { getDefaultNetworkId, getNetworkById, resolveRuntime } from './runtime';

const walletConfigImporters = import.meta.glob('./wallet/*.config.ts');

const loadConfigModule: NativeConfigLoader = async (relativePath) => {
  const normalizedPath = relativePath.startsWith('./config/wallet/')
    ? relativePath.replace('./config/wallet/', './wallet/')
    : relativePath;
  const importer =
    walletConfigImporters[normalizedPath] ??
    walletConfigImporters[\`\${normalizedPath}.ts\`] ??
    walletConfigImporters[\`\${normalizedPath}.tsx\`];
  if (!importer) return null;
  const module = (await importer()) as { default?: Record<string, unknown> } & Record<
    string,
    unknown
  >;
  return module.default ?? module;
};

export function OzProviders({ children }: { children: ReactNode }) {
  const getNetworkConfigById = useCallback((networkId: string) => getNetworkById(networkId), []);

  return (
    <RuntimeProvider resolveRuntime={resolveRuntime}>
      <WalletStateProvider
        initialNetworkId={getDefaultNetworkId()}
        getNetworkConfigById={getNetworkConfigById}
        loadConfigModule={loadConfigModule}
      >
        {children}
      </WalletStateProvider>
    </RuntimeProvider>
  );
}
`;
}

/**
 * Renders the generated RainbowKit native config module.
 */
export function rainbowKitConfig(options: ResolvedCreateOptions): string {
  return `const rainbowKitConfig = {
  wagmiParams: {
    appName: '${options.projectName}',
    projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
    ssr: false,
  },
  providerProps: {
    showRecentTransactions: true,
    appInfo: {
      appName: '${options.projectName}',
      learnMoreUrl: 'https://openzeppelin.com',
    },
  },
  customizations: {
    connectButton: {
      chainStatus: 'icon',
      accountStatus: 'full',
      showBalance: false,
    },
  },
};

export default rainbowKitConfig;
`;
}

/**
 * Renders the generated app entry stylesheet.
 */
export function indexCss(): string {
  return `@layer base, components, utilities;

@import 'tailwindcss' source(none);

@source './';
@source '../node_modules/@openzeppelin';
@import '@openzeppelin/ui-styles/global.css';
`;
}
