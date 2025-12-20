# CSV Export

Export grid data to CSV files with one function call.

## Basic Export

```tsx
import { exportToCSV } from '@askturret/grid';

// Trigger browser download
exportToCSV(data, columns, { filename: 'users.csv' });
```

## Get CSV String

Return the CSV as a string instead of downloading:

```tsx
const csv = exportToCSV(data, columns, { download: false });
console.log(csv);
// "Name,Email,Age\nAlice,alice@example.com,28\n..."
```

## Options

```tsx
interface CSVExportOptions {
  filename?: string;       // Default: 'export.csv'
  delimiter?: string;      // Default: ','
  includeHeaders?: boolean; // Default: true
  download?: boolean;      // Default: true
}
```

### Custom Delimiter

Use semicolons for European locales:

```tsx
exportToCSV(data, columns, {
  filename: 'export.csv',
  delimiter: ';',
});
```

### Exclude Headers

```tsx
exportToCSV(data, columns, {
  includeHeaders: false,
});
```

## Column Selection

Export only specific columns:

```tsx
const allColumns = [
  { field: 'id', header: 'ID' },
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
  { field: 'internal', header: 'Internal' },
];

// Export subset
const exportColumns = allColumns.filter(c => c.field !== 'internal');
exportToCSV(data, exportColumns);
```

## Nested Fields

The export handles nested field paths:

```tsx
const data = [
  { user: { name: 'Alice', email: 'alice@example.com' } },
];

const columns = [
  { field: 'user.name', header: 'Name' },
  { field: 'user.email', header: 'Email' },
];

exportToCSV(data, columns);
// "Name,Email\nAlice,alice@example.com\n"
```

## Special Characters

The export properly escapes:

- **Commas**: Values with commas are quoted
- **Quotes**: Double quotes are escaped as `""`
- **Newlines**: Values with newlines are quoted

```tsx
const data = [
  { name: 'Smith, John', bio: 'Said "Hello"' },
];

exportToCSV(data, columns);
// Name,Bio
// "Smith, John","Said ""Hello"""
```

## Excel Compatibility

CSV files include a BOM (Byte Order Mark) for proper Excel encoding:

```tsx
// UTF-8 BOM is automatically prepended
// This ensures Excel correctly interprets special characters
```

## Integration with DataGrid

Add an export button to your grid:

```tsx
import { DataGrid, exportToCSV } from '@askturret/grid';

function ExportableGrid({ data, columns }) {
  const handleExport = () => {
    exportToCSV(data, columns, { filename: 'grid-data.csv' });
  };

  return (
    <div>
      <button onClick={handleExport}>Export CSV</button>
      <DataGrid data={data} columns={columns} rowKey="id" />
    </div>
  );
}
```

## Export Filtered Data

Export only the currently filtered/displayed data:

```tsx
function FilterableGrid() {
  const [filter, setFilter] = useState('');
  const [filteredData, setFilteredData] = useState(allData);

  useEffect(() => {
    // Apply filter logic
    const filtered = allData.filter(row =>
      row.name.toLowerCase().includes(filter.toLowerCase())
    );
    setFilteredData(filtered);
  }, [filter]);

  const handleExport = () => {
    // Export filtered data, not all data
    exportToCSV(filteredData, columns, { filename: 'filtered-data.csv' });
  };

  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <button onClick={handleExport}>Export Filtered</button>
      <DataGrid data={filteredData} columns={columns} rowKey="id" />
    </div>
  );
}
```

## Custom Formatting

The export uses column field values directly. For custom formatting in CSV:

```tsx
// Option 1: Pre-transform data
const exportData = data.map(row => ({
  ...row,
  price: `$${row.price.toFixed(2)}`,
  date: new Date(row.date).toLocaleDateString(),
}));

exportToCSV(exportData, columns);

// Option 2: Use different columns for export
const exportColumns = [
  { field: 'symbol', header: 'Symbol' },
  {
    field: 'price',
    header: 'Price',
    // Note: formatter is for display only, not CSV export
  },
];
```

## Large Datasets

CSV export handles large datasets efficiently:

- Strings are built incrementally
- No intermediate DOM manipulation
- Memory usage scales linearly with data size

For very large exports (100k+ rows), consider:

```tsx
// Show loading state
setExporting(true);

// Use setTimeout to allow UI update
setTimeout(() => {
  exportToCSV(largeData, columns, { filename: 'large-export.csv' });
  setExporting(false);
}, 0);
```
