import { CLI_VERSION } from '../branding';
import type { CreateAppSpec, ResolvedCreateOptions } from './types';

const UI_VERSIONS = {
  cli: CLI_VERSION === '0.0.0' ? 'latest' : `^${CLI_VERSION}`,
  components: '^2.3.1',
  react: '^2.0.1',
  renderer: '^2.0.1',
  styles: '^1.1.0',
  types: '^2.0.0',
  utils: '^2.0.0',
};

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
    dependencies['@openzeppelin/adapter-evm'] = '^2.0.1';
    dependencies['@openzeppelin/ui-react'] = UI_VERSIONS.react;
    dependencies['@openzeppelin/ui-types'] = UI_VERSIONS.types;
    dependencies['@tanstack/react-query'] = '^5.84.1';
    dependencies['@wagmi/core'] = '^2.20.3';
    dependencies['react-hook-form'] = '^7.71.1';
    dependencies.viem = '^2.33.3';
    dependencies.wagmi = '^2.17.0';
  }

  if (options.wallet === 'rainbowkit') {
    dependencies['@rainbow-me/rainbowkit'] = '^2.2.8';
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
    devDependencies['@openzeppelin/adapters-vite'] = '^2.0.0';
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
