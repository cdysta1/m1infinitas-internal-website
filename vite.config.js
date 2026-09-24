import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// Vite config with dynamic base to support GitHub Pages subpath.
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var base = env.VITE_BASE_PATH || '/';
    return {
        base: base,
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
            target: 'es2020',
            chunkSizeWarningLimit: 800,
        },
        server: {
            host: true,
            port: 5173,
        },
    };
});
