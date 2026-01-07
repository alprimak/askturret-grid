# Show HN: @askturret/grid - Pick your architecture: Worker, WASM, or JS

**Title:** Show HN: React data grid with 3 engines - Worker for streaming, WASM for filtering, JS for simplicity

---

I've been building trading software for 8 years, and the data grid problem has always annoyed me.

The typical options:
1. **Client-side grids** - Fast until you hit 10k rows, then JavaScript dies
2. **Server-side grids** - Handles scale, but adds network latency and backend complexity

But here's the thing: different workloads need different solutions.

Real-time streaming (trading, IoT) needs non-blocking updates.
Analytics dashboards need fast filtering on millions of rows.
Admin panels just need something simple that works.

So we built a grid with **three interchangeable engines**, same API:

| Engine | Best for | How it works |
|--------|----------|--------------|
| **Worker** | Real-time streaming | Web Worker batches updates off main thread |
| **WASM** | Heavy filtering | Rust + trigram indexing for instant search |
| **JS** | Simplicity | Zero deps, just works |

**Pick what fits your workload:**

```tsx
import { useGridStore } from '@askturret/grid';

const { data, updateRows } = useGridStore({
  storeType: 'worker', // or 'wasm' or 'js'
  schema: [...],
});
```

The Worker engine is particularly interesting - updates happen completely off the main thread. Your UI stays at 60fps even with thousands of updates per second.

**Trading-specific features:**
- Green/red flash highlighting on value changes
- Built-in OrderBook, TimeSales, PositionLadder components
- Adaptive performance (auto-disables effects when FPS drops)

This is extracted from AskTurret, an AI trading assistant I'm building. MIT licensed.

Live demo: https://grid.askturret.com/demo
Benchmarks (run your own tests): https://grid.askturret.com/benchmarks
GitHub: https://github.com/alprimak/askturret-grid

---

## Alternative shorter version (~150 words):

**Title:** Show HN: React grid with 3 engines - pick Worker, WASM, or JS based on your workload

Most grids force you into one architecture. But workloads differ.

We built a grid with three interchangeable engines:
- **Worker**: Off-thread updates for real-time streaming (trading, IoT)
- **WASM**: Trigram-indexed filtering for analytics on 1M+ rows
- **JS**: Zero-dependency simplicity for admin panels

Same API. Pick what fits:

```tsx
useGridStore({ storeType: 'worker' }) // Non-blocking updates
useGridStore({ storeType: 'wasm' })   // Fast filtering
useGridStore({ storeType: 'js' })     // Just works
```

Built for trading with flash highlighting, OrderBook, TimeSales components. The Worker engine keeps UI at 60fps even with 1000+ updates/second.

MIT licensed. Run your own benchmarks at grid.askturret.com/benchmarks

Demo: https://grid.askturret.com/demo
GitHub: https://github.com/alprimak/askturret-grid
