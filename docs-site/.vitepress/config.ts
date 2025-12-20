import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '@askturret/grid',
  description:
    'High-performance React data grid with Rust/WASM acceleration. 1 million rows at 60fps.',
  base: '/askturret-grid/',

  head: [
    ['link', { rel: 'icon', href: '/askturret-grid/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    [
      'meta',
      { property: 'og:title', content: '@askturret/grid - High-Performance React Data Grid' },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content: '1 million rows. 60 FPS. Zero server. Built for trading applications.',
      },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: '@askturret/grid',

    nav: [
      { text: 'Guide', link: '/getting-started/installation' },
      { text: 'Components', link: '/components/data-grid' },
      { text: 'API', link: '/api/data-grid' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/alprimak/askturret-grid' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@askturret/grid' },
          { text: 'Live Demo', link: 'https://grid.askturret.com' },
        ],
      },
    ],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
            { text: 'TypeScript', link: '/getting-started/typescript' },
          ],
        },
        {
          text: 'Components',
          items: [
            { text: 'DataGrid', link: '/components/data-grid' },
            { text: 'OrderBook', link: '/components/order-book' },
            { text: 'TimeSales', link: '/components/time-sales' },
            { text: 'PositionLadder', link: '/components/position-ladder' },
            { text: 'TopMovers', link: '/components/top-movers' },
          ],
        },
        {
          text: 'Guides',
          items: [
            { text: 'Columns', link: '/guides/columns' },
            { text: 'Sorting & Filtering', link: '/guides/sorting-filtering' },
            { text: 'Flash Highlighting', link: '/guides/flash-highlighting' },
            { text: 'Theming', link: '/guides/theming' },
            { text: 'CSV Export', link: '/guides/csv-export' },
            { text: 'Performance', link: '/guides/performance' },
          ],
        },
        {
          text: 'API Reference',
          items: [
            { text: 'DataGridProps', link: '/api/data-grid' },
            { text: 'ColumnDef', link: '/api/column-def' },
            { text: 'Utilities', link: '/api/utilities' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/alprimak/askturret-grid' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2024-present AskTurret',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/alprimak/askturret-grid/edit/main/docs-site/:path',
      text: 'Edit this page on GitHub',
    },
  },

  appearance: 'dark',

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
});
