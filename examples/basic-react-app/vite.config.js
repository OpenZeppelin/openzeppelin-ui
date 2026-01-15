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
        // Prevent duplicate React instances (causes "Invalid hook call" errors)
        dedupe: ['react', 'react-dom'],
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
