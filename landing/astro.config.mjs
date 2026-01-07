import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import starlight from '@astrojs/starlight';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  integrations: [
    starlight({
      title: '@askturret/grid',
      description: 'High-performance React data grid. 1 million rows at 60fps.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/alprimak/askturret-grid' },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Components',
          autogenerate: { directory: 'components' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'api' },
        },
      ],
      customCss: ['./src/styles/docs.css'],
      head: [
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#22c55e' },
        },
      ],
    }),
    react(),
    tailwind({ applyBaseStyles: false }),
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
