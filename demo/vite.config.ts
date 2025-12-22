import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/demo/',
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      // askturret-grid-wasm is optional WASM acceleration - the grid falls back to JS
      external: ['askturret-grid-wasm'],
    },
  },
});
