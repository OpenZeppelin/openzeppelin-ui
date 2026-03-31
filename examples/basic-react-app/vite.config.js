import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createOpenZeppelinAdapterIntegration } from '@openzeppelin/adapters-vite';
var adapters = createOpenZeppelinAdapterIntegration({
    ecosystems: ['evm', 'stellar'],
});
var viteConfig = adapters.vite({
    plugins: [react(), tailwindcss()],
    define: {
        // Wallet SDKs still expect a browser-global `global`.
        global: 'globalThis',
        'process.env': {},
    },
    resolve: {
        // Keep singleton instances aligned with adapter packages.
        dedupe: [
            'react',
            'react-dom',
            '@openzeppelin/ui-components',
            '@openzeppelin/ui-react',
            '@openzeppelin/ui-renderer',
            '@openzeppelin/ui-storage',
            '@openzeppelin/ui-types',
            '@openzeppelin/ui-utils',
            'viem',
            'wagmi',
            '@wagmi/core',
            '@tanstack/react-query',
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
        // Mirror the working ui-builder wallet/runtime pre-bundling setup so
        // connector stacks are converted to browser-safe ESM before first use.
        include: [
            'react',
            'react-dom',
            'react-dom/client',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            '@openzeppelin/ui-components',
            '@openzeppelin/ui-react',
            '@openzeppelin/ui-renderer',
            '@openzeppelin/ui-storage',
            '@openzeppelin/ui-types',
            '@openzeppelin/ui-utils',
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
            'viem/accounts',
            'wagmi',
            '@wagmi/core',
            '@wagmi/connectors',
            '@rainbow-me/rainbowkit',
            '@stellar/stellar-sdk',
            '@creit.tech/stellar-wallets-kit',
            'lossless-json',
            '@metamask/sdk',
            'debug',
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
export default viteConfig;
