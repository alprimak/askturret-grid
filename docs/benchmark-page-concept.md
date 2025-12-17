# Benchmark Page Concept

**URL:** `https://grid.askturret.com/benchmarks`

---

## Page Goals

1. **Prove claims with live, runnable benchmarks** - Not static numbers, actual tests users can run
2. **Compare against traditional approaches** - Show the problem we're solving
3. **Be transparent about methodology** - Build trust with technical audience
4. **Provide shareable results** - URL with encoded benchmark results for social proof

---

## Page Structure

### Hero Section

```
@askturret/grid Benchmarks

Server-side performance. Client-side simplicity.
Run real benchmarks in your browser. No cherry-picking.

[Run All Benchmarks] button
```

### Section 1: Interactive Benchmark Runner

**Live test panel with controls:**

```
┌─────────────────────────────────────────────────────────────────┐
│  BENCHMARK RUNNER                                    [Run All]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Dataset Size: [slider: 1k → 10k → 100k → 500k → 1M]           │
│                                                                 │
│  Currently: 100,000 rows                                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  [Live grid preview - shows actual data being tested]    │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Operations:                                                    │
│  ├─ [ ] Sort (click column header)                             │
│  ├─ [ ] Filter (type in search box)                            │
│  ├─ [ ] Scroll (measure render performance)                     │
│  └─ [ ] Update (10% rows change every 250ms)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Results display:**

```
┌─────────────────────────────────────────────────────────────────┐
│  RESULTS                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sort Latency          Filter Latency        Update Throughput  │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐   │
│  │             │       │             │       │             │   │
│  │    12ms     │       │     8ms     │       │   60 FPS    │   │
│  │             │       │             │       │             │   │
│  └─────────────┘       └─────────────┘       └─────────────┘   │
│    ● Excellent           ● Excellent           ● Excellent      │
│                                                                 │
│  Initial Render         Memory Usage          Bundle Size       │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐   │
│  │    52ms     │       │   142 MB    │       │    45 KB    │   │
│  └─────────────┘       └─────────────┘       └─────────────┘   │
│                                                                 │
│  [Share Results] [Download JSON] [View Methodology]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Section 2: Comparison Charts

**Interactive bar chart comparing approaches:**

```
SORT LATENCY (100k rows, lower is better)
═══════════════════════════════════════════════════════════════

@askturret/grid (WASM)     ██ 12ms
─────────────────────────────────────────────────────────────
Pure JavaScript            ████████████████████████████ 180ms
─────────────────────────────────────────────────────────────
Server-side (AG Grid)      ████████████ ~100ms + network
                           └─ Varies by network latency
─────────────────────────────────────────────────────────────

[Toggle: 10k | 100k | 500k | 1M rows]
```

**Metrics to compare:**

1. **Sort latency** - Time from click to sorted view
2. **Filter latency** - Time from keystroke to filtered view
3. **Max FPS during updates** - Sustainable update rate
4. **Memory usage** - Heap size under load
5. **Bundle size** - Initial download cost

### Section 3: Real-World Scenarios

**Pre-built test scenarios that match trading use cases:**

```
SCENARIO BENCHMARKS
─────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│  Position Monitor                                   [Run]   │
│  50,000 positions updating every 500ms                      │
│  Simulates: Portfolio management dashboard                  │
│  Result: __ FPS, __ ms sort latency                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Order Blotter                                      [Run]   │
│  100,000 orders with status changes                         │
│  Simulates: Trade desk order management                     │
│  Result: __ FPS, __ ms filter latency                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  High-Frequency Feed                                [Run]   │
│  1,000 updates per second across 10,000 instruments         │
│  Simulates: Market data display                             │
│  Result: __ updates/sec sustained at 60 FPS                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Risk Dashboard                                     [Run]   │
│  500,000 positions with aggregations (WASM)                 │
│  Simulates: Firm-wide risk monitoring                       │
│  Result: __ ms aggregation time                            │
└─────────────────────────────────────────────────────────────┘
```

### Section 4: Methodology (Collapsible)

**Transparent methodology section:**

```markdown
## How We Measure

### Test Environment
- All benchmarks run in YOUR browser, on YOUR hardware
- We report what you see, not synthetic lab numbers
- Results are reproducible - run them yourself

### Metrics Explained

**Sort Latency**
- Measured from column header click to last pixel painted
- Uses Performance API `performance.now()` for sub-ms accuracy
- Reported: Median of 5 runs, with outliers marked

**Filter Latency**
- Measured from `onChange` event to last row rendered
- Debounced by 150ms to match real typing behavior
- Reported: Median of 5 runs

**FPS During Updates**
- Measured via `requestAnimationFrame` timing
- Updates: 10% of rows modified every 250ms
- Reported: Average FPS over 10-second window

**Memory Usage**
- Measured via `performance.memory` (Chrome only)
- Reported: Peak heap size during benchmark

### What We Don't Measure (Honestly)
- Network latency for server-side solutions (varies too much)
- Cold start time (WASM module initialization)
- Memory fragmentation over time

### Known Limitations
- Safari doesn't support `performance.memory`
- Firefox WASM performance differs from Chrome
- Mobile results will vary significantly
```

### Section 5: Shareable Results

**URL structure for sharing:**

```
https://grid.askturret.com/benchmarks?results=eyJ...base64...
```

**Decoded contains:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "browser": "Chrome 120",
  "hardware": "Apple M1 Pro",
  "rows": 100000,
  "results": {
    "sortLatency": 12,
    "filterLatency": 8,
    "updateFps": 60,
    "memoryMb": 142
  }
}
```

**Share card preview (for Twitter/LinkedIn):**
```
┌─────────────────────────────────────────────────┐
│  @askturret/grid Benchmark Results              │
│                                                 │
│  100k rows • Sort: 12ms • Filter: 8ms • 60 FPS │
│                                                 │
│  Run your own: grid.askturret.com/benchmarks   │
└─────────────────────────────────────────────────┘
```

---

## Technical Implementation Notes

### Benchmark Runner Code Structure

```typescript
interface BenchmarkResult {
  name: string;
  rowCount: number;
  metrics: {
    sortLatency: number[];      // Array of runs
    filterLatency: number[];
    updateFps: number[];
    memoryMb?: number;
  };
  environment: {
    browser: string;
    platform: string;
    timestamp: string;
  };
}

async function runBenchmark(rowCount: number): Promise<BenchmarkResult> {
  // 1. Generate test data
  // 2. Warm up (2 runs, discarded)
  // 3. Measure sort (5 runs)
  // 4. Measure filter (5 runs)
  // 5. Measure update throughput (10 seconds)
  // 6. Capture memory snapshot
  // 7. Return results
}
```

### FPS Measurement Hook

```typescript
function useFpsMeter() {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    function measure() {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round(frameCount * 1000 / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      requestAnimationFrame(measure);
    }

    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  return fps;
}
```

### Comparison Data Sources

For comparison numbers, we need to be careful:

1. **Pure JavaScript baseline** - Run same sort/filter on raw array, no grid
2. **AG Grid Community** - Cite their published benchmarks + link
3. **Server-side** - Explain that network varies, show formula: `server_time + RTT`

**Do NOT:**
- Cherry-pick unfavorable scenarios for competitors
- Use outdated versions of competitor libraries
- Make claims we can't substantiate

---

## Visual Design Notes

### Color Scheme

- **Excellent (< 16ms):** Green `#22c55e`
- **Good (16-50ms):** Yellow `#eab308`
- **Acceptable (50-100ms):** Orange `#f97316`
- **Poor (> 100ms):** Red `#ef4444`

### Typography

- Headers: System font, bold
- Numbers: Monospace for alignment
- Body: System font, regular

### Dark Mode

- Default to dark (matches trading software aesthetic)
- Light mode toggle available

---

## SEO / Meta

```html
<title>@askturret/grid Benchmarks - 100k rows at 60fps</title>
<meta name="description" content="Live benchmarks for @askturret/grid.
  Test sorting, filtering, and updates on 100k+ rows in your browser.
  Compare to traditional JavaScript grids.">
<meta property="og:image" content="/benchmarks-og-image.png">
```

---

## Implementation Priority

1. **MVP:** Single benchmark runner with sort/filter/FPS metrics
2. **V1:** Comparison charts, scenario benchmarks
3. **V2:** Shareable results, methodology page
4. **V3:** Historical tracking, CI integration
