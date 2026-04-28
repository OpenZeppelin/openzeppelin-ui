import { packageJson } from '../package-json';
import { resolveCreateAppSpec } from '../recipes';
import {
  appConfig,
  indexCss,
  ozConfig,
  ozProviders,
  ozRuntime,
  rainbowKitConfig,
  runtimeStatus,
} from '../support-files';
import type { CreateFile, ResolvedCreateOptions } from '../types';
import { viteConfig } from '../vite-template';
import { appTsx } from './app';
import { OZ_LOGO_BLACK_BG_SVG } from './assets';
import { mainTsx } from './main';

function tsconfigJson(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        useDefineForClassFields: true,
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: 'ESNext',
        moduleResolution: 'Bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        types: ['vite/client'],
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['src'],
      references: [],
    },
    null,
    2
  )}\n`;
}

/**
 * Builds the full set of files emitted by `oz-ui create`. The recipe layer
 * (`resolveCreateAppSpec`) decides app shape; this function decides which files
 * are needed and delegates content rendering to the per-domain modules
 * (layouts, support files, package manifest, vite config).
 */
export function buildCreateFiles(options: ResolvedCreateOptions): CreateFile[] {
  const spec = resolveCreateAppSpec(options);
  const files: CreateFile[] = [
    { path: 'package.json', content: packageJson(options, spec) },
    {
      path: 'index.html',
      content: `<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n`,
    },
    { path: 'tsconfig.json', content: tsconfigJson() },
    { path: 'vite.config.ts', content: viteConfig(spec) },
    { path: 'src/main.tsx', content: mainTsx(spec) },
    { path: 'src/App.tsx', content: appTsx(spec) },
    { path: 'src/index.css', content: indexCss() },
    { path: 'src/vite-env.d.ts', content: '/// <reference types="vite/client" />\n' },
  ];

  if (spec.hasWallet) {
    files.push(
      { path: 'public/app.config.json', content: appConfig(options) },
      { path: 'src/oz/config.ts', content: ozConfig() },
      { path: 'src/oz/runtime.ts', content: ozRuntime(options) },
      { path: 'src/oz/OzProviders.tsx', content: ozProviders() }
    );
  }

  if (spec.requiresLogoAsset) {
    files.push({ path: 'public/OZ-Logo-BlackBG.svg', content: OZ_LOGO_BLACK_BG_SVG });
  }

  if (spec.hasStatusPanel) {
    files.push({ path: 'src/components/RuntimeStatus.tsx', content: runtimeStatus() });
  }

  if (options.wallet === 'rainbowkit') {
    files.push({ path: 'src/oz/wallet/rainbowkit.config.ts', content: rainbowKitConfig(options) });
  }

  return files;
}
