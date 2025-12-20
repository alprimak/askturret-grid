# Columns

Configure column behavior, resizing, reordering, and display options.

## Column Definition

```tsx
interface ColumnDef<T> {
  field: keyof T | string;           // Data field
  header: string;                    // Header text
  width?: string;                    // CSS width (e.g., '200px', '20%')
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;                // Default: true
  flashOnChange?: boolean;           // Flash on value changes
  formatter?: (value: unknown, row: T) => ReactNode;
  cellClass?: (value: unknown, row: T) => string;
  resizable?: boolean;               // Per-column resize control
  reorderable?: boolean;             // Per-column reorder control
  minWidth?: number;                 // Minimum width in px
  maxWidth?: number;                 // Maximum width in px
}
```

## Basic Configuration

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol', width: '100px' },
  { field: 'name', header: 'Name', width: '200px' },
  { field: 'price', header: 'Price', align: 'right', width: '100px' },
];
```

## Nested Fields

Access nested object properties with dot notation:

```tsx
interface User {
  id: number;
  profile: {
    name: string;
    email: string;
  };
  address: {
    city: string;
  };
}

const columns = [
  { field: 'profile.name', header: 'Name' },
  { field: 'profile.email', header: 'Email' },
  { field: 'address.city', header: 'City' },
];
```

## Column Resizing

### Enable Resizing

```tsx
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  resizable
/>
```

### Controlled Widths

Persist column widths in state or storage:

```tsx
const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
  symbol: 100,
  name: 200,
  price: 100,
});

<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  resizable
  columnWidths={columnWidths}
  onColumnResize={(field, width) =>
    setColumnWidths(prev => ({ ...prev, [field]: width }))
  }
/>
```

### Min/Max Constraints

```tsx
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  resizable
  minColumnWidth={80}   // Global minimum
  maxColumnWidth={400}  // Global maximum
/>

// Or per-column
const columns = [
  { field: 'symbol', header: 'Symbol', minWidth: 60, maxWidth: 150 },
  { field: 'description', header: 'Description', minWidth: 200 },
];
```

### Visual Feedback

When resizing hits a limit, the resize handle turns red and the cursor shows `not-allowed`.

### Disable for Specific Columns

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol', resizable: false },  // Fixed width
  { field: 'name', header: 'Name' },  // Resizable
  { field: 'price', header: 'Price' },  // Resizable
];
```

## Column Reordering

### Enable Reordering

```tsx
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  reorderable
/>
```

### Controlled Order

Persist column order:

```tsx
const [columnOrder, setColumnOrder] = useState(['symbol', 'name', 'price']);

<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  reorderable
  columnOrder={columnOrder}
  onColumnReorder={setColumnOrder}
/>
```

### Save to Local Storage

```tsx
function usePersistedColumnOrder(key: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultOrder;
  });

  const handleReorder = (newOrder: string[]) => {
    setOrder(newOrder);
    localStorage.setItem(key, JSON.stringify(newOrder));
  };

  return [order, handleReorder] as const;
}

// Usage
const [columnOrder, setColumnOrder] = usePersistedColumnOrder(
  'my-grid-columns',
  ['symbol', 'name', 'price']
);
```

### Disable for Specific Columns

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol', reorderable: false },  // Pinned
  { field: 'name', header: 'Name' },  // Can be reordered
  { field: 'price', header: 'Price' },  // Can be reordered
];
```

## Alignment

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol', align: 'left' },   // Default
  { field: 'name', header: 'Name', align: 'center' },
  { field: 'price', header: 'Price', align: 'right' },    // Numbers
];
```

## Sorting

Columns are sortable by default. Disable sorting for specific columns:

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol', sortable: true },   // Sortable (default)
  { field: 'actions', header: 'Actions', sortable: false }, // Not sortable
];
```

## Custom Formatters

Return a string or React element:

```tsx
const columns = [
  {
    field: 'price',
    header: 'Price',
    formatter: (value) => `$${value.toFixed(2)}`,
  },
  {
    field: 'change',
    header: 'Change',
    formatter: (value, row) => (
      <span style={{ color: value >= 0 ? 'green' : 'red' }}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </span>
    ),
  },
  {
    field: 'status',
    header: 'Status',
    formatter: (value) => {
      const colors = { active: 'green', pending: 'yellow', inactive: 'gray' };
      return <span className={`status-${value}`}>{value}</span>;
    },
  },
];
```

## Cell Classes

Apply conditional CSS classes:

```tsx
const columns = [
  {
    field: 'pnl',
    header: 'P&L',
    cellClass: (value) => value >= 0 ? 'positive' : 'negative',
  },
  {
    field: 'status',
    header: 'Status',
    cellClass: (value, row) => {
      if (row.urgent) return 'cell-urgent';
      return `status-${value}`;
    },
  },
];
```

```css
.positive { color: var(--grid-bid); }
.negative { color: var(--grid-ask); }
.cell-urgent { background: rgba(239, 68, 68, 0.2); }
```

## Flash Highlighting

Enable flash effects for real-time data:

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol' },  // No flash
  { field: 'price', header: 'Price', flashOnChange: true },
  { field: 'volume', header: 'Volume', flashOnChange: true },
];
```

Values flash:
- **Green** when value increases
- **Red** when value decreases

See [Flash Highlighting](/guides/flash-highlighting) for details.
