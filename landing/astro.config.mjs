import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    react(),
    tailwind(),
  ],
  output: 'static',
  site: 'https://grid.askturret.com',
  vite: {
    ssr: {
      noExternal: ['@askturret/grid'],
    },
    build: {
      rollupOptions: {
        external: ['@askturret/grid-wasm'],
      },
    },
    optimizeDeps: {
      exclude: ['@askturret/grid-wasm'],
    },
  },
});
