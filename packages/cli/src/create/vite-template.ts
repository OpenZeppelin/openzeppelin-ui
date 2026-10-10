import type { CreateAppSpec } from './types';

/**
 * Renders the generated app Vite configuration.
 */
export function viteConfig(spec: CreateAppSpec): string {
  if (!spec.hasWallet) {
    return `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
`;
  }

  return `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineOpenZeppelinAdapterViteConfig } from '@openzeppelin/adapters-vite';
import type { UserConfig } from 'vite';

const viteConfig: Promise<UserConfig> = defineOpenZeppelinAdapterViteConfig({
  ecosystems: ['evm'],
  config: {
    plugins: [react(), tailwindcss()],
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
      dedupe: ['react', 'react-dom', '@openzeppelin/ui-utils', '@openzeppelin/ui-types'],
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@openzeppelin/ui-react',
        '@openzeppelin/adapter-evm',
        '@wagmi/core',
        'viem/chains',
        'wagmi',
      ],
    },
  },
});

export default viteConfig;
`;
}
