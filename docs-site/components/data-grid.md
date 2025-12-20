# DataGrid

The main virtualized data grid component. Handles sorting, filtering, flash highlighting, and column management.

## Basic Usage

```tsx
import { DataGrid } from '@askturret/grid';
import '@askturret/grid/styles.css';

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

const columns = [
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
];

<DataGrid data={users} columns={columns} rowKey="id" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | required | Data array to display |
| `columns` | `ColumnDef<T>[]` | required | Column definitions |
| `rowKey` | `keyof T \| (row: T) => string` | required | Unique row identifier |
| `emptyMessage` | `string` | `'No data'` | Message when data is empty |
| `compact` | `boolean` | `false` | Reduce row height for dense displays |
| `showFilter` | `boolean` | `false` | Show filter input |
| `filterPlaceholder` | `string` | `'Filter...'` | Filter input placeholder |
| `filterFields` | `(keyof T)[]` | all columns | Fields to search |
| `className` | `string` | - | Additional CSS class |
| `stickyHeader` | `boolean` | `true` | Make header sticky |
| `virtualize` | `boolean \| 'auto'` | `'auto'` | Force virtualization mode |
| `rowHeight` | `number` | `36` | Row height in pixels |
| `onRowClick` | `(row: T) => void` | - | Row click handler |
| `disableFlash` | `boolean` | `false` | Disable flash highlighting |
| `resizable` | `boolean` | `false` | Enable column resizing |
| `reorderable` | `boolean` | `false` | Enable column reordering |
| `columnWidths` | `Record<string, number>` | - | Controlled column widths |
| `onColumnResize` | `(field: string, width: number) => void` | - | Column resize callback |
| `columnOrder` | `string[]` | - | Controlled column order |
| `onColumnReorder` | `(newOrder: string[]) => void` | - | Column reorder callback |
| `minColumnWidth` | `number` | `50` | Minimum column width |
| `maxColumnWidth` | `number` | `500` | Maximum column width |

## Column Definition

```tsx
interface ColumnDef<T> {
  field: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  flashOnChange?: boolean;
  formatter?: (value: unknown, row: T) => ReactNode;
  cellClass?: (value: unknown, row: T) => string;
  resizable?: boolean;
  reorderable?: boolean;
  minWidth?: number;
  maxWidth?: number;
}
```

## Sorting

Click column headers to sort. Columns are sortable by default.

```tsx
const columns = [
  { field: 'name', header: 'Name', sortable: true },
  { field: 'price', header: 'Price', sortable: true },
  { field: 'actions', header: 'Actions', sortable: false },
];
```

## Filtering

Enable the filter input with `showFilter`:

```tsx
<DataGrid
  data={users}
  columns={columns}
  rowKey="id"
  showFilter
  filterPlaceholder="Search..."
  filterFields={['name', 'email']} // Only search these fields
/>
```

The filter uses trigram indexing for fast substring matching on large datasets.

## Flash Highlighting

Cells flash green (increase) or red (decrease) when numeric values change:

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol' },
  { field: 'price', header: 'Price', flashOnChange: true },
  { field: 'volume', header: 'Volume', flashOnChange: true },
];
```

::: tip Adaptive Mode
Flash highlighting automatically disables when FPS drops below 55 to maintain performance.
:::

## Column Resizing

Drag column borders to resize:

```tsx
// Uncontrolled
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  resizable
/>

// Controlled
const [widths, setWidths] = useState({ name: 200, email: 300 });

<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  resizable
  columnWidths={widths}
  onColumnResize={(field, width) =>
    setWidths(prev => ({ ...prev, [field]: width }))
  }
/>
```

## Column Reordering

Drag column headers to reorder:

```tsx
// Uncontrolled
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  reorderable
/>

// Controlled
const [order, setOrder] = useState(['name', 'email', 'age']);

<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  reorderable
  columnOrder={order}
  onColumnReorder={setOrder}
/>
```

## Virtualization

The grid automatically virtualizes when row count exceeds 100. Force virtualization mode:

```tsx
<DataGrid
  data={largeDataset}
  columns={columns}
  rowKey="id"
  virtualize={true}  // Always virtualize
  rowHeight={32}     // Custom row height
/>
```

## Custom Formatters

Format cell values with the `formatter` prop:

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol' },
  {
    field: 'price',
    header: 'Price',
    formatter: (value) => `$${value.toFixed(2)}`,
  },
  {
    field: 'change',
    header: 'Change',
    formatter: (value, row) => (
      <span className={value >= 0 ? 'green' : 'red'}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </span>
    ),
  },
];
```

## Cell Classes

Apply conditional classes to cells:

```tsx
const columns = [
  {
    field: 'status',
    header: 'Status',
    cellClass: (value) => {
      if (value === 'active') return 'status-active';
      if (value === 'pending') return 'status-pending';
      return '';
    },
  },
];
```

## Row Click Handler

```tsx
<DataGrid
  data={users}
  columns={columns}
  rowKey="id"
  onRowClick={(user) => {
    console.log('Selected:', user);
    navigate(`/users/${user.id}`);
  }}
/>
```

## Compact Mode

Reduce row height for dense displays:

```tsx
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  compact
/>
```
