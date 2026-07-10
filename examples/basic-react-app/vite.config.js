import { createRequire } from 'node:module';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineOpenZeppelinAdapterViteConfig } from '@openzeppelin/adapters-vite';
// eventemitter3@5 is a dual package whose ESM entry (index.mjs) default-imports
// its own CJS build. Under Vite's dev optimizer the two halves get inconsistent
// CJS→ESM interop, so a wallet dep's `import EventEmitter from 'eventemitter3'`
// throws "does not provide an export named 'default'" and the app fails to init.
// Pinning every import to the ESM entry (which has an explicit `export default`)
// gives one consistent module. Resolved by absolute path because the package's
// `exports` map does not expose the `./index.mjs` subpath.
var require = createRequire(import.meta.url);
var eventemitter3EsmEntry = require.resolve('eventemitter3').replace(/index\.js$/, 'index.mjs');
var viteConfig = defineOpenZeppelinAdapterViteConfig({
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
            // Force eventemitter3 to its ESM entry so its default export is consistent
            // across the wallet dependency graph in dev mode (see note above).
            alias: {
                eventemitter3: eventemitter3EsmEntry,
            },
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
                // Force pre-bundling of eventemitter3 via its package entry so Vite
                // synthesizes a CJS→ESM default export. Without this, a wallet dep's
                // `import EventEmitter from 'eventemitter3'` fails at runtime with
                // "does not provide an export named 'default'". Requires the package to
                // be resolvable from this app root (see the workspace-root .npmrc hoist).
                'eventemitter3',
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
