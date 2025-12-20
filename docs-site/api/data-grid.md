# DataGridProps

Complete API reference for the DataGrid component props.

## Type Definition

```tsx
interface DataGridProps<T> {
  // Required
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: keyof T | ((row: T) => string);

  // Display
  emptyMessage?: string;
  compact?: boolean;
  className?: string;
  stickyHeader?: boolean;
  virtualize?: boolean | 'auto';
  rowHeight?: number;

  // Filtering
  showFilter?: boolean;
  filterPlaceholder?: string;
  filterFields?: (keyof T)[];

  // Flash
  disableFlash?: boolean;

  // Column Resizing
  resizable?: boolean;
  columnWidths?: Record<string, number>;
  onColumnResize?: (field: string, width: number) => void;
  minColumnWidth?: number;
  maxColumnWidth?: number;

  // Column Reordering
  reorderable?: boolean;
  columnOrder?: string[];
  onColumnReorder?: (newOrder: string[]) => void;

  // Events
  onRowClick?: (row: T) => void;
}
```

## Required Props

### data

```tsx
data: T[]
```

Array of data objects to display. Each object represents one row.

```tsx
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

<DataGrid data={users} ... />
```

### columns

```tsx
columns: ColumnDef<T>[]
```

Array of column definitions. See [ColumnDef](/api/column-def) for details.

```tsx
const columns = [
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
];
```

### rowKey

```tsx
rowKey: keyof T | ((row: T) => string)
```

Unique identifier for each row. Used for React keys and change detection.

```tsx
// Field name
<DataGrid rowKey="id" ... />

// Function
<DataGrid rowKey={(row) => `${row.type}-${row.id}`} ... />
```

## Display Props

### emptyMessage

```tsx
emptyMessage?: string
// Default: 'No data'
```

Message shown when data array is empty or all rows are filtered out.

### compact

```tsx
compact?: boolean
// Default: false
```

Reduces row height for dense displays.

### className

```tsx
className?: string
```

Additional CSS class for the grid container.

### stickyHeader

```tsx
stickyHeader?: boolean
// Default: true
```

Makes the header row sticky during scroll.

### virtualize

```tsx
virtualize?: boolean | 'auto'
// Default: 'auto'
```

Controls virtualization behavior:
- `true`: Always virtualize
- `false`: Never virtualize
- `'auto'`: Virtualize when rows > 100

### rowHeight

```tsx
rowHeight?: number
// Default: 36
```

Row height in pixels. Important for accurate virtualization calculations.

## Filter Props

### showFilter

```tsx
showFilter?: boolean
// Default: false
```

Shows a filter input above the grid.

### filterPlaceholder

```tsx
filterPlaceholder?: string
// Default: 'Filter...'
```

Placeholder text for the filter input.

### filterFields

```tsx
filterFields?: (keyof T)[]
// Default: all columns
```

Limits which fields are searched during filtering.

```tsx
<DataGrid
  filterFields={['name', 'email']}  // Only search name and email
  ...
/>
```

## Flash Props

### disableFlash

```tsx
disableFlash?: boolean
// Default: false
```

Disables all flash highlighting effects.

## Column Resize Props

### resizable

```tsx
resizable?: boolean
// Default: false
```

Enables column resizing by dragging column borders.

### columnWidths

```tsx
columnWidths?: Record<string, number>
```

Controlled column widths. Keys are field names, values are pixel widths.

```tsx
const [widths, setWidths] = useState({ name: 200, email: 300 });

<DataGrid
  columnWidths={widths}
  onColumnResize={(field, width) =>
    setWidths(prev => ({ ...prev, [field]: width }))
  }
  ...
/>
```

### onColumnResize

```tsx
onColumnResize?: (field: string, width: number) => void
```

Callback when a column is resized. Receives field name and new width.

### minColumnWidth

```tsx
minColumnWidth?: number
// Default: 50
```

Minimum width in pixels for all columns.

### maxColumnWidth

```tsx
maxColumnWidth?: number
// Default: 500
```

Maximum width in pixels for all columns.

## Column Reorder Props

### reorderable

```tsx
reorderable?: boolean
// Default: false
```

Enables column reordering via drag and drop.

### columnOrder

```tsx
columnOrder?: string[]
```

Controlled column order. Array of field names in display order.

```tsx
const [order, setOrder] = useState(['name', 'email', 'age']);

<DataGrid
  columnOrder={order}
  onColumnReorder={setOrder}
  ...
/>
```

### onColumnReorder

```tsx
onColumnReorder?: (newOrder: string[]) => void
```

Callback when columns are reordered. Receives new order array.

## Event Props

### onRowClick

```tsx
onRowClick?: (row: T) => void
```

Callback when a row is clicked. Receives the row data object.

```tsx
<DataGrid
  onRowClick={(user) => {
    console.log('Clicked:', user);
    navigate(`/users/${user.id}`);
  }}
  ...
/>
```

## Generic Type Parameter

The `DataGrid` component is generic over the data type:

```tsx
interface User {
  id: number;
  name: string;
  email: string;
}

// Explicit type parameter
<DataGrid<User> data={users} columns={columns} rowKey="id" />

// Inferred from data prop
<DataGrid data={users} columns={columns} rowKey="id" />
```

The type parameter enables:
- Type-safe `rowKey`
- Type-safe column `field` values
- Type-safe formatter and cellClass callbacks
- Type-safe `onRowClick` handler
