# TypeScript

The grid is built with TypeScript and provides full type inference for your data.

## Generic Components

All components are generic and infer types from your data:

```tsx
import { DataGrid, type ColumnDef } from '@askturret/grid';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// Type-safe column definitions
const columns: ColumnDef<User>[] = [
  { field: 'name', header: 'Name' },     // ✓ valid
  { field: 'email', header: 'Email' },   // ✓ valid
  { field: 'role', header: 'Role' },     // ✓ valid
  // { field: 'invalid', header: 'X' }, // ✗ TypeScript error
];

// Type-safe component
<DataGrid<User>
  data={users}
  columns={columns}
  rowKey="id"
/>
```

## Column Field Types

The `field` property accepts:

```tsx
// Direct field access
{ field: 'name', header: 'Name' }

// Nested field access (dot notation)
{ field: 'address.city', header: 'City' }

// For nested fields, use string type
const columns: ColumnDef<User>[] = [
  { field: 'name', header: 'Name' },
  { field: 'address.city' as keyof User | string, header: 'City' },
];
```

## Formatter Types

The `formatter` function receives typed parameters:

```tsx
const columns: ColumnDef<User>[] = [
  {
    field: 'role',
    header: 'Role',
    formatter: (value, row) => {
      // value: 'admin' | 'user' (inferred from User['role'])
      // row: User
      return value === 'admin' ? '👑 Admin' : '👤 User';
    },
  },
];
```

## Cell Class Types

The `cellClass` function is also typed:

```tsx
const columns: ColumnDef<User>[] = [
  {
    field: 'role',
    header: 'Role',
    cellClass: (value, row) => {
      // value: 'admin' | 'user'
      // row: User
      return value === 'admin' ? 'admin-cell' : '';
    },
  },
];
```

## Row Key Types

The `rowKey` prop ensures type safety:

```tsx
<DataGrid<User>
  data={users}
  columns={columns}
  rowKey="id"        // ✓ keyof User
  // rowKey="invalid" // ✗ TypeScript error
/>

// Or use a function for complex keys
<DataGrid<User>
  data={users}
  columns={columns}
  rowKey={(user) => `${user.id}-${user.role}`}
/>
```

## Event Handler Types

Click handlers receive properly typed rows:

```tsx
<DataGrid<User>
  data={users}
  columns={columns}
  rowKey="id"
  onRowClick={(user) => {
    // user: User
    console.log(user.name, user.email);
  }}
/>
```

## Trading Component Types

Each trading component has its own data types:

```tsx
import {
  OrderBook,
  TimeSales,
  PositionLadder,
  TopMovers,
  type OrderBookData,
  type Trade,
  type LadderLevel,
  type MoverItem,
} from '@askturret/grid';

// OrderBook
const orderBookData: OrderBookData = {
  bids: [{ price: 100.50, size: 500 }],
  asks: [{ price: 100.75, size: 300 }],
};

<OrderBook data={orderBookData} levels={10} />

// TimeSales
const trades: Trade[] = [
  { id: '1', price: 100.50, size: 100, time: Date.now(), side: 'buy' },
];

<TimeSales trades={trades} maxTrades={100} />

// PositionLadder
const levels: LadderLevel[] = [
  { price: 100.50, bidSize: 500, askSize: 0 },
];

<PositionLadder levels={levels} tickSize={0.25} centerPrice={100.50} />

// TopMovers
const movers: MoverItem[] = [
  { symbol: 'AAPL', price: 178.50, change: 2.5, changePercent: 1.42 },
];

<TopMovers data={movers} gainersCount={5} losersCount={5} />
```

## Exported Types

All types are exported from the main package:

```tsx
import type {
  // DataGrid types
  DataGridProps,
  ColumnDef,
  SortState,

  // OrderBook types
  OrderBookProps,
  OrderBookData,
  OrderBookLevel,

  // TimeSales types
  TimeSalesProps,
  Trade,

  // PositionLadder types
  PositionLadderProps,
  LadderLevel,
  Position,

  // TopMovers types
  TopMoversProps,
  MoverItem,

  // Utility types
  CSVExportOptions,
} from '@askturret/grid';
```

## Best Practices

### 1. Define interfaces for your data

```tsx
interface Position {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
}

// Don't use `any` or inline object types
```

### 2. Use `satisfies` for column arrays

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol' },
  { field: 'price', header: 'Price' },
] satisfies ColumnDef<Position>[];
```

### 3. Extract column definitions

```tsx
// columns.ts
export const positionColumns: ColumnDef<Position>[] = [
  { field: 'symbol', header: 'Symbol' },
  { field: 'price', header: 'Price' },
];

// Component.tsx
import { positionColumns } from './columns';
```
