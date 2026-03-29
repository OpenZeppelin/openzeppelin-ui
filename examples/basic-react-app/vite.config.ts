import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineOpenZeppelinAdapterViteConfig } from '@openzeppelin/adapters-vite';
import type { UserConfig } from 'vite';

const viteConfig: Promise<UserConfig> = defineOpenZeppelinAdapterViteConfig({
  ecosystems: ['evm', 'stellar'],
  config: {
    plugins: [react(), tailwindcss()],
    define: {
      // Polyfill for Node.js globals used by some wallet dependencies
      global: 'globalThis',
    },
    resolve: {
      // Prevent duplicate module instances (causes singleton issues)
      dedupe: ['react', 'react-dom', '@openzeppelin/ui-utils', '@openzeppelin/ui-types'],
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
      // Pre-bundle heavy dependencies upfront for faster page loads
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        '@web3icons/react',
        'react-hook-form',
        'zustand',
        'zustand/shallow',
        'sonner',
        'next-themes',
        '@tanstack/react-query',
        'react-syntax-highlighter',
        'react-syntax-highlighter/dist/esm/styles/prism',
        'viem/chains',
        '@rainbow-me/rainbowkit',
      ],
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'esnext',
    },
    server: {
      port: 3000,
      open: true,
    },
  },
});

export default viteConfig;
