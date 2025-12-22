import { useState, useCallback, useEffect, useRef } from 'react';
import { WasmGridStore, initWasmStore, isWasmStoreAvailable, type ColumnSchema } from '@askturret/grid';

interface BenchmarkResults {
  // Data load
  loadJs: number;
  loadWasm: number | null;
  // Filter (after data is loaded)
  filterJs: number;
  filterWasm: number | null;
  // Batch update
  updateJs: number;
  updateWasm: number | null;
}

interface TestRow {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
}

// Generate test data
function generateRows(count: number): TestRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    symbol: `SYM_${i % 1000}`,
    price: Math.random() * 1000,
    quantity: Math.floor(Math.random() * 1000),
  }));
}

// Pure JS store for comparison
class JsGridStore {
  private data: TestRow[] = [];
  private indexedField = 'symbol';
  private filterText = '';
  private sortColumn: string | null = null;
  private sortDir: 'asc' | 'desc' = 'asc';
  private viewCache: number[] | null = null;

  loadRows(rows: TestRow[]): void {
    this.data = [...rows];
    this.viewCache = null;
  }

  setFilter(text: string): void {
    this.filterText = text.toLowerCase();
    this.viewCache = null;
  }

  batchUpdate(updates: { id: string; price: number }[]): void {
    const idMap = new Map(this.data.map((r, i) => [r.id, i]));
    for (const update of updates) {
      const idx = idMap.get(update.id);
      if (idx !== undefined) {
        this.data[idx] = { ...this.data[idx], price: update.price };
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

    let indices = this.data.map((_, i) => i);

    // Filter
    if (this.filterText) {
      indices = indices.filter((i) =>
        this.data[i].symbol.toLowerCase().includes(this.filterText)
      );
    }

    // Sort
    if (this.sortColumn) {
      const col = this.sortColumn as keyof TestRow;
      indices.sort((a, b) => {
        const va = this.data[a][col];
        const vb = this.data[b][col];
        if (typeof va === 'number' && typeof vb === 'number') {
          return this.sortDir === 'asc' ? va - vb : vb - va;
        }
        return this.sortDir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }

    this.viewCache = indices;
  }
}

const SCHEMA: ColumnSchema[] = [
  { name: 'id', type: 'string', primaryKey: true },
  { name: 'symbol', type: 'string', indexed: true },
  { name: 'price', type: 'number' },
  { name: 'quantity', type: 'number' },
];

const ROW_COUNTS = [10000, 100000, 500000, 1000000];
const ROW_LABELS = ['10k', '100k', '500k', '1M'];

export function BenchmarkRunner() {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmLoading, setWasmLoading] = useState(false);
  const [rowCountIndex, setRowCountIndex] = useState(1); // Default 100k
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wasmStoreRef = useRef<WasmGridStore<TestRow> | null>(null);

  const rowCount = ROW_COUNTS[rowCountIndex];

  // Load WASM on mount
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

    await new Promise((r) => setTimeout(r, 50));

    try {
      // Generate test data
      const rows = generateRows(rowCount);
      const updates = rows.slice(0, Math.floor(rowCount * 0.1)).map((r) => ({
        id: r.id,
        price: Math.random() * 1000,
      }));

      // =====================
      // LOAD BENCHMARK
      // =====================

      // JS Load
      const jsStore = new JsGridStore();
      const loadJsStart = performance.now();
      jsStore.loadRows(rows);
      const loadJs = performance.now() - loadJsStart;

      await new Promise((r) => setTimeout(r, 10));

      // WASM Load
      let loadWasm: number | null = null;
      if (wasmLoaded) {
        wasmStoreRef.current?.dispose();
        const store = await WasmGridStore.create<TestRow>(SCHEMA);
        wasmStoreRef.current = store;

        const loadWasmStart = performance.now();
        store.loadRows(rows);
        loadWasm = performance.now() - loadWasmStart;
      }

      await new Promise((r) => setTimeout(r, 10));

      // =====================
      // FILTER BENCHMARK (data already loaded)
      // =====================

      // JS Filter
      const filterJsStart = performance.now();
      jsStore.setFilter('SYM_42');
      jsStore.getViewCount(); // Force computation
      const filterJs = performance.now() - filterJsStart;

      await new Promise((r) => setTimeout(r, 10));

      // WASM Filter
      let filterWasm: number | null = null;
      if (wasmLoaded && wasmStoreRef.current) {
        const filterWasmStart = performance.now();
        wasmStoreRef.current.setFilter('SYM_42');
        wasmStoreRef.current.getViewCount(); // Force computation
        filterWasm = performance.now() - filterWasmStart;
      }

      await new Promise((r) => setTimeout(r, 10));

      // =====================
      // UPDATE BENCHMARK
      // =====================

      // JS Update
      const updateJsStart = performance.now();
      jsStore.batchUpdate(updates);
      const updateJs = performance.now() - updateJsStart;

      await new Promise((r) => setTimeout(r, 10));

      // WASM Update
      let updateWasm: number | null = null;
      if (wasmLoaded && wasmStoreRef.current) {
        // Clear filter first to reset view
        wasmStoreRef.current.clearFilter();

        const updateWasmStart = performance.now();
        wasmStoreRef.current.updateRows(updates);
        updateWasm = performance.now() - updateWasmStart;
      }

      setResults({
        loadJs,
        loadWasm,
        filterJs,
        filterWasm,
        updateJs,
        updateWasm,
      });
    } catch (e) {
      console.error('Benchmark error:', e);
      setError(e instanceof Error ? e.message : 'Benchmark failed');
    }

    setRunning(false);
  }, [rowCount, wasmLoaded]);

  const formatTime = (ms: number) => {
    if (ms < 1) return '<1ms';
    if (ms < 10) return `${ms.toFixed(1)}ms`;
    return `${Math.round(ms)}ms`;
  };

  const getSpeedup = (js: number, wasm: number | null) => {
    if (wasm === null || wasm === 0) return null;
    const ratio = js / wasm;
    if (ratio < 1) return `${(1 / ratio).toFixed(1)}x slower`;
    return `${ratio.toFixed(1)}x faster`;
  };

  const getSpeedupClass = (js: number, wasm: number | null) => {
    if (wasm === null) return '';
    return js > wasm ? 'faster' : 'slower';
  };

  const getGrade = (ms: number) => {
    if (ms < 16) return 'excellent';
    if (ms < 50) return 'good';
    if (ms < 100) return 'acceptable';
    return 'poor';
  };

  return (
    <div className="benchmark-runner">
      {/* Controls */}
      <div className="benchmark-controls">
        <div className="control-group">
          <label className="control-label">Dataset Size</label>
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
              'Run Benchmark'
            )}
          </button>
        </div>
      </div>

      {/* WASM Status */}
      <div className={`wasm-status ${wasmLoaded ? 'loaded' : wasmLoading ? 'loading' : 'unavailable'}`}>
        {wasmLoading ? (
          'Loading WASM module...'
        ) : wasmLoaded ? (
          <>✓ WASM GridStore active (data lives in WASM memory)</>
        ) : (
          <>⚠ WASM not available - showing JS-only results</>
        )}
      </div>

      {/* Error */}
      {error && <div className="benchmark-error">{error}</div>}

      {/* Results */}
      {results && (
        <div className="benchmark-results">
          <h3>Results for {rowCount.toLocaleString()} rows</h3>

          <div className="results-grid">
            {/* Load */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Initial Load + Index Build</span>
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
                        className={`bar wasm ${getGrade(results.loadWasm)}`}
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.loadWasm / results.loadJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.loadWasm)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">Includes trigram index construction</div>
            </div>

            {/* Filter */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Filter (trigram lookup)</span>
                {results.filterWasm !== null && (
                  <span className={`speedup ${getSpeedupClass(results.filterJs, results.filterWasm)}`}>
                    {getSpeedup(results.filterJs, results.filterWasm)}
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JS (scan)</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.filterJs)}</span>
                </div>
                {results.filterWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM (idx)</span>
                    <div className="bar-container">
                      <div
                        className={`bar wasm ${getGrade(results.filterWasm)}`}
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.filterWasm / results.filterJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.filterWasm)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">O(k) lookup vs O(n) scan</div>
            </div>

            {/* Update */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Batch Update (10% of rows)</span>
                {results.updateWasm !== null && (
                  <span className={`speedup ${getSpeedupClass(results.updateJs, results.updateWasm)}`}>
                    {getSpeedup(results.updateJs, results.updateWasm)}
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.updateJs)}</span>
                </div>
                {results.updateWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className={`bar wasm ${getGrade(results.updateWasm)}`}
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.updateWasm / results.updateJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.updateWasm)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">Incremental index update per row</div>
            </div>
          </div>

          {/* Summary */}
          <div className="results-summary">
            <div className="summary-item">
              <span className="summary-label">Your Browser</span>
              <span className="summary-value">{navigator.userAgent.split(' ').slice(-2).join(' ')}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Rows Tested</span>
              <span className="summary-value">{rowCount.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Architecture</span>
              <span className={`summary-value ${wasmLoaded ? 'success' : 'warning'}`}>
                {wasmLoaded ? 'WASM-First (data in Rust)' : 'JS Fallback'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder when no results */}
      {!results && !running && (
        <div className="benchmark-placeholder">
          <p>Click "Run Benchmark" to test performance on your device</p>
          <p className="placeholder-sub">
            Tests data load, filter, and batch update on {rowCount.toLocaleString()} rows
          </p>
        </div>
      )}
    </div>
  );
}
