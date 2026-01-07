import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  integrations: [
    react(),
    tailwind(),
  ],
  output: 'static',
  site: 'https://grid.askturret.com',
  vite: {
    plugins: [wasm()],
    ssr: {
      noExternal: ['@askturret/grid', '@askturret/grid-wasm'],
    },
    optimizeDeps: {
      exclude: ['@askturret/grid-wasm'],
    },
  },
});
