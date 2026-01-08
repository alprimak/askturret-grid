# Why We Built a React Grid with 3 Interchangeable Engines

*Pick Worker for streaming, WASM for filtering, or JS for simplicity—same API, different superpowers.*

---

Most data grids force you into one architecture. But after 8 years building trading software, I've learned that real-time price feeds need fundamentally different solutions than analytics dashboards.

So we built a grid with three interchangeable engines. Here's why, and how each one works.

## The Problem: One Size Doesn't Fit All

Consider three different workloads:

| Workload | What it needs | The bottleneck |
|----------|---------------|----------------|
| Trading terminal | 1000+ updates/second, UI must never stutter | Main thread blocking |
| Analytics dashboard | Filter millions of rows instantly | Search algorithm speed |
| Admin panel | Just work, no complexity | Setup overhead |

Traditional grids give you two choices:

**Option 1: Client-side JavaScript grids**

Works great until it doesn't. Push 10,000 rows through a JavaScript sort, and you'll watch your UI freeze for 200ms. Try filtering a million rows, and you might as well go make coffee.

The problem isn't JavaScript itself—it's that everything runs on the main thread. Every sort, filter, and update competes with user interactions for the same 16ms frame budget.

**Option 2: Server-side row models**

Offload the heavy lifting to your backend. Sounds good until you realize:
- Every scroll triggers a network request
- Latency varies wildly (50ms on good days, 500ms on bad)
- You need infrastructure to handle the load
- Real-time updates still hit the main thread

Neither option handles all three workloads well.

**The insight:** What if the grid could use different engines for different problems?

## The Three-Engine Architecture

We built `@askturret/grid` with three backend engines, all sharing the same React API:

```tsx
import { useGridStore } from '@askturret/grid';

// Pick your engine
const store = useGridStore({
  storeType: 'worker', // or 'wasm' or 'js'
  schema: columns,
  initialData: rows,
});
```

Same `<DataGrid>` component. Same props. Different performance characteristics.

| Engine | Best for | How it works |
|--------|----------|--------------|
| **Worker** | Real-time streaming | Web Worker processes updates off main thread |
| **WASM** | Heavy filtering | Rust + trigram indexing for instant search |
| **JS** | Simplicity | Zero dependencies, just works |

Let's dive into each one.

## Engine 1: WorkerGridStore

**The problem it solves:** Main thread blocking during high-frequency updates.

Here's what happens in a typical JavaScript grid when data updates:

```
Price update arrives
    → JavaScript processes update
    → Grid re-renders
    → User clicks button
    → Click handler waits...
    → UI feels sluggish
```

The main thread can only do one thing at a time. If it's processing 500 price updates, your button click waits in line.

**WorkerGridStore flips this model:**

```
Price update arrives
    → Queued to Web Worker (instant, non-blocking)
    → Worker processes update (off main thread)
    → User clicks button
    → Click handler runs immediately
    → Worker sends render data when ready
    → UI stays smooth
```

### How it works

All data lives in a Web Worker. The main thread only holds what's currently visible on screen.

```tsx
function TradingGrid() {
  const { data, updateRows, isReady } = useGridStore({
    storeType: 'worker',
    schema: [
      { name: 'symbol', type: 'string', primaryKey: true },
      { name: 'price', type: 'number' },
      { name: 'change', type: 'number' },
    ],
  });

  useEffect(() => {
    const ws = connectToMarketData();
    ws.onmessage = (updates) => {
      // This returns instantly—work happens in Worker
      updateRows(updates);
    };
    return () => ws.close();
  }, []);

  return <DataGrid data={data} columns={columns} rowKey="symbol" />;
}
```

When you call `updateRows()`, it posts a message to the Worker and returns immediately. The Worker:

1. Receives the update batch
2. Applies changes to its internal data store
3. Re-sorts if needed
4. Re-filters if a filter is active
5. Extracts only the visible rows
6. Posts the visible slice back to main thread

The main thread never touches the full dataset.

### Batching for 60fps

Updates are batched every 16ms (one frame). If 50 updates arrive in that window, the Worker processes them together and sends one render update.

```tsx
useGridStore({
  storeType: 'worker',
  batchInterval: 16, // Configurable
});
```

This means even with 1000 updates/second, you get at most 60 render cycles—matching your display's refresh rate.

### When to use Worker

**Use it for:**
- Trading terminals with live price feeds
- IoT dashboards with sensor data
- Collaborative apps with real-time sync
- Any scenario with >100 updates/second

**Avoid when:**
- You need synchronous access to data
- Dataset is small (<1000 rows)—overhead isn't worth it
- Server-side rendering (Workers don't exist on the server)

## Engine 2: WasmGridStore

**The problem it solves:** Slow filtering on large datasets.

JavaScript string operations are fast. But "fast" is relative. Filter a million rows by typing "AAPL", and you're looking at 300-400ms in pure JavaScript. That's noticeable lag on every keystroke.

**WasmGridStore uses a different approach:** trigram indexing, implemented in Rust and compiled to WebAssembly.

### How trigram indexing works

Instead of scanning every row on each filter, we pre-build an index:

```
"APPLE" → trigrams: ["APP", "PPL", "PLE"]
"GOOGLE" → trigrams: ["GOO", "OOG", "OGL", "GLE"]
"MICROSOFT" → trigrams: ["MIC", "ICR", "CRO", "ROS", "OSO", "SOF", "OFT"]
```

When you search for "PLE", the engine:
1. Generates trigrams for your query: ["PLE"]
2. Looks up which rows contain those trigrams
3. Returns intersection of matching rows

No scanning. Just index lookups.

### Benchmark results

Tested on AMD Ryzen, Linux, Chrome:

| Dataset | JavaScript filter | WASM filter |
|---------|-------------------|-------------|
| 100k rows | 45ms | 2ms |
| 500k rows | 180ms | 8ms |
| 1M rows | 400ms | 15ms |

That's 20-25x faster. The difference between "laggy" and "instant."

### Why Rust/WASM?

Three reasons:

1. **Predictable performance.** No garbage collection pauses. When you need consistent <16ms response times, GC pauses are the enemy.

2. **Memory efficiency.** Rust's ownership model means no memory leaks and compact data structures. The trigram index for 1M rows fits in ~50MB.

3. **SIMD acceleration.** Where available, the Rust compiler auto-vectorizes hot loops. Free performance on modern CPUs.

### Usage

```tsx
const { data, setFilter } = useGridStore({
  storeType: 'wasm',
  schema: [
    { name: 'symbol', type: 'string', indexed: true }, // Build trigram index
    { name: 'name', type: 'string', indexed: true },
    { name: 'price', type: 'number' },
  ],
});

// Instant, even on 1M rows
setFilter('AAPL');
```

### When to use WASM

**Use it for:**
- Analytics dashboards with 100k+ rows
- Search-heavy interfaces
- When filter latency matters (< 16ms target)

**Avoid when:**
- Small datasets (<10k rows)—JavaScript is fast enough
- Bundle size is critical (adds ~50KB gzipped)
- Server-side rendering (WASM needs a browser)

## Engine 3: JsGridStore

**The problem it solves:** Sometimes you just need a grid.

Not every app is a trading terminal. Sometimes you have 500 users in an admin panel, and the complexity of Workers and WASM isn't worth it.

JsGridStore is pure JavaScript. No Web Workers. No WASM. No build configuration. It just works.

```tsx
const { data } = useGridStore({
  storeType: 'js',
  schema: columns,
  initialData: users,
});

return <DataGrid data={data} columns={columns} rowKey="id" />;
```

### Why include it?

1. **Zero setup friction.** Import and use. No async loading, no Worker registration.

2. **SSR compatible.** Unlike Worker and WASM, plain JavaScript runs on the server.

3. **Debugging simplicity.** Everything happens on the main thread. Stack traces make sense.

4. **Baseline comparison.** When someone asks "do I need Worker/WASM?", they can benchmark against JS.

### When to use JS

**Use it for:**
- Admin panels and CRUD interfaces
- Datasets under 10k rows
- Server-side rendering
- When you want the simplest possible setup

**Avoid when:**
- High-frequency updates (>100/second)
- Large datasets (>100k rows) with filtering
- When frame drops are unacceptable

## The React Layer: Shared Across All Engines

Regardless of which engine you choose, you get the same React components and features:

### Virtualization

Only visible rows render. Scroll through a million rows, and DOM node count stays constant.

```tsx
<DataGrid
  data={data}
  columns={columns}
  virtualize="auto" // Enables at 100+ rows
/>
```

### Flash highlighting

Cells flash green on value increase, red on decrease. Essential for trading UIs.

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol' },
  { field: 'price', header: 'Price', flashOnChange: true },
];
```

### Adaptive performance

The grid monitors FPS via `requestAnimationFrame`. If frames drop below 55fps, it automatically disables animations and effects. When performance recovers, features re-enable.

```tsx
// Automatic—no configuration needed
// But you can disable it:
<DataGrid disableFlash={true} />
```

### Column management

Resize and reorder columns. Controlled or uncontrolled.

```tsx
<DataGrid
  resizable={true}
  reorderable={true}
  onColumnResize={(field, width) => savePreference(field, width)}
  onColumnReorder={(newOrder) => savePreference('order', newOrder)}
/>
```

## Choosing the Right Engine

Here's the decision flowchart:

```
High-frequency updates (>100/second)?
├─ Yes → Worker
└─ No
   └─ Large dataset (>100k rows) with filtering?
      ├─ Yes → WASM
      └─ No → JS
```

The beautiful part: **you can switch engines without changing your component code.**

```tsx
// Development: use JS for simple debugging
const store = useGridStore({ storeType: 'js', ... });

// Production: switch to Worker for real-time data
const store = useGridStore({ storeType: 'worker', ... });
```

Same `data` output. Same API. Different performance profile.

## Try It Yourself

Don't take our word for it. Run benchmarks on your own hardware:

- **Live demo:** [grid.askturret.com/demo](https://grid.askturret.com/demo)
- **Interactive benchmarks:** [grid.askturret.com/benchmarks](https://grid.askturret.com/benchmarks)
- **GitHub:** [github.com/alprimak/askturret-grid](https://github.com/alprimak/askturret-grid)
- **Documentation:** [grid.askturret.com/getting-started/installation](https://grid.askturret.com/getting-started/installation/)

The benchmark page lets you test sorting, filtering, and update throughput on datasets from 10k to 1M rows—in your browser, on your machine.

## Wrapping Up

One-size-fits-all doesn't work for data grids. Different workloads have different bottlenecks:

- **Real-time streaming** → Worker (off-thread processing)
- **Heavy filtering** → WASM (trigram indexing)
- **Simple use cases** → JS (zero complexity)

`@askturret/grid` gives you all three, behind the same React API. Pick what fits your workload. Switch when requirements change.

MIT licensed. Built for trading, useful everywhere.

---

*This grid is extracted from [AskTurret](https://askturret.com), an AI-native trading terminal. If you're building trading software, check it out.*
