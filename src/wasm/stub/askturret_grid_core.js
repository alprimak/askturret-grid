/**
 * Stub for askturret-grid-core WASM module
 * The grid falls back to pure JS when WASM is not available
 * This stub prevents build errors in standalone mode
 */

export default function init() {
  // WASM not available in standalone build
  return Promise.reject(new Error('WASM not available in standalone build'));
}

export function init_panic_hook() {}