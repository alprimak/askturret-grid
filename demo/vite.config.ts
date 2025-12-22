import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/demo/',
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      // askturret-grid-core is optional WASM - the grid falls back to JS
      external: ['askturret-grid-core'],
    },
  },
});
