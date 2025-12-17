# Blog Post: How We Replaced Server-Side Grids with Rust + WebAssembly

**Target length:** 2000-2500 words
**Target audience:** Frontend developers, performance-focused engineers, Rust enthusiasts
**Publishing:** dev.to, Medium, company blog

---

## Outline

### 1. The Problem (300 words)

**Hook:** "We needed to display 100k trading positions with real-time updates. Every existing solution failed us."

- Context: Building trading software, typical dataset is 50k-500k rows
- Real-time requirement: 10-20% of rows update every 250ms
- UX requirement: sorting/filtering must feel instant (<100ms)

**The two traditional approaches and why they fail:**

1. **Client-side JavaScript grids**
   - Works great until ~5k rows
   - 10k rows: sorting takes 500ms+
   - 100k rows: browser locks up
   - Example: AG Grid community edition, React Table

2. **Server-side row models**
   - AG Grid Enterprise, Handsontable
   - Offload sort/filter to backend
   - Problems:
     - Network latency (50-200ms per operation)
     - Backend infrastructure cost
     - Complexity (pagination, caching, invalidation)
     - Doesn't solve real-time updates

**The insight:** What if we could get server-side performance without the server?

---

### 2. Why WebAssembly? (400 words)

**Why not just optimize JavaScript?**
- JS engines are incredible, but fundamentally limited for data processing
- Explain: JIT compilation, garbage collection pauses, lack of true integers
- Real numbers: V8 sorts 100k objects in ~180ms. Rust does it in ~8ms.

**Why Rust specifically?**
- Zero-cost abstractions
- No garbage collector (predictable latency)
- Mature WASM toolchain (wasm-bindgen, wasm-pack)
- Memory safety without runtime overhead

**The WASM bridge overhead myth**
- Common concern: "Isn't crossing the JS/WASM boundary slow?"
- Reality: For bulk operations, the savings dwarf the overhead
- Show benchmark: 100k row sort
  - Pure JS: 180ms
  - WASM (including serialization): 15ms
  - The 12x speedup more than covers the bridge cost

**When WASM doesn't help**
- Small datasets (<1k rows): JS is fine, WASM overhead not worth it
- Simple operations: Array.filter on 100 items doesn't need WASM
- Our approach: Adaptive - only use WASM when dataset exceeds threshold

---

### 3. Architecture Deep Dive (500 words)

**Package structure:**
```
@askturret/grid-core   (Rust → WASM)
@askturret/grid-react  (React components)
```

**The Rust core handles:**

1. **Sorting**
   - Rust's `sort_unstable` is incredibly fast
   - Key insight: Sort indices, not actual data
   - Code snippet: Parallel sorting with rayon

2. **Filtering**
   - SIMD-accelerated string matching where available
   - Compiled regex vs JS regex performance

3. **Aggregations**
   - VWAP, TWAP calculations
   - Running totals with streaming updates
   - Why this matters for trading: recalculating 100k positions

4. **Tick buffering and deduplication**
   - Real-time feeds send duplicate/stale data
   - Ring buffer with timestamp-based dedup
   - Why this needs to be fast: 1000+ updates/second

**Data transfer between JS and WASM:**

```
Option 1: JSON serialization (slow)
Option 2: SharedArrayBuffer (fast, but compatibility issues)
Option 3: Typed arrays + manual serialization (our approach)
```

Explain the tradeoff and why we chose Option 3.

**React layer handles:**

1. **Virtualization**
   - Only render visible rows (~50 at a time)
   - Using @tanstack/react-virtual
   - Why not react-window: flexibility for trading UI

2. **Flash highlighting**
   - Green flash on value increase, red on decrease
   - Challenge: Tracking previous values for 100k cells
   - Solution: Map-based tracking with ref (not state)

3. **Adaptive performance**
   - Monitor FPS with requestAnimationFrame
   - Auto-disable flash when FPS < 55 for 2 seconds
   - Re-enable when FPS > 58 for 3 seconds (hysteresis)

---

### 4. Benchmark Methodology (300 words)

**What we measure:**
- Initial render time
- Sort latency (click to complete)
- Filter latency (keystroke to complete)
- Update throughput (rows/second at 60fps)
- Memory usage

**Test environment:**
- Hardware: M1 MacBook Pro, 16GB RAM
- Browser: Chrome 120, Firefox 121, Safari 17
- Methodology: 10 runs, discard outliers, report median

**Results table:**

| Metric | 10k rows | 100k rows | 1M rows |
|--------|----------|-----------|---------|
| Initial render | 45ms | 52ms | 68ms |
| Sort | 2ms | 12ms | 95ms |
| Filter | 1ms | 8ms | 72ms |
| Max update rate | 60fps | 60fps | 45fps |

**Comparison with alternatives:**
- AG Grid Community: [numbers]
- AG Grid Enterprise (server-side): [network-dependent]
- React Table: [numbers]
- Handsontable: [numbers]

**Honesty section:** When our approach is slower
- Small datasets: WASM overhead not worth it
- Complex cell renderers: React is the bottleneck, not data processing

---

### 5. Implementation Details (400 words)

**Code walkthrough: The sort function**

```rust
#[wasm_bindgen]
pub fn sort_indices(data: &[u8], field_offset: usize, ascending: bool) -> Vec<u32> {
    // Explain the implementation
}
```

**Code walkthrough: Flash highlighting**

```tsx
// Explain ref-based tracking vs state-based
// Show the Map structure and cleanup logic
```

**Code walkthrough: Adaptive FPS monitoring**

```tsx
// Show the useAdaptiveFlash hook
// Explain hysteresis logic
```

**Memory management considerations:**
- WASM linear memory growth
- When to release Rust-side allocations
- Avoiding memory leaks in long-running trading apps

---

### 6. Lessons Learned (200 words)

**What worked:**
- Starting with pure JS, then profiling to find bottlenecks
- Only moving proven-slow operations to WASM
- Keeping React layer simple (it's just a view)

**What didn't work:**
- Initial attempt at SharedArrayBuffer (Safari support)
- Over-engineering the WASM interface
- Trying to make WASM handle rendering logic

**Surprising findings:**
- String sorting in WASM is only 2x faster than JS (not 10x)
- The biggest win was numeric sorting and aggregations
- Memory transfer is the bottleneck, not computation

---

### 7. Conclusion (200 words)

**When to use this approach:**
- Datasets > 10k rows with frequent updates
- Performance-critical applications (trading, monitoring, analytics)
- When you can't or don't want server-side infrastructure

**When to stick with traditional grids:**
- Small datasets
- Infrequent updates
- Team without Rust experience (maintenance cost)

**Call to action:**
- Try the live demo
- Star the repo
- Check out AskTurret for the full trading platform

---

## Supporting Materials

**Code samples for the post:**
- [ ] Rust sorting function (simplified)
- [ ] Flash tracking hook
- [ ] Adaptive FPS hook
- [ ] Benchmark runner script

**Screenshots/GIFs:**
- [ ] 100k rows scrolling smoothly (GIF)
- [ ] Flash highlighting demo (GIF)
- [ ] FPS monitor during stress test
- [ ] Benchmark results chart

**Links:**
- GitHub repo
- Live demo
- Benchmark page
- AskTurret main site
