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
            // Ensure @openzeppelin/ui-utils singleton is shared with adapter packages
            // This is critical for appConfigService to work correctly
            '@openzeppelin/ui-utils',
            '@openzeppelin/ui-types',
            // EVM adapter dependencies
            'viem',
            'wagmi',
            '@wagmi/core',
        ],
    },
    optimizeDeps: {
        // Force pre-bundling of adapter dependencies
        include: ['wagmi', '@wagmi/core', 'viem', '@tanstack/react-query'],
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
    server: {
        port: 3000,
        open: true,
    },
});
