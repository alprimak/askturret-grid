# ColumnDef

Complete API reference for column definitions.

## Type Definition

```tsx
interface ColumnDef<T> {
  // Required
  field: keyof T | string;
  header: string;

  // Display
  width?: string;
  align?: 'left' | 'right' | 'center';

  // Behavior
  sortable?: boolean;
  flashOnChange?: boolean;

  // Customization
  formatter?: (value: unknown, row: T) => ReactNode;
  cellClass?: (value: unknown, row: T) => string;

  // Resize
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;

  // Reorder
  reorderable?: boolean;
}
```

## Required Properties

### field

```tsx
field: keyof T | string
```

The data field to display. Can be:
- A direct property of the data object
- A dot-notation path for nested objects

```tsx
// Direct property
{ field: 'name', header: 'Name' }

// Nested property
{ field: 'address.city', header: 'City' }
```

### header

```tsx
header: string
```

The text displayed in the column header.

## Display Properties

### width

```tsx
width?: string
// Default: undefined (auto)
```

CSS width value for the column.

```tsx
{ field: 'name', header: 'Name', width: '200px' }
{ field: 'name', header: 'Name', width: '20%' }
```

### align

```tsx
align?: 'left' | 'right' | 'center'
// Default: 'left'
```

Text alignment for both header and cells.

```tsx
{ field: 'price', header: 'Price', align: 'right' }
```

## Behavior Properties

### sortable

```tsx
sortable?: boolean
// Default: true
```

Whether the column can be sorted by clicking the header.

```tsx
{ field: 'actions', header: 'Actions', sortable: false }
```

### flashOnChange

```tsx
flashOnChange?: boolean
// Default: false
```

Enables flash highlighting when the cell value changes.

```tsx
{ field: 'price', header: 'Price', flashOnChange: true }
```

## Customization Properties

### formatter

```tsx
formatter?: (value: unknown, row: T) => ReactNode
```

Custom function to format the cell value. Can return a string or React element.

```tsx
// String formatter
{
  field: 'price',
  header: 'Price',
  formatter: (value) => `$${(value as number).toFixed(2)}`,
}

// React element formatter
{
  field: 'status',
  header: 'Status',
  formatter: (value) => (
    <span className={`status-${value}`}>{value}</span>
  ),
}

// Access row data
{
  field: 'pnl',
  header: 'P&L',
  formatter: (value, row) => {
    const pnl = value as number;
    const percent = (pnl / row.cost) * 100;
    return `${pnl.toFixed(2)} (${percent.toFixed(1)}%)`;
  },
}
```

### cellClass

```tsx
cellClass?: (value: unknown, row: T) => string
```

Custom function to apply CSS classes to cells.

```tsx
{
  field: 'pnl',
  header: 'P&L',
  cellClass: (value) => {
    const pnl = value as number;
    if (pnl > 0) return 'positive';
    if (pnl < 0) return 'negative';
    return '';
  },
}
```

## Resize Properties

### resizable

```tsx
resizable?: boolean
// Default: inherits from DataGrid.resizable
```

Per-column override for resizability.

```tsx
// Pin first column width
{ field: 'symbol', header: 'Symbol', resizable: false }
```

### minWidth

```tsx
minWidth?: number
// Default: inherits from DataGrid.minColumnWidth (50)
```

Minimum width in pixels for this column.

### maxWidth

```tsx
maxWidth?: number
// Default: inherits from DataGrid.maxColumnWidth (500)
```

Maximum width in pixels for this column.

## Reorder Properties

### reorderable

```tsx
reorderable?: boolean
// Default: inherits from DataGrid.reorderable
```

Per-column override for reorderability.

```tsx
// Keep symbol column first
{ field: 'symbol', header: 'Symbol', reorderable: false }
```

## Type Safety

The `ColumnDef` is generic over the data type:

```tsx
interface User {
  id: number;
  name: string;
  email: string;
}

// Type-safe column definition
const columns: ColumnDef<User>[] = [
  { field: 'name', header: 'Name' },     // ✓ valid
  { field: 'email', header: 'Email' },   // ✓ valid
  // { field: 'invalid', header: 'X' }, // ✗ TypeScript error
];
```

### Formatter Type Safety

```tsx
const columns: ColumnDef<User>[] = [
  {
    field: 'name',
    header: 'Name',
    formatter: (value, row) => {
      // value: unknown (cast as needed)
      // row: User
      return `${value} <${row.email}>`;
    },
  },
];
```

### cellClass Type Safety

```tsx
const columns: ColumnDef<User>[] = [
  {
    field: 'role',
    header: 'Role',
    cellClass: (value, row) => {
      // value: unknown
      // row: User
      if (row.id === 1) return 'primary-user';
      return '';
    },
  },
];
```

## Examples

### Basic Columns

```tsx
const columns: ColumnDef<Position>[] = [
  { field: 'symbol', header: 'Symbol' },
  { field: 'price', header: 'Price', align: 'right' },
  { field: 'quantity', header: 'Qty', align: 'right' },
];
```

### Trading Grid Columns

```tsx
const columns: ColumnDef<Position>[] = [
  {
    field: 'symbol',
    header: 'Symbol',
    width: '100px',
    sortable: true,
  },
  {
    field: 'price',
    header: 'Last',
    align: 'right',
    flashOnChange: true,
    formatter: (v) => `$${(v as number).toFixed(2)}`,
  },
  {
    field: 'pnl',
    header: 'P&L',
    align: 'right',
    flashOnChange: true,
    formatter: (v) => {
      const pnl = v as number;
      return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
    },
    cellClass: (v) => (v as number) >= 0 ? 'positive' : 'negative',
  },
  {
    field: 'actions',
    header: '',
    width: '80px',
    sortable: false,
    resizable: false,
    formatter: () => <button>Close</button>,
  },
];
```
