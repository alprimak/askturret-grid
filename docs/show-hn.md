# Show HN: I built a data grid that replaces server-side row models with Rust + WASM

**Title:** Show HN: @askturret/grid – Server-side grid performance without the server (Rust + WASM)

---

I've been building trading software for 8 years, and the data grid problem has always annoyed me.

You have two options:
1. **Client-side grids** - Fast until you hit 10k rows, then JavaScript dies
2. **Server-side grids** (AG Grid's "infinite row model") - Handles scale, but adds network latency and backend complexity

We chose a third path: compile Rust to WebAssembly and run it in the browser.

The result: sorting 100k rows in 12ms, filtering in 8ms, maintaining 60fps with 10% of rows updating every 250ms. No backend required.

**Key architectural decisions:**
- WASM core handles sorting, filtering, and aggregation
- React layer only renders visible rows (virtualization)
- Adaptive flash highlighting auto-disables when FPS drops below 55
- Zero-copy data sharing between JS and WASM where possible

**Trading-specific features:**
- Green/red flash highlighting on value changes
- Built-in formatters for prices, P&L, quantities
- Multi-window sync via BroadcastChannel
- OrderBook and TimeSales components (coming soon)

This is extracted from AskTurret, an AI trading assistant I'm building. Figured the grid component could stand on its own.

MIT licensed. Would love feedback from anyone who's dealt with high-frequency data visualization.

Live demo: https://grid.askturret.com
GitHub: https://github.com/askturret/grid
Benchmark page: https://grid.askturret.com/benchmarks

---

## Alternative shorter version (~150 words):

**Title:** Show HN: Rust + WASM data grid – 100k rows at 60fps, no server needed

We replaced AG Grid's server-side row model with client-side WASM.

The problem: JavaScript grids choke at 10k rows. Server-side grids add latency and infrastructure. For trading apps with real-time updates, neither option works well.

Our solution: Rust compiled to WebAssembly handling sort/filter/aggregation, React handling virtualized rendering.

Results:
- 100k row sort: 12ms (vs 200ms+ server round-trip)
- 60fps maintained during 10% row updates every 250ms
- Adaptive flash highlights (auto-disable when FPS drops)
- 45kb bundle (vs 200kb+ AG Grid)

Built this for AskTurret (AI trading assistant), extracted it as a standalone MIT library. Looking for feedback from anyone handling high-frequency data in the browser.

Demo: https://grid.askturret.com
GitHub: https://github.com/askturret/grid
