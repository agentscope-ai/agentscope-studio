import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

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
        proxy: {
            '/socket.io': {
                target: `http://localhost:3000`,
                ws: true,
            },
            '/trpc': {
                target: `http://localhost:3000`,
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: '../../dist/public',
        emptyOutDir: true,
    },
});
