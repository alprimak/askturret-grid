# Sorting & Filtering

Built-in sorting and filtering with WASM acceleration for large datasets.

## Sorting

### Enable Sorting

Columns are sortable by default. Click headers to sort:

```tsx
<DataGrid
  data={users}
  columns={columns}
  rowKey="id"
/>
```

### Sort Indicators

- Click once: Sort ascending (▲)
- Click again: Sort descending (▼)
- Click again: Clear sort

### Disable Sorting

Disable sorting for specific columns:

```tsx
const columns = [
  { field: 'name', header: 'Name', sortable: true },    // Sortable
  { field: 'actions', header: 'Actions', sortable: false }, // Not sortable
];
```

### Custom Sort Order

The grid sorts values by their natural type:
- **Numbers**: Numeric comparison
- **Strings**: Locale-aware string comparison
- **Dates**: Chronological order

For custom sort behavior, transform your data before passing to the grid.

## Filtering

### Enable Filter Input

```tsx
<DataGrid
  data={users}
  columns={columns}
  rowKey="id"
  showFilter
  filterPlaceholder="Search users..."
/>
```

### Filter Specific Fields

By default, all columns are searchable. Limit to specific fields:

```tsx
<DataGrid
  data={users}
  columns={columns}
  rowKey="id"
  showFilter
  filterFields={['name', 'email']}  // Only search these
/>
```

### Filter Behavior

The filter uses **substring matching**:

- `john` matches "John Smith", "john@example.com"
- `@gmail` matches "user@gmail.com"
- Matching is **case-insensitive**

### Trigram Indexing (WASM)

With the optional WASM core, filtering uses trigram indexing for O(1) lookups:

```bash
npm install @askturret/grid-wasm
```

Performance comparison (100k rows):

| Method | Filter Time |
|--------|-------------|
| JavaScript linear scan | ~80ms |
| WASM trigram index | <1ms |

The grid automatically uses WASM when available.

## Programmatic Control

### External Filter

Control the filter from outside the grid:

```tsx
function FilteredGrid() {
  const [filter, setFilter] = useState('');
  const [data, setData] = useState(allData);

  // Apply filter externally
  useEffect(() => {
    if (!filter) {
      setData(allData);
    } else {
      setData(allData.filter(row =>
        row.name.toLowerCase().includes(filter.toLowerCase())
      ));
    }
  }, [filter, allData]);

  return (
    <>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search..."
      />
      <DataGrid
        data={data}  // Pre-filtered data
        columns={columns}
        rowKey="id"
      />
    </>
  );
}
```

### Combined Filtering

Combine grid filter with external filters:

```tsx
function AdvancedFiltering() {
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter by status first
  const statusFiltered = useMemo(() => {
    if (statusFilter === 'all') return allData;
    return allData.filter(row => row.status === statusFilter);
  }, [statusFilter, allData]);

  return (
    <>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
      </select>

      <DataGrid
        data={statusFiltered}  // Pre-filtered by status
        columns={columns}
        rowKey="id"
        showFilter  // Grid filter for text search
      />
    </>
  );
}
```

## Performance

### Large Datasets

For datasets over 10k rows:

1. **Use WASM core** for trigram indexing
2. **Debounce** filter input to avoid excessive re-renders
3. **Virtualization** is automatic at 100+ rows

### Sort Performance

| Row Count | Sort Time (WASM) |
|-----------|------------------|
| 10,000    | 2ms |
| 100,000   | 5ms |
| 1,000,000 | 18ms |

### Filter Performance (with trigram index)

| Row Count | Filter Time |
|-----------|-------------|
| 10,000    | <1ms |
| 100,000   | <1ms |
| 1,000,000 | <2ms |

## Empty State

Customize the empty message:

```tsx
<DataGrid
  data={filteredData}
  columns={columns}
  rowKey="id"
  showFilter
  emptyMessage="No matching results"
/>
```

The empty message shows when:
- Data array is empty
- All rows are filtered out
