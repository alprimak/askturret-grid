# WASM-First Grid Architecture

## Overview

High-performance grid where **Rust/WASM owns all data**. JavaScript only receives indices and fetches visible rows for rendering.

```
┌────────────────────────────────────────────────────────────────┐
│                        WASM (Rust)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  GridStore   │  │ TrigramIndex │  │    ViewState         │ │
│  │  (row data)  │  │ (incremental)│  │ (filter/sort cache)  │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
         ▲                                         │
         │ updates (delta)                         │ view indices
         │ insert/update/delete                    │ + visible rows
         │                                         ▼
┌────────────────────────────────────────────────────────────────┐
│                        JavaScript                               │
│  - Send row updates: updateRows([{id, price: 150.5}, ...])    │
│  - Receive view: getViewCount() → 50000                        │
│  - Fetch visible: getVisibleRows(0, 50) → [{id, ...}, ...]    │
└────────────────────────────────────────────────────────────────┘
```

## Design Goals

1. **Single source of truth** - Data lives only in WASM
2. **O(1) updates** - Update single cell without full rebuild
3. **Incremental indexing** - Update trigram index per-row, not rebuild
4. **Minimal JS↔WASM transfer** - Only indices + visible rows cross boundary
5. **60fps with 1M rows** - Trading-grade performance

## Data Model

### Column-Major Storage

```rust
struct GridStore {
    // Schema
    columns: Vec<Column>,
    column_index: HashMap<String, usize>,  // name -> column idx

    // Row management
    row_count: usize,
    id_column: usize,                       // Which column has row IDs
    id_to_row: HashMap<String, u32>,        // ID -> row index
    deleted: BitVec,                        // Soft-delete flags

    // Indexing
    trigram_index: TrigramIndex,
    indexed_columns: Vec<usize>,            // Columns included in search

    // View state
    view: ViewState,
}

struct Column {
    name: String,
    data: ColumnData,
}

enum ColumnData {
    Strings(Vec<String>),       // Intern strings for memory efficiency
    Numbers(Vec<f64>),          // NaN for null
    Integers(Vec<i64>),         // i64::MIN for null
}
```

### Why Column-Major?

- Cache-friendly for sorting (access one column sequentially)
- Cache-friendly for filtering (scan indexed columns)
- SIMD-friendly for numeric operations
- Memory-efficient (no per-row overhead)

## Incremental Trigram Index

```rust
struct TrigramIndex {
    // trigram -> posting list (sorted row indices)
    index: HashMap<[u8; 3], Vec<u32>>,
}

impl TrigramIndex {
    // O(len(text)) - add row to index
    fn add(&mut self, row: u32, text: &str);

    // O(len(text)) - remove row from index
    fn remove(&mut self, row: u32, text: &str);

    // O(len(old) + len(new)) - update row
    fn update(&mut self, row: u32, old: &str, new: &str);

    // O(matches) - search returns candidate rows
    fn search(&self, query: &str) -> Vec<u32>;
}
```

### Update Cost Analysis

| Operation | Rebuild Index | Incremental |
|-----------|--------------|-------------|
| Insert 1 row | O(n * avg_len) | O(avg_len) |
| Update 1 cell | O(n * avg_len) | O(avg_len) |
| Delete 1 row | O(n * avg_len) | O(avg_len) |
| Batch update 1000 rows | O(n * avg_len) | O(1000 * avg_len) |

For n=100k rows, avg_len=20 chars:
- Rebuild: ~2M operations
- Incremental: ~20 operations per row

## View Management

```rust
struct ViewState {
    // Current view parameters
    filter_text: String,
    sort_column: Option<usize>,
    sort_dir: SortDir,

    // Cached results (invalidated on change)
    filtered_rows: Option<Vec<u32>>,    // After filter
    sorted_indices: Option<Vec<u32>>,   // After sort

    // Dirty flags for incremental updates
    filter_dirty: bool,
    sort_dirty: bool,
}
```

### Incremental View Updates

When rows update:
1. If updated row matches filter → keep in view
2. If updated row no longer matches → remove from view
3. If sort column changed → mark sort dirty
4. Re-sort only if sort_dirty (stable sort preserves order for unchanged)

## API Design

### Initialization

```rust
#[wasm_bindgen]
impl GridStore {
    #[wasm_bindgen(constructor)]
    pub fn new(schema: JsValue) -> Result<GridStore, JsError>;
}

// Schema format:
// [
//   { name: "id", type: "string", primaryKey: true },
//   { name: "symbol", type: "string", indexed: true },
//   { name: "price", type: "number" },
//   { name: "quantity", type: "integer" },
// ]
```

### Data Operations

```rust
// Bulk load (initial)
pub fn load_json(&mut self, rows: JsValue) -> Result<u32, JsError>;

// Incremental updates (real-time)
pub fn insert(&mut self, id: &str, row: JsValue) -> Result<u32, JsError>;
pub fn update(&mut self, id: &str, changes: JsValue) -> Result<(), JsError>;
pub fn delete(&mut self, id: &str) -> Result<(), JsError>;

// Batch operations (for high-frequency updates)
pub fn batch_update(&mut self, updates: JsValue) -> Result<u32, JsError>;

// updates format: [{ id: "row1", price: 150.5 }, { id: "row2", quantity: 100 }]
```

### View Control

```rust
pub fn set_filter(&mut self, search: &str);
pub fn set_sort(&mut self, column: &str, direction: &str);  // "asc" | "desc" | "none"
pub fn clear_filter(&mut self);
pub fn clear_sort(&mut self);
```

### View Access (for rendering)

```rust
// Get total rows after filtering
pub fn view_count(&self) -> usize;

// Get row indices for virtualized rendering
pub fn view_indices(&self, start: usize, count: usize) -> Uint32Array;

// Get actual row data for visible rows (returns JSON)
pub fn get_rows(&self, indices: Uint32Array) -> JsValue;

// Get single cell value
pub fn get_cell(&self, row: u32, column: &str) -> JsValue;
```

## TypeScript Wrapper

```typescript
interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'integer';
  primaryKey?: boolean;
  indexed?: boolean;  // Include in text search
}

interface RowUpdate {
  id: string;
  [field: string]: unknown;
}

class WasmGridStore {
  private store: GridStore;

  static async create(schema: ColumnSchema[]): Promise<WasmGridStore>;

  // Initial load
  loadRows(rows: Record<string, unknown>[]): number;

  // Real-time updates
  updateRows(updates: RowUpdate[]): number;
  deleteRows(ids: string[]): number;

  // View
  setFilter(search: string): void;
  setSort(column: string, direction: 'asc' | 'desc' | null): void;

  // Rendering
  getViewCount(): number;
  getVisibleRows(start: number, count: number): Record<string, unknown>[];

  // Events
  onViewChange(callback: () => void): void;
}
```

## React Integration

```tsx
function DataGrid<T>({
  store,           // WasmGridStore instance
  columns,         // Column definitions (for rendering)
  rowHeight,
  onRowClick,
}: Props<T>) {
  const [viewCount, setViewCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to view changes
  useEffect(() => {
    return store.onViewChange(() => {
      setViewCount(store.getViewCount());
    });
  }, [store]);

  // Virtualized rendering
  const { scrollTop } = useScroll(containerRef);
  const startIndex = Math.floor(scrollTop / rowHeight);
  const visibleCount = Math.ceil(containerHeight / rowHeight) + overscan;

  // Fetch only visible rows from WASM
  const visibleRows = useMemo(
    () => store.getVisibleRows(startIndex, visibleCount),
    [store, startIndex, visibleCount, viewCount]  // viewCount triggers re-fetch
  );

  return (
    <div ref={containerRef} style={{ height: viewCount * rowHeight }}>
      <div style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
        {visibleRows.map((row, i) => (
          <Row key={row.id} data={row} columns={columns} index={startIndex + i} />
        ))}
      </div>
    </div>
  );
}
```

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Initial load 100k rows | < 500ms | Bulk insert + index build |
| Update 1000 rows | < 5ms | Incremental index update |
| Filter 100k rows | < 10ms | Trigram index lookup |
| Sort 100k rows | < 50ms | In-place sort of indices |
| Render 50 visible rows | < 1ms | Fetch from WASM |
| Memory for 100k rows | < 100MB | Column-major, string interning |

## Migration Path

1. **Phase 1**: Implement GridStore in Rust (this PR)
2. **Phase 2**: Create WasmGridStore TypeScript wrapper
3. **Phase 3**: Add `useWasmGrid` hook for React
4. **Phase 4**: Update DataGrid to optionally use WASM store
5. **Phase 5**: Deprecate old GridCore API
