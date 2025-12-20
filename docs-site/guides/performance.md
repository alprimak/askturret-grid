# Performance

Optimize grid performance for large datasets and high-frequency updates.

## Virtualization

The grid automatically virtualizes when row count exceeds 100.

### How It Works

1. Only visible rows are rendered to the DOM
2. Scroll position determines which rows to show
3. Buffer rows above/below viewport for smooth scrolling

### Manual Control

```tsx
// Always virtualize (even small datasets)
<DataGrid virtualize={true} ... />

// Never virtualize
<DataGrid virtualize={false} ... />

// Auto (default) - virtualize when rows > 100
<DataGrid virtualize="auto" ... />
```

### Custom Row Height

For accurate virtualization, specify row height:

```tsx
<DataGrid
  rowHeight={32}  // Default: 36
  ...
/>
```

## WASM Acceleration

Install the optional WASM core for maximum performance:

```bash
npm install askturret-grid-core
```

### What WASM Accelerates

| Operation | JavaScript | WASM |
|-----------|------------|------|
| Sort 100k rows | ~180ms | 5ms |
| Filter 100k rows | ~80ms | <1ms |
| Aggregations | ~100ms | 10ms |

### Automatic Detection

The grid automatically uses WASM when available:

```tsx
// No code changes needed
// Grid detects and uses WASM core if installed
```

### Manual Initialization

For explicit control:

```tsx
import { initWasm } from '@askturret/grid';

// Initialize WASM early (e.g., app startup)
await initWasm();
```

## Flash Highlighting

### Lazy Detection

Flash detection only runs for visible rows, not the entire dataset.

### Adaptive Mode

Flash effects automatically disable when FPS drops:

- Disables at 55 FPS
- Re-enables at 58 FPS
- Prevents performance degradation during heavy updates

### Disable Flash

For maximum performance:

```tsx
<DataGrid disableFlash ... />
```

## Benchmarks

Tested on AMD Ryzen, Linux, Chrome 131:

### Initial Render

| Row Count | Render Time |
|-----------|-------------|
| 1,000 | 12ms |
| 10,000 | 45ms |
| 100,000 | 52ms |
| 1,000,000 | 68ms |

### Sort Performance (WASM)

| Row Count | Sort Time |
|-----------|-----------|
| 10,000 | 2ms |
| 100,000 | 5ms |
| 1,000,000 | 18ms |

### Filter Performance (Trigram Index)

| Row Count | Filter Time |
|-----------|-------------|
| 10,000 | <1ms |
| 100,000 | <1ms |
| 1,000,000 | <2ms |

### Update Performance

| Update Rate | FPS Maintained |
|-------------|----------------|
| 100 rows/sec | 60 FPS |
| 1,000 rows/sec | 60 FPS |
| 10,000 rows/sec | 55+ FPS |

## Best Practices

### 1. Use Stable Row Keys

```tsx
// Good - stable, unique key
<DataGrid rowKey="id" ... />

// Bad - index as key (breaks optimization)
<DataGrid rowKey={(row, index) => index} ... />
```

### 2. Memoize Column Definitions

```tsx
// Good - columns don't change reference
const columns = useMemo(() => [
  { field: 'name', header: 'Name' },
  { field: 'price', header: 'Price' },
], []);

// Bad - new array every render
<DataGrid columns={[
  { field: 'name', header: 'Name' },
]} ... />
```

### 3. Batch Updates

```tsx
// Good - single state update
setData(prev => {
  const updated = [...prev];
  updates.forEach(update => {
    const index = updated.findIndex(r => r.id === update.id);
    if (index >= 0) updated[index] = { ...updated[index], ...update };
  });
  return updated;
});

// Bad - multiple state updates
updates.forEach(update => {
  setData(prev => prev.map(r =>
    r.id === update.id ? { ...r, ...update } : r
  ));
});
```

### 4. Use Immutable Updates

```tsx
// Good - new object reference
setData(prev => prev.map(row =>
  row.id === id ? { ...row, price: newPrice } : row
));

// Bad - mutation
data.find(r => r.id === id).price = newPrice;
setData([...data]);
```

### 5. Throttle High-Frequency Updates

```tsx
import { throttle } from 'lodash';

const updateData = throttle((updates) => {
  setData(prev => applyUpdates(prev, updates));
}, 100); // Max 10 updates per second
```

### 6. Pre-Filter Data

For complex filters, filter before passing to grid:

```tsx
const filteredData = useMemo(() => {
  return allData.filter(row => {
    // Complex filter logic
    return row.status === status && row.price > minPrice;
  });
}, [allData, status, minPrice]);

<DataGrid data={filteredData} ... />
```

## Memory Usage

### Typical Memory Footprint

| Row Count | Memory Usage |
|-----------|--------------|
| 10,000 | ~15 MB |
| 100,000 | ~80 MB |
| 1,000,000 | ~400 MB |

### Optimization Tips

1. **Limit columns**: Only include necessary fields
2. **Use compact mode**: Smaller row height = less DOM
3. **Paginate if needed**: For 1M+ rows, consider pagination

## Profiling

### React DevTools

1. Open React DevTools Profiler
2. Record during interaction
3. Look for unnecessary re-renders

### Performance API

```tsx
// Measure sort time
performance.mark('sort-start');
// ... sort operation
performance.mark('sort-end');
performance.measure('sort', 'sort-start', 'sort-end');

const measure = performance.getEntriesByName('sort')[0];
console.log(`Sort took ${measure.duration}ms`);
```

### FPS Monitor

The grid includes an internal FPS monitor for adaptive mode. Access it for debugging:

```tsx
import { useAdaptiveFlash } from '@askturret/grid';

function DebugPanel() {
  const { enabled, fps } = useAdaptiveFlash();
  return <div>FPS: {fps}, Flash: {enabled ? 'on' : 'off'}</div>;
}
```
