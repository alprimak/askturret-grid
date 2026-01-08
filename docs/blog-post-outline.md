# Blog Post: Why We Built a React Grid with 3 Interchangeable Engines

**Target length:** 2000-2500 words
**Target audience:** Frontend developers, performance-focused engineers, React developers
**Publishing:** dev.to, Medium, company blog

---

## Outline

### 1. The Problem (300 words)

**Hook:** "Most data grids force you into one architecture. But real-time trading needs different things than analytics dashboards."

- Context: Building trading software, different use cases need different solutions
- The spectrum of workloads:
  - Real-time streaming: 1000+ updates/second, UI must stay responsive
  - Analytics: Filtering/searching millions of rows instantly
  - Admin panels: Just need something simple that works

**The two traditional approaches and why they're limiting:**

1. **Client-side JavaScript grids**
   - Works great for simple cases
   - Struggles with high-frequency updates (blocks main thread)
   - Slow filtering on large datasets

2. **Server-side row models**
   - Offloads work but adds network latency
   - Doesn't solve real-time update problem
   - Infrastructure complexity

**The insight:** What if you could pick the right engine for your specific workload?

---

### 2. The Three-Engine Architecture (400 words)

**Why three engines instead of one "best" solution?**

Different workloads have fundamentally different bottlenecks:

| Workload | Bottleneck | Solution |
|----------|------------|----------|
| Real-time streaming | Main thread blocking | Worker (off-thread) |
| Heavy filtering | Search speed | WASM (trigram index) |
| Simple use cases | Complexity | JS (zero deps) |

**Engine 1: WorkerGridStore**
- All data lives in a Web Worker
- Updates are batched and processed off main thread
- Main thread only receives what it needs to render
- Result: 60fps maintained even with 1000+ updates/second

```tsx
useGridStore({ storeType: 'worker' })
```

**Engine 2: WasmGridStore**
- Rust compiled to WebAssembly
- Trigram indexing for instant text search
- Handles 1M+ rows without breaking a sweat
- Result: <2ms filter time on large datasets

```tsx
useGridStore({ storeType: 'wasm' })
```

**Engine 3: JsGridStore**
- Pure JavaScript, zero dependencies
- No WASM loading, no Worker setup
- Perfect for small datasets or SSR
- Result: Simplicity when you don't need complexity

```tsx
useGridStore({ storeType: 'js' })
```

**The key: Same API, different implementations**

---

### 3. Deep Dive: The Worker Engine (500 words)

**Why Workers are perfect for real-time data**

The fundamental problem with JavaScript grids:
```
User clicks → Data updates → JavaScript processes → UI updates
                            ↑
                     Main thread blocked
                     User sees stutter
```

With WorkerGridStore:
```
User clicks → Updates queued → Worker processes (off-thread) → UI updates
                               ↑
                        Main thread free
                        UI stays smooth
```

**Implementation details:**

1. **Message-based communication**
   - Updates sent to worker via postMessage
   - Worker batches and processes
   - Only visible rows sent back to main thread

2. **Viewport-aware rendering**
   - Worker knows what rows are visible
   - Only sends data that will actually render
   - Huge bandwidth savings

3. **Batch timing**
   - Updates batched every 16ms (one frame)
   - Configurable for different use cases
   - Automatic coalescing of duplicate updates

**When to use Worker:**
- Trading terminals with live price feeds
- IoT dashboards with sensor data
- Any high-frequency update scenario

**When NOT to use Worker:**
- Need synchronous operations
- Small datasets where overhead isn't worth it
- SSR (Workers don't exist server-side)

---

### 4. Deep Dive: The WASM Engine (400 words)

**Why WASM for filtering?**

The trigram indexing approach:
- Break every string into 3-character sequences
- Build an inverted index
- Search becomes index lookup instead of full scan

Example:
```
"APPLE" → ["APP", "PPL", "PLE"]
"GOOGLE" → ["GOO", "OOG", "OGL", "GLE"]

Search "PLE" → Instantly returns ["APPLE"]
```

**Rust implementation benefits:**
- Predictable performance (no GC pauses)
- SIMD acceleration where available
- Memory efficiency

**Benchmark results:**
| Dataset | JS Filter | WASM Filter |
|---------|-----------|-------------|
| 100k rows | 45ms | 2ms |
| 500k rows | 180ms | 8ms |
| 1M rows | 400ms | 15ms |

**When to use WASM:**
- Large datasets (100k+ rows)
- Complex search/filter requirements
- Analytics dashboards

**When NOT to use WASM:**
- Small datasets (overhead not worth it)
- Bundle size is critical (adds ~50kb)
- Need SSR (WASM requires browser)

---

### 5. The React Layer (300 words)

**Shared across all engines:**

1. **Virtualization**
   - Only renders visible rows
   - Auto-enables at 100+ rows
   - Smooth scrolling at any dataset size

2. **Flash highlighting**
   - Green flash on value increase
   - Red flash on value decrease
   - Ref-based tracking (not state)

3. **Adaptive performance**
   - Monitors FPS via requestAnimationFrame
   - Auto-disables effects when FPS drops below 55
   - Re-enables when performance recovers

**The DataGrid component doesn't care which engine you use:**

```tsx
const { data } = useGridStore({ storeType: 'worker' });

return <DataGrid data={data} columns={columns} />;
```

---

### 6. Choosing the Right Engine (200 words)

**Decision flowchart:**

```
High-frequency updates (>100/second)?
├─ Yes → Worker
└─ No
   └─ Large dataset (>100k rows)?
      ├─ Yes → WASM
      └─ No → JS
```

**The beautiful part:** You can switch engines without changing component code.

---

### 7. Conclusion (200 words)

**Key takeaways:**
- One-size-fits-all doesn't work for data grids
- Match your engine to your workload
- Same API means easy experimentation

**Call to action:**
- Try the live demo: https://grid.askturret.com/demo
- Run benchmarks on your machine: https://grid.askturret.com/benchmarks
- Star the repo: https://github.com/alprimak/askturret-grid

---

## Supporting Materials

**Code samples:**
- [ ] useGridStore hook usage
- [ ] Engine switching example
- [ ] Flash highlighting configuration

**Screenshots/GIFs:**
- [ ] Worker engine maintaining 60fps during updates
- [ ] WASM filtering 1M rows
- [ ] Engine comparison benchmark

**Links:**
- GitHub: https://github.com/alprimak/askturret-grid
- Demo: https://grid.askturret.com/demo
- Benchmarks: https://grid.askturret.com/benchmarks
- Docs: https://grid.askturret.com/getting-started/installation/
