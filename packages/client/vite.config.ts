import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const envDir = path.resolve(__dirname, '../..');
    const env = loadEnv(mode, envDir, '');
    const serverTarget =
        env.VITE_SERVER_URL || `http://localhost:${env.PORT || '3000'}`;

    return {
        envDir,
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
                    target: serverTarget,
                    ws: true,
                },
                '/trpc': {
                    target: serverTarget,
                    changeOrigin: true,
                },
            },
        },
        build: {
            outDir: '../../dist/public',
            emptyOutDir: true,
        },
    };
});
