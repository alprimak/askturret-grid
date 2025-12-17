import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'askturret-grid-core': path.resolve(__dirname, '../../grid-core/pkg/askturret_grid_core.js'),
    },
  },
  optimizeDeps: {
    exclude: ['askturret-grid-core'],
  },
  build: {
    target: 'esnext',
  },
  assetsInclude: ['**/*.wasm'],
});
