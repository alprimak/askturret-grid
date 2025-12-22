import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/demo/',
  resolve: {
    alias: {
      // Use stub in standalone mode - WASM has pure JS fallback
      'askturret-grid-core': path.resolve(__dirname, '../src/wasm/stub/askturret_grid_core.js'),
    },
  },
  optimizeDeps: {
    exclude: ['askturret-grid-core'],
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  assetsInclude: ['**/*.wasm'],
});
