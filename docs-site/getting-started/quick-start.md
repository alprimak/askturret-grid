# Quick Start

Build a functional data grid in 5 minutes.

## Basic Grid

```tsx
import { DataGrid } from '@askturret/grid';
import '@askturret/grid/styles.css';

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', age: 28 },
  { id: 2, name: 'Bob', email: 'bob@example.com', age: 34 },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 42 },
];

const columns = [
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
  { field: 'age', header: 'Age', align: 'right' },
];

function App() {
  return (
    <DataGrid
      data={users}
      columns={columns}
      rowKey="id"
    />
  );
}
```

## Adding Features

### Sorting

Columns are sortable by default. Click headers to sort:

```tsx
const columns = [
  { field: 'name', header: 'Name', sortable: true },
  { field: 'age', header: 'Age', sortable: true },
];
```

### Filtering

Enable the search box with `showFilter`:

```tsx
<DataGrid
  data={users}
  columns={columns}
  rowKey="id"
  showFilter
  filterPlaceholder="Search users..."
/>
```

### Flash Highlighting

Highlight cells when values change (great for real-time data):

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol' },
  { field: 'price', header: 'Price', flashOnChange: true },
  { field: 'change', header: 'Change', flashOnChange: true },
];
```

### Column Resizing & Reordering

```tsx
<DataGrid
  data={users}
  columns={columns}
  rowKey="id"
  resizable
  reorderable
/>
```

### Row Click Handler

```tsx
<DataGrid
  data={users}
  columns={columns}
  rowKey="id"
  onRowClick={(user) => console.log('Clicked:', user)}
/>
```

## Custom Formatting

Use the `formatter` prop for custom cell rendering:

```tsx
const columns = [
  { field: 'name', header: 'Name' },
  {
    field: 'price',
    header: 'Price',
    formatter: (value) => `$${value.toFixed(2)}`,
  },
  {
    field: 'change',
    header: 'Change',
    formatter: (value) => (
      <span style={{ color: value >= 0 ? 'green' : 'red' }}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </span>
    ),
  },
];
```

## Complete Example

```tsx
import { useState, useEffect } from 'react';
import { DataGrid } from '@askturret/grid';
import '@askturret/grid/styles.css';

interface Position {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  pnl: number;
}

const columns = [
  { field: 'symbol', header: 'Symbol', sortable: true },
  {
    field: 'price',
    header: 'Price',
    align: 'right',
    flashOnChange: true,
    formatter: (v: number) => `$${v.toFixed(2)}`,
  },
  { field: 'quantity', header: 'Qty', align: 'right' },
  {
    field: 'pnl',
    header: 'P&L',
    align: 'right',
    flashOnChange: true,
    formatter: (v: number) => (
      <span style={{ color: v >= 0 ? '#22c55e' : '#ef4444' }}>
        ${v.toFixed(2)}
      </span>
    ),
  },
];

function TradingGrid() {
  const [positions, setPositions] = useState<Position[]>([
    { id: '1', symbol: 'AAPL', price: 178.50, quantity: 100, pnl: 245.00 },
    { id: '2', symbol: 'GOOGL', price: 141.25, quantity: 50, pnl: -120.50 },
    { id: '3', symbol: 'MSFT', price: 378.90, quantity: 75, pnl: 890.00 },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPositions(prev =>
        prev.map(p => ({
          ...p,
          price: p.price * (1 + (Math.random() - 0.5) * 0.01),
          pnl: p.pnl + (Math.random() - 0.5) * 50,
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DataGrid
      data={positions}
      columns={columns}
      rowKey="id"
      showFilter
      resizable
    />
  );
}
```

## Next Steps

- [TypeScript Guide](/getting-started/typescript) - Type-safe patterns
- [Components](/components/data-grid) - Full DataGrid documentation
- [Theming](/guides/theming) - Customize colors and styles
