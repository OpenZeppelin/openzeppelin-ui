import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Polyfill for Node.js globals used by some wallet dependencies
    global: 'globalThis',
  },
  resolve: {
    // Prevent duplicate module instances (causes singleton issues)
    dedupe: [
      'react',
      'react-dom',
      '@openzeppelin/ui-utils',
      '@openzeppelin/ui-types',
      'viem',
      'wagmi',
      '@wagmi/core',
      '@stellar/stellar-sdk',
      '@creit.tech/stellar-wallets-kit',
    ],
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
      'viem',
      'viem/chains',
      'wagmi',
      '@wagmi/core',
      '@rainbow-me/rainbowkit',
      '@stellar/stellar-sdk',
      '@creit.tech/stellar-wallets-kit',
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
});
