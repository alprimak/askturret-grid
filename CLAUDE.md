# @askturret/grid - Claude Code Instructions

## Project Overview

High-performance React data grid with Rust/WASM acceleration. Built for trading applications handling 1M+ rows with real-time updates at 60fps.

**Positioning:** "1 million rows. 60 FPS. Zero config."

## Quick Reference

```bash
# Development
npm run dev          # Watch mode for TypeScript
npm run demo         # Run demo app (cd demo && npm run dev)

# Testing
npm run test         # Watch mode
npm run test:run     # Single run

# Build
npm run build        # Build dist/ with TypeScript + CSS bundle

# Quality
npm run lint         # TypeScript type check
npm run format       # Prettier format
npm run format:check # Check formatting
```

## Architecture

```
askturret-grid/
├── src/
│   ├── DataGrid.tsx        # Main grid component
│   ├── OrderBook.tsx       # Level 2 market depth
│   ├── TopMovers.tsx       # Gainers/losers component
│   ├── TimeSales.tsx       # Trade tape component
│   ├── PositionLadder.tsx  # DOM-style price ladder
│   ├── index.ts            # Package exports
│   ├── hooks/
│   │   └── useAdaptiveFlash.ts  # FPS-aware flash highlighting
│   ├── utils/
│   │   ├── formatters.ts   # Price, quantity, P&L formatters
│   │   └── csv.ts          # CSV export utility
│   ├── wasm/
│   │   ├── GridCore.ts     # WASM core wrapper
│   │   ├── index.ts        # WASM initialization
│   │   ├── __mocks__/      # Test mocks
│   │   └── stub/           # Stub for standalone builds
│   └── styles/
│       ├── grid.css        # DataGrid styles
│       ├── orderbook.css   # OrderBook styles
│       ├── topmovers.css   # TopMovers styles
│       ├── timesales.css   # TimeSales styles
│       └── positionladder.css  # PositionLadder styles
├── demo/                   # Demo application
│   └── src/demos/          # Individual component demos
├── dist/                   # Build output
└── docs/                   # Marketing/documentation drafts
```

## Components

### DataGrid
Main virtualized grid with sorting, filtering, flash highlighting, column resizing and reordering.

```tsx
<DataGrid
  data={rows}
  columns={[
    { field: 'symbol', header: 'Symbol', sortable: true },
    { field: 'price', header: 'Price', flashOnChange: true },
  ]}
  rowKey="id"
  showFilter={true}
  // Column resizing
  resizable={true}
  columnWidths={{ symbol: 150, price: 100 }}  // Controlled widths
  onColumnResize={(field, width) => {...}}
  minColumnWidth={50}
  maxColumnWidth={500}
  // Column reordering
  reorderable={true}
  columnOrder={['price', 'symbol']}  // Controlled order
  onColumnReorder={(newOrder) => {...}}
/>
```

### OrderBook
Level 2 market depth with bid/ask sides, depth bars, spread indicator.

```tsx
<OrderBook
  data={{ bids: [...], asks: [...] }}
  levels={10}
  showDepthBars={true}
  onPriceClick={(price, side) => {}}
/>
```

### TopMovers
Gainers/losers display with periodic ranking updates.

```tsx
<TopMovers
  data={items}
  gainersCount={5}
  losersCount={5}
  updateInterval={5000}
  onItemClick={(item, type) => {}}
/>
```

### TimeSales
Trade tape showing executed trades chronologically.

```tsx
<TimeSales
  trades={trades}
  maxTrades={100}
  showTickDirection={true}
  flashOnNew={true}
  autoScroll={true}
  largeTradeThreshold={500}
  onTradeClick={(trade) => {}}
/>
```

### PositionLadder
DOM-style price ladder with click-to-trade.

```tsx
<PositionLadder
  levels={levels}
  tickSize={0.25}
  centerPrice={5925.0}
  visibleLevels={20}
  position={{ entryPrice: 5920, quantity: 10, side: 'long' }}
  lastPrice={5925.5}
  showDepthBars={true}
  onBidClick={(price) => {}}
  onAskClick={(price) => {}}
  onRecenter={() => {}}
/>
```

## Key Patterns

### Flash Highlighting
Cells flash green/red on value changes. Uses lazy detection (only visible rows).

```tsx
{ field: 'price', flashOnChange: true }
```

### Adaptive Performance
Auto-disables effects when FPS drops below 55. See `useAdaptiveFlash.ts`.

### WASM Core
Optional Rust/WASM acceleration for sorting and trigram-indexed filtering.
- Falls back to pure JS when WASM not available
- Stub module at `src/wasm/stub/` for standalone builds
- Full WASM in parent monorepo at `packages/grid-core`

### CSS Variables
All styling via CSS variables for theming:

```css
--grid-bg, --grid-surface, --grid-border
--grid-text, --grid-muted, --grid-accent
--grid-flash-up, --grid-flash-down
--grid-bid, --grid-ask
```

### CSV Export
Export grid data to CSV with proper escaping.

```tsx
import { exportToCSV } from '@askturret/grid';

// Trigger browser download
exportToCSV(data, columns, { filename: 'users.csv' });

// Get CSV string (no download)
const csv = exportToCSV(data, columns, { download: false });

// Options
exportToCSV(data, columns, {
  filename: 'export.csv',    // Default filename
  delimiter: ',',            // Column delimiter
  includeHeaders: true,      // Include header row
  download: true,            // Trigger download or return string
});
```

Features:
- Proper CSV escaping (quotes, commas, newlines)
- Nested field access (e.g., `user.name`)
- BOM for Excel compatibility
- Works with same column definitions as DataGrid

## Testing

```bash
npm run test:run              # All tests
npm run test -- DataGrid      # Specific file
npm run test -- --run bench   # Benchmarks only
```

Test files colocated: `Component.tsx` → `Component.test.tsx`

## CSS Build

The build script concatenates CSS files:

```bash
cat src/styles/grid.css src/styles/orderbook.css src/styles/topmovers.css src/styles/timesales.css src/styles/positionladder.css > dist/styles.css
```

**When adding new CSS files:** Update both the cat command in `package.json` AND the exports section.

## Relation to AskTurret

This grid is extracted from [AskTurret](https://github.com/alprimak/askturret), an AI-native trading desktop.

The main askturret repo uses this package via file: dependency:
```json
"@askturret/grid": "file:../../../askturret-grid"
```

## Roadmap

### Completed
- [x] Core DataGrid with virtualization
- [x] Flash highlighting with adaptive mode
- [x] Sorting and filtering
- [x] WASM core with trigram indexing
- [x] OrderBook component
- [x] TopMovers component
- [x] TimeSales component
- [x] PositionLadder component
- [x] CI pipeline (GitHub Actions)
- [x] Column resizing & reordering
- [x] CSV export

### Planned (Open Source)
- [ ] npm publish
- [ ] Landing page at grid.askturret.com
- [ ] "vs traditional grids" benchmark page

### Planned (Enterprise Tier)
- [ ] Row grouping & aggregation
- [ ] Pivot tables
- [ ] Excel export
- [ ] Tree data / hierarchical rows
- [ ] Server-side pagination & filtering

## User Preferences

- Minimal co-author format: `Co-Authored-By: Claude <noreply@anthropic.com>`
- User pushes commits manually
- Arch Linux environment
- MIT license for open source, considering commercial tier for enterprise features

## CI/CD

GitHub Actions workflow runs on push/PR:
1. Format check (prettier)
2. Type check (tsc)
3. Tests (vitest)
4. Build package
5. Build demo (artifact uploaded)