/**
 * @askturret/grid
 *
 * High-performance React data grid with Rust/WASM.
 * Server-side performance, zero server required.
 *
 * @packageDocumentation
 */

// Main component
export { DataGrid } from './DataGrid';
export type { DataGridProps, ColumnDef } from './DataGrid';

// Trading components
export { OrderBook } from './OrderBook';
export type { OrderBookProps, OrderBookData, OrderBookLevel } from './OrderBook';

export { TopMovers } from './TopMovers';
export type { TopMoversProps, MoverItem } from './TopMovers';

// Utilities
export {
  formatPrice,
  formatQuantity,
  formatTime,
  formatPnL,
  formatPercent,
  formatCompact,
} from './utils/formatters';

// Hooks
export { useAdaptiveFlash } from './hooks/useAdaptiveFlash';
export type { AdaptiveFlashResult } from './hooks/useAdaptiveFlash';

// WASM bridge (for direct access to sorting/filtering)
export {
  initWasm,
  isWasmAvailable,
  sortValues,
  sortMultiColumn,
  filterValues,
  filterRange,
  filterAndSort,
  runBenchmarks,
  type SortDirection,
  type FilterMode,
} from './wasm';

// GridCore - persistent WASM state for high-performance grids
export {
  GridCore,
  initGridCore,
  isGridCoreAvailable,
  benchGridState,
  benchFilterOnly,
  benchSortOnly,
  benchIndexedFilterWithBuild,
  benchIndexedFilterOnly,
  benchScanFilter,
  benchRepeatedFilter,
} from './wasm/GridCore';
