# @askturret/grid

[![npm version](https://img.shields.io/npm/v/@askturret/grid.svg)](https://www.npmjs.com/package/@askturret/grid)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@askturret/grid)](https://bundlephobia.com/package/@askturret/grid)
[![license](https://img.shields.io/npm/l/@askturret/grid.svg)](https://github.com/alprimak/askturret-grid/blob/main/LICENSE)

**1 million rows. 60 FPS. Zero config.**

A high-performance React data grid powered by Rust + WebAssembly with trigram indexing for instant filtering. Built for trading applications handling 1M+ rows with real-time updates at 60fps.

[Live Demo](https://grid.askturret.com) · [Documentation](https://grid.askturret.com/docs) · [Benchmarks](https://grid.askturret.com/benchmarks)

---

## Why?

Traditional grids face a tradeoff:

| Approach | Problem |
|----------|---------|
| **Client-side** | JavaScript chokes on large datasets |
| **Server-side** | Network latency, backend infrastructure, complexity |

We chose a third path: **Rust compiled to WebAssembly** running in your browser.

The result? Server-side grid performance without the server.

```
1,000,000 rows × 6 columns
├── Sort: 18ms (WASM accelerated)
├── Filter: <1ms (trigram index lookup)
├── Render: <16ms (60fps maintained)
└── Flash updates: 100k rows/sec
```

## Quick Start

```bash
npm install @askturret/grid
```

```tsx
import { DataGrid } from '@askturret/grid';

const columns = [
  { field: 'symbol', header: 'Symbol', sortable: true },
  { field: 'price', header: 'Price', align: 'right', flashOnChange: true },
  { field: 'volume', header: 'Volume', align: 'right' },
];

function App() {
  return (
    <DataGrid
      data={positions}        // Your data array
      columns={columns}       // Column definitions
      rowKey="symbol"         // Unique row identifier
      showFilter              // Enable search/filter
    />
  );
}
```

That's it. Virtualization, sorting, filtering, and flash highlighting work out of the box.

## Features

### Core Grid
- **Auto-virtualization** - Renders only visible rows. Kicks in automatically at 100+ rows
- **Flash highlighting** - Green/red cell flashes on value changes (trading standard)
- **Adaptive performance** - Auto-disables effects when FPS drops below 55
- **Sorting & filtering** - Client-side, instant, handles 100k rows
- **TypeScript-first** - Full type inference for columns and data

### Trading Components
- `<OrderBook />` - Level 2 depth visualization with bid/ask depth bars
- `<TopMovers />` - Top gainers/losers with periodic ranking updates
- `<TimeSales />` - Trade tape / time & sales with large trade highlighting
- `<PositionLadder />` - DOM (depth of market) ladder with click-to-trade

### Column Management
- **Resizable columns** - Drag to resize with min/max limits
- **Reorderable columns** - Drag & drop column headers
- **Controlled & uncontrolled** - Works both ways

### Data Export
- **CSV export** - One-line export with proper escaping
- **Nested field support** - Export `user.name` style fields
- **Excel compatible** - BOM for proper character encoding

### WASM Core
- Rust-powered tick processing for 1000+ updates/sec
- O(log n) sorted streaming inserts
- Order book aggregation engine
- VWAP/TWAP real-time calculations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your React App                          │
├─────────────────────────────────────────────────────────────┤
│                  @askturret/grid-react                      │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐  │
│  │DataGrid │  │OrderBook │  │ TimeSales  │  │PositionLadder│
│  └────┬────┘  └────┬─────┘  └─────┬──────┘  └─────┬──────┘  │
│       │            │              │               │          │
│       └────────────┴──────────────┴───────────────┘          │
│                            │                                 │
├────────────────────────────┼─────────────────────────────────┤
│                 @askturret/grid-core (WASM)                  │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────────┐      │
│  │ Tick Buffer  │  │  Sorter    │  │   Aggregator    │      │
│  │ & Dedup      │  │  O(log n)  │  │  (VWAP/TWAP)    │      │
│  └──────────────┘  └────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

The WASM core handles:
- **Tick buffering** - Deduplicates and batches rapid updates
- **Sorted inserts** - Maintains sort order without full re-sort
- **Aggregations** - Computes VWAP, TWAP, position totals in Rust
- **Memory management** - Zero-copy data sharing with JS when possible

## Performance

Tested on AMD Ryzen, Linux, Chrome 131:

| Operation | 10k rows | 100k rows | 1M rows |
|-----------|----------|-----------|---------|
| Initial render | 45ms | 52ms | 68ms |
| Sort (click) | 2ms | 5ms | 18ms |
| Filter (trigram) | <1ms | <1ms | <2ms |
| 10% row update | <16ms | <16ms | <16ms |

Flash highlighting with lazy detection maintains 60fps at any row count. Adaptive mode auto-adjusts when FPS drops below 55.

## Configuration

```tsx
interface DataGridProps<T> {
  // Required
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: keyof T | ((row: T) => string);

  // Optional
  showFilter?: boolean;              // Show filter input
  filterPlaceholder?: string;        // Filter input placeholder
  filterFields?: (keyof T)[];        // Fields to search (default: all)
  compact?: boolean;                 // Reduce row height
  stickyHeader?: boolean;            // Sticky header (default: true)
  virtualize?: boolean | 'auto';     // Force virtualization (default: 'auto')
  rowHeight?: number;                // Custom row height in px
  disableFlash?: boolean;            // Disable flash highlighting
  onRowClick?: (row: T) => void;     // Row click handler
  emptyMessage?: string;             // Message when no data
  className?: string;                // Container class

  // Column resizing
  resizable?: boolean;               // Enable column resizing
  minColumnWidth?: number;           // Min width in px (default: 50)
  maxColumnWidth?: number;           // Max width in px (default: 500)
  columnWidths?: Record<string, number>;  // Controlled widths
  onColumnResize?: (field: string, width: number) => void;

  // Column reordering
  reorderable?: boolean;             // Enable drag & drop reorder
  columnOrder?: string[];            // Controlled order
  onColumnReorder?: (newOrder: string[]) => void;
}

interface ColumnDef<T> {
  field: keyof T | string;           // Data field (supports nested: "user.name")
  header: string;                    // Column header text
  width?: string;                    // CSS width
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;                // Enable sorting (default: true)
  flashOnChange?: boolean;           // Flash green/red on numeric changes
  formatter?: (value: unknown, row: T) => string | ReactNode;
  cellClass?: (value: unknown, row: T) => string;
}
```

## Theming

The grid uses CSS variables for theming:

```css
:root {
  --grid-bg: #0a0a0f;
  --grid-surface: #12121a;
  --grid-border: #2a2a3a;
  --grid-text: #e4e4e7;
  --grid-muted: #71717a;
  --grid-accent: #3b82f6;
  --grid-flash-up: rgba(34, 197, 94, 0.4);
  --grid-flash-down: rgba(239, 68, 68, 0.4);
}
```

## CSV Export

```tsx
import { exportToCSV } from '@askturret/grid';

// Trigger browser download
exportToCSV(data, columns, { filename: 'portfolio.csv' });

// Get CSV string instead
const csv = exportToCSV(data, columns, { download: false });

// All options
exportToCSV(data, columns, {
  filename: 'export.csv',    // Download filename
  delimiter: ',',            // Column separator
  includeHeaders: true,      // Include header row
  download: true,            // false = return string
});
```

## vs Traditional Grids

| Feature | Server-Side Grids | @askturret/grid |
|---------|-------------------|-----------------|
| 100k row sort | ~200ms + network latency | 12ms client-side |
| Infrastructure | Backend required | None |
| Flash highlights | Basic or none | Adaptive (auto-degrades) |
| Trading components | Separate packages | Built-in |
| Multi-window sync | Manual implementation | BroadcastChannel built-in |
| Virtualization | Configuration required | Zero-config (automatic) |
| Bundle size | 150-300kb | ~45kb |
| License | Often commercial | MIT |

## Roadmap

- [x] Core DataGrid with virtualization
- [x] Flash highlighting with adaptive mode
- [x] Sorting and filtering
- [x] WASM core with trigram indexing (1M row support)
- [x] OrderBook component
- [x] TopMovers component
- [x] TimeSales component
- [x] PositionLadder component
- [x] Column resizing & reordering
- [x] CSV export
- [ ] Row grouping & aggregation
- [ ] Excel export (xlsx)

## Part of AskTurret

This grid is extracted from [AskTurret](https://askturret.com), an AI-native desktop platform for traders. If you're building trading applications, check out the full platform for chat-based trade execution, multi-window layouts, and real-time portfolio monitoring.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Clone and setup
git clone https://github.com/alprimak/askturret-grid
cd askturret-grid
npm install

# Run dev server with demo
npm run dev

# Run tests
npm test

# Build WASM core (requires Rust)
cd packages/grid-core
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/grid_core.wasm --out-dir ../grid-react/src/wasm
```

## License

MIT