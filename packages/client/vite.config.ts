import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), svgr(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@shared': path.resolve(__dirname, '../shared/src'),
        },
    },
    server: {
        host: '127.0.0.1', // FIXME: remove
        proxy: {
            '/socket.io': {
                target: 'http://127.0.0.1:3000',  // FIXME: remove
                ws: true,
            },
            '/trpc': {
                target: 'http://127.0.0.1:3000',  // FIXME: remove
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: '../../dist/public',
        emptyOutDir: true,
    },
});
