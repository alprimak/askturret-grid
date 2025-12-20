/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        grid: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#2a2a3a',
          text: '#e4e4e7',
          muted: '#71717a',
          accent: '#3b82f6',
          bid: '#22c55e',
          ask: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
