import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      // Mock the WASM module for tests - it will fail to load and fall back to JS
      '@askturret/grid-wasm': path.resolve(__dirname, './src/wasm/__mocks__/grid-core.ts'),
    },
  },
});
