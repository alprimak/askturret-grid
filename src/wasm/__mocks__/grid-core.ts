/**
 * Mock for askturret-grid-core WASM module
 * Used in tests to avoid WASM loading issues
 */

// This mock throws on import, causing the WASM bridge to fall back to JS
export default function init() {
  throw new Error('WASM not available in test environment');
}
