import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'),
);

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), svgr(), tailwindcss()],
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
    },
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
            '/api': {
                target: `http://localhost:3000`,
                changeOrigin: true,
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
