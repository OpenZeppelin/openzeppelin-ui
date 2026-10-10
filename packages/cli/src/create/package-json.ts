import { UI_VERSIONS } from '../versions';
import { EVM_WALLET_DEV_DEPENDENCIES, walletRuntimeDependenciesForKit } from '../wallet/scaffold';
import type { CreateAppSpec, ResolvedCreateOptions } from './types';

/**
 * Renders the generated app package manifest.
 */
export function packageJson(options: ResolvedCreateOptions, spec: CreateAppSpec): string {
  const dependencies: Record<string, string> = {
    '@openzeppelin/ui-components': UI_VERSIONS.components,
    '@openzeppelin/ui-styles': UI_VERSIONS.styles,
    '@openzeppelin/ui-utils': UI_VERSIONS.utils,
    react: '^19.2.1',
    'react-dom': '^19.2.1',
  };

  if (spec.hasWallet) {
    Object.assign(dependencies, walletRuntimeDependenciesForKit(options.wallet));
  }

  if (spec.hasRouter) {
    dependencies['react-router-dom'] = '^7.14.0';
  }

  if (spec.hasTheme) {
    dependencies['next-themes'] = '^0.4.6';
  }

  const devDependencies: Record<string, string> = {
    '@tailwindcss/vite': '^4.2.2',
    '@types/react': '^19.2.14',
    '@types/react-dom': '^19.2.3',
    '@vitejs/plugin-react': '^4.7.0',
    tailwindcss: '^4.2.2',
    typescript: '^5.8.3',
    vite: '^7.1.5',
  };

  if (spec.hasWallet) {
    Object.assign(devDependencies, EVM_WALLET_DEV_DEPENDENCIES);
  }

  return `${JSON.stringify(
    {
      name: options.projectName,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc --noEmit && vite build',
        preview: 'vite preview',
        typecheck: 'tsc --noEmit',
        'oz-ui': 'oz-ui',
      },
      dependencies,
      devDependencies: {
        '@openzeppelin/ui-cli': UI_VERSIONS.cli,
        ...devDependencies,
      },
    },
    null,
    2
  )}\n`;
}
