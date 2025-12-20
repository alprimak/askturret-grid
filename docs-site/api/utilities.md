# Utilities

API reference for utility functions and hooks.

## exportToCSV

Export data to CSV format.

### Signature

```tsx
function exportToCSV<T>(
  data: T[],
  columns: ColumnDef<T>[],
  options?: CSVExportOptions
): string | void
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `T[]` | Array of data objects to export |
| `columns` | `ColumnDef<T>[]` | Column definitions (determines fields and headers) |
| `options` | `CSVExportOptions` | Export options |

### Options

```tsx
interface CSVExportOptions {
  filename?: string;       // Default: 'export.csv'
  delimiter?: string;      // Default: ','
  includeHeaders?: boolean; // Default: true
  download?: boolean;      // Default: true
}
```

### Returns

- When `download: true` (default): Returns `void`, triggers browser download
- When `download: false`: Returns CSV string

### Examples

```tsx
import { exportToCSV } from '@askturret/grid';

// Download CSV
exportToCSV(data, columns, { filename: 'users.csv' });

// Get CSV string
const csv = exportToCSV(data, columns, { download: false });

// Custom delimiter
exportToCSV(data, columns, { delimiter: ';' });

// Without headers
exportToCSV(data, columns, { includeHeaders: false });
```

---

## formatPrice

Format a number as a price string.

### Signature

```tsx
function formatPrice(value: number, decimals?: number): string
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | `number` | required | The price value |
| `decimals` | `number` | `2` | Decimal places |

### Examples

```tsx
import { formatPrice } from '@askturret/grid';

formatPrice(1234.5);      // '1,234.50'
formatPrice(1234.5678, 4); // '1,234.5678'
formatPrice(-50.5);       // '-50.50'
```

---

## formatQuantity

Format a number as a quantity string with thousands separators.

### Signature

```tsx
function formatQuantity(value: number, decimals?: number): string
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | `number` | required | The quantity value |
| `decimals` | `number` | `0` | Decimal places |

### Examples

```tsx
import { formatQuantity } from '@askturret/grid';

formatQuantity(1000);     // '1,000'
formatQuantity(1234567);  // '1,234,567'
formatQuantity(100.5, 2); // '100.50'
```

---

## formatPnL

Format a number as P&L with sign prefix.

### Signature

```tsx
function formatPnL(value: number, decimals?: number): string
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | `number` | required | The P&L value |
| `decimals` | `number` | `2` | Decimal places |

### Examples

```tsx
import { formatPnL } from '@askturret/grid';

formatPnL(100.5);   // '+100.50'
formatPnL(-50.25);  // '-50.25'
formatPnL(0);       // '0.00'
```

---

## useAdaptiveFlash

Hook for FPS-aware flash highlighting control.

### Signature

```tsx
function useAdaptiveFlash(): {
  enabled: boolean;
  fps: number;
}
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether flash effects should be shown |
| `fps` | `number` | Current frames per second |

### Behavior

- Disables flash when FPS drops below 55
- Re-enables flash when FPS recovers above 58
- Updates every second

### Example

```tsx
import { useAdaptiveFlash } from '@askturret/grid';

function PerformanceMonitor() {
  const { enabled, fps } = useAdaptiveFlash();

  return (
    <div>
      FPS: {fps} | Flash: {enabled ? 'ON' : 'OFF'}
    </div>
  );
}
```

---

## initWasm

Initialize the WASM core module.

### Signature

```tsx
function initWasm(): Promise<void>
```

### Description

Initializes the optional WASM core for accelerated sorting and filtering. Call this at app startup for immediate availability.

### Example

```tsx
import { initWasm } from '@askturret/grid';

// In app initialization
async function init() {
  await initWasm();
  // WASM is now ready
}
```

### Notes

- Returns immediately if WASM is already initialized
- Returns immediately if WASM core is not installed
- Grid automatically calls this on first use if not pre-initialized

---

## Exported Types

All types are exported from the main package:

```tsx
import type {
  // DataGrid
  DataGridProps,
  ColumnDef,
  SortState,

  // OrderBook
  OrderBookProps,
  OrderBookData,
  OrderBookLevel,

  // TimeSales
  TimeSalesProps,
  Trade,

  // PositionLadder
  PositionLadderProps,
  LadderLevel,
  Position,

  // TopMovers
  TopMoversProps,
  MoverItem,

  // Utilities
  CSVExportOptions,
} from '@askturret/grid';
```

### SortState

```tsx
interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}
```

### OrderBookData

```tsx
interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

interface OrderBookLevel {
  price: number;
  size: number;
  orders?: number;
}
```

### Trade

```tsx
interface Trade {
  id: string;
  price: number;
  size: number;
  time: number;
  side: 'buy' | 'sell';
}
```

### LadderLevel

```tsx
interface LadderLevel {
  price: number;
  bidSize: number;
  askSize: number;
}
```

### Position

```tsx
interface Position {
  entryPrice: number;
  quantity: number;
  side: 'long' | 'short';
}
```

### MoverItem

```tsx
interface MoverItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}
```
