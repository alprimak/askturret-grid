import { useState, useCallback, useEffect, useRef } from 'react';
import { WasmGridStore, initWasmStore, isWasmStoreAvailable, type ColumnSchema } from '@askturret/grid';

interface TradingScenarioResults {
  // One-time costs
  loadJs: number;
  loadWasm: number | null;
  // Simulated trading session (1000 update cycles)
  totalUpdatesJs: number;
  totalUpdatesWasm: number | null;
  avgUpdateJs: number;
  avgUpdateWasm: number | null;
  // Filter during updates
  filterDuringUpdatesJs: number;
  filterDuringUpdatesWasm: number | null;
}

interface TestRow {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  change: number;
  volume: number;
}

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM', 'V'];

function generateRows(count: number): TestRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    symbol: SYMBOLS[i % SYMBOLS.length] + (i < SYMBOLS.length ? '' : `-${Math.floor(i / SYMBOLS.length)}`),
    price: 100 + Math.random() * 900,
    quantity: Math.floor(Math.random() * 10000),
    change: (Math.random() - 0.5) * 20,
    volume: Math.floor(Math.random() * 1000000),
  }));
}

function generatePriceUpdates(count: number, totalRows: number): { id: string; price: number; change: number }[] {
  const updates: { id: string; price: number; change: number }[] = [];
  const indices = new Set<number>();

  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * totalRows));
  }

  for (const idx of indices) {
    updates.push({
      id: `row-${idx}`,
      price: 100 + Math.random() * 900,
      change: (Math.random() - 0.5) * 20,
    });
  }

  return updates;
}

// Pure JS store for comparison
class JsGridStore {
  private data: TestRow[] = [];
  private idMap: Map<string, number> = new Map();
  private filterText = '';
  private viewCache: number[] | null = null;

  loadRows(rows: TestRow[]): void {
    this.data = [...rows];
    this.idMap = new Map(rows.map((r, i) => [r.id, i]));
    this.viewCache = null;
  }

  setFilter(text: string): void {
    this.filterText = text.toLowerCase();
    this.viewCache = null;
  }

  clearFilter(): void {
    this.filterText = '';
    this.viewCache = null;
  }

  batchUpdate(updates: { id: string; price: number; change: number }[]): void {
    for (const update of updates) {
      const idx = this.idMap.get(update.id);
      if (idx !== undefined) {
        this.data[idx].price = update.price;
        this.data[idx].change = update.change;
      }
    }
    this.viewCache = null;
  }

  getViewCount(): number {
    this.ensureView();
    return this.viewCache!.length;
  }

  private ensureView(): void {
    if (this.viewCache) return;

    if (!this.filterText) {
      this.viewCache = this.data.map((_, i) => i);
      return;
    }

    this.viewCache = this.data
      .map((row, i) => (row.symbol.toLowerCase().includes(this.filterText) ? i : -1))
      .filter((i) => i >= 0);
  }
}

const SCHEMA: ColumnSchema[] = [
  { name: 'id', type: 'string', primaryKey: true },
  { name: 'symbol', type: 'string', indexed: true },
  { name: 'price', type: 'number' },
  { name: 'quantity', type: 'number' },
  { name: 'change', type: 'number' },
  { name: 'volume', type: 'number' },
];

const ROW_COUNTS = [10000, 50000, 100000];
const ROW_LABELS = ['10k', '50k', '100k'];
const UPDATE_CYCLES = 100; // Simulate 100 update cycles (like 25 seconds at 250ms intervals)
const UPDATE_PERCENT = 0.15; // 15% of rows update each cycle

export function BenchmarkRunner() {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmLoading, setWasmLoading] = useState(false);
  const [rowCountIndex, setRowCountIndex] = useState(2); // Default 100k
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<TradingScenarioResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wasmStoreRef = useRef<WasmGridStore<TestRow> | null>(null);

  const rowCount = ROW_COUNTS[rowCountIndex];
  const updatesPerCycle = Math.floor(rowCount * UPDATE_PERCENT);

  useEffect(() => {
    async function load() {
      setWasmLoading(true);
      try {
        await initWasmStore();
        setWasmLoaded(isWasmStoreAvailable());
      } catch (e) {
        console.warn('WASM not available:', e);
      }
      setWasmLoading(false);
    }
    load();

    return () => {
      wasmStoreRef.current?.dispose();
    };
  }, []);

  const runBenchmarks = useCallback(async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    setProgress('Generating test data...');

    await new Promise((r) => setTimeout(r, 50));

    try {
      // Generate initial data
      const rows = generateRows(rowCount);

      // Pre-generate all update batches
      setProgress('Pre-generating update batches...');
      await new Promise((r) => setTimeout(r, 10));

      const updateBatches = Array.from({ length: UPDATE_CYCLES }, () =>
        generatePriceUpdates(updatesPerCycle, rowCount)
      );

      // =====================
      // JAVASCRIPT BENCHMARK
      // =====================
      setProgress('Running JavaScript benchmark...');
      await new Promise((r) => setTimeout(r, 10));

      const jsStore = new JsGridStore();

      // JS Load
      const loadJsStart = performance.now();
      jsStore.loadRows(rows);
      const loadJs = performance.now() - loadJsStart;

      // JS Update cycles
      const updateJsStart = performance.now();
      for (let i = 0; i < UPDATE_CYCLES; i++) {
        jsStore.batchUpdate(updateBatches[i]);
        // Simulate view computation (what React would trigger)
        jsStore.getViewCount();
      }
      const totalUpdatesJs = performance.now() - updateJsStart;
      const avgUpdateJs = totalUpdatesJs / UPDATE_CYCLES;

      // JS Filter during updates (simulate user typing while data updates)
      jsStore.setFilter('AAPL');
      const filterJsStart = performance.now();
      for (let i = 0; i < 10; i++) {
        jsStore.batchUpdate(updateBatches[i % UPDATE_CYCLES]);
        jsStore.getViewCount();
      }
      const filterDuringUpdatesJs = performance.now() - filterJsStart;
      jsStore.clearFilter();

      // =====================
      // WASM BENCHMARK
      // =====================
      let loadWasm: number | null = null;
      let totalUpdatesWasm: number | null = null;
      let avgUpdateWasm: number | null = null;
      let filterDuringUpdatesWasm: number | null = null;

      if (wasmLoaded) {
        setProgress('Running WASM benchmark (loading data)...');
        await new Promise((r) => setTimeout(r, 10));

        wasmStoreRef.current?.dispose();
        const store = await WasmGridStore.create<TestRow>(SCHEMA);
        wasmStoreRef.current = store;

        // WASM Load
        const loadWasmStart = performance.now();
        store.loadRows(rows);
        loadWasm = performance.now() - loadWasmStart;

        setProgress('Running WASM benchmark (update cycles)...');
        await new Promise((r) => setTimeout(r, 10));

        // WASM Update cycles
        const updateWasmStart = performance.now();
        for (let i = 0; i < UPDATE_CYCLES; i++) {
          store.updateRows(updateBatches[i]);
          store.getViewCount();

          if (i % 20 === 0) {
            setProgress(`WASM update cycle ${i + 1}/${UPDATE_CYCLES}...`);
            await new Promise((r) => setTimeout(r, 0));
          }
        }
        totalUpdatesWasm = performance.now() - updateWasmStart;
        avgUpdateWasm = totalUpdatesWasm / UPDATE_CYCLES;

        // WASM Filter during updates
        store.setFilter('AAPL');
        const filterWasmStart = performance.now();
        for (let i = 0; i < 10; i++) {
          store.updateRows(updateBatches[i % UPDATE_CYCLES]);
          store.getViewCount();
        }
        filterDuringUpdatesWasm = performance.now() - filterWasmStart;
        store.clearFilter();
      }

      setResults({
        loadJs,
        loadWasm,
        totalUpdatesJs,
        totalUpdatesWasm,
        avgUpdateJs,
        avgUpdateWasm,
        filterDuringUpdatesJs,
        filterDuringUpdatesWasm,
      });
      setProgress('');
    } catch (e) {
      console.error('Benchmark error:', e);
      setError(e instanceof Error ? e.message : 'Benchmark failed');
      setProgress('');
    }

    setRunning(false);
  }, [rowCount, updatesPerCycle, wasmLoaded]);

  const formatTime = (ms: number) => {
    if (ms < 1) return '<1ms';
    if (ms < 10) return `${ms.toFixed(1)}ms`;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getSpeedup = (js: number, wasm: number | null) => {
    if (wasm === null || wasm === 0 || js === 0) return null;
    const ratio = js / wasm;
    if (ratio < 1) return `${(1 / ratio).toFixed(1)}x slower`;
    return `${ratio.toFixed(1)}x faster`;
  };

  const getSpeedupClass = (js: number, wasm: number | null) => {
    if (wasm === null) return '';
    return js > wasm ? 'faster' : 'slower';
  };

  return (
    <div className="benchmark-runner">
      <div className="benchmark-controls">
        <div className="control-group">
          <label className="control-label">Portfolio Size</label>
          <div className="slider-container">
            <input
              type="range"
              min={0}
              max={ROW_COUNTS.length - 1}
              value={rowCountIndex}
              onChange={(e) => setRowCountIndex(parseInt(e.target.value))}
              className="slider"
              disabled={running}
            />
            <div className="slider-labels">
              {ROW_LABELS.map((label, i) => (
                <span key={i} className={i === rowCountIndex ? 'active' : ''}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="control-group">
          <button
            className={`run-button ${running ? 'running' : ''}`}
            onClick={runBenchmarks}
            disabled={running}
          >
            {running ? (
              <>
                <span className="spinner" /> Running...
              </>
            ) : (
              'Run Trading Scenario'
            )}
          </button>
        </div>
      </div>

      <div className={`wasm-status ${wasmLoaded ? 'loaded' : wasmLoading ? 'loading' : 'unavailable'}`}>
        {wasmLoading ? (
          'Loading WASM module...'
        ) : wasmLoaded ? (
          <>✓ WASM GridStore active</>
        ) : (
          <>⚠ WASM not available</>
        )}
      </div>

      {progress && <div className="benchmark-progress">{progress}</div>}
      {error && <div className="benchmark-error">{error}</div>}

      {results && (
        <div className="benchmark-results">
          <h3>Trading Scenario: {rowCount.toLocaleString()} instruments</h3>
          <p className="scenario-desc">
            {UPDATE_CYCLES} update cycles, {updatesPerCycle.toLocaleString()} price updates per cycle ({UPDATE_PERCENT * 100}%)
          </p>

          <div className="results-grid">
            {/* One-time Load */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Initial Load (one-time)</span>
                {results.loadWasm !== null && (
                  <span className={`speedup ${getSpeedupClass(results.loadJs, results.loadWasm)}`}>
                    {getSpeedup(results.loadJs, results.loadWasm)}
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.loadJs)}</span>
                </div>
                {results.loadWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className="bar wasm"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.loadWasm / Math.max(results.loadJs, results.loadWasm)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.loadWasm)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">Happens once at startup</div>
            </div>

            {/* Total Update Time */}
            <div className="result-card highlight">
              <div className="result-header">
                <span className="result-title">Total Update Time ({UPDATE_CYCLES} cycles)</span>
                {results.totalUpdatesWasm !== null && (
                  <span className={`speedup ${getSpeedupClass(results.totalUpdatesJs, results.totalUpdatesWasm)}`}>
                    {getSpeedup(results.totalUpdatesJs, results.totalUpdatesWasm)}
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.totalUpdatesJs)}</span>
                </div>
                {results.totalUpdatesWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className="bar wasm"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.totalUpdatesWasm / Math.max(results.totalUpdatesJs, results.totalUpdatesWasm)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.totalUpdatesWasm)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">
                {updatesPerCycle.toLocaleString()} updates × {UPDATE_CYCLES} cycles = {(updatesPerCycle * UPDATE_CYCLES).toLocaleString()} total updates
              </div>
            </div>

            {/* Average Update */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Avg per Update Cycle</span>
                {results.avgUpdateWasm !== null && (
                  <span className={`speedup ${getSpeedupClass(results.avgUpdateJs, results.avgUpdateWasm)}`}>
                    {getSpeedup(results.avgUpdateJs, results.avgUpdateWasm)}
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.avgUpdateJs)}</span>
                </div>
                {results.avgUpdateWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className="bar wasm"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.avgUpdateWasm / Math.max(results.avgUpdateJs, results.avgUpdateWasm)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.avgUpdateWasm)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">Target: &lt;16ms for 60fps</div>
            </div>

            {/* Filter + Updates */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Filter + 10 Update Cycles</span>
                {results.filterDuringUpdatesWasm !== null && (
                  <span className={`speedup ${getSpeedupClass(results.filterDuringUpdatesJs, results.filterDuringUpdatesWasm)}`}>
                    {getSpeedup(results.filterDuringUpdatesJs, results.filterDuringUpdatesWasm)}
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.filterDuringUpdatesJs)}</span>
                </div>
                {results.filterDuringUpdatesWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className="bar wasm"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.filterDuringUpdatesWasm / Math.max(results.filterDuringUpdatesJs, results.filterDuringUpdatesWasm)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.filterDuringUpdatesWasm)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">User filtering while data streams in</div>
            </div>
          </div>

          <div className="results-summary">
            <div className="summary-item">
              <span className="summary-label">Scenario</span>
              <span className="summary-value">Real-time trading feed</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Simulated Time</span>
              <span className="summary-value">~{Math.round(UPDATE_CYCLES * 0.25)}s at 250ms intervals</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Updates Processed</span>
              <span className="summary-value">{(updatesPerCycle * UPDATE_CYCLES).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {!results && !running && (
        <div className="benchmark-placeholder">
          <p>Simulates a real trading scenario:</p>
          <ul className="scenario-list">
            <li>Load {rowCount.toLocaleString()} instruments (one-time)</li>
            <li>{UPDATE_CYCLES} update cycles ({UPDATE_PERCENT * 100}% of rows each)</li>
            <li>Filter while updates stream in</li>
          </ul>
        </div>
      )}
    </div>
  );
}
