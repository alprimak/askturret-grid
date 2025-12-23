import { useState, useCallback, useEffect, useRef } from 'react';
import {
  WasmGridStore,
  WorkerGridStore,
  initWasmStore,
  isWasmStoreAvailable,
  type ColumnSchema,
} from '@askturret/grid';

interface BenchmarkResults {
  // Initial load
  loadJs: number;
  loadWasm: number | null;
  loadWorker: number | null;

  // Update throughput (total time for all updates)
  updatesJs: number;
  updatesWasm: number | null;
  updatesWorker: number | null;

  // Main thread blocking (crucial for UX)
  mainThreadBlockJs: number;
  mainThreadBlockWasm: number | null;
  mainThreadBlockWorker: number | null;

  // Updates per second
  throughputJs: number;
  throughputWasm: number | null;
  throughputWorker: number | null;
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
const UPDATE_CYCLES = 100;
const UPDATE_PERCENT = 0.15;

export function BenchmarkRunner() {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmLoading, setWasmLoading] = useState(false);
  const [rowCountIndex, setRowCountIndex] = useState(2);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<BenchmarkResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wasmStoreRef = useRef<WasmGridStore<TestRow> | null>(null);
  const workerStoreRef = useRef<WorkerGridStore<TestRow> | null>(null);

  const rowCount = ROW_COUNTS[rowCountIndex];
  const updatesPerCycle = Math.floor(rowCount * UPDATE_PERCENT);
  const totalUpdates = updatesPerCycle * UPDATE_CYCLES;

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
      workerStoreRef.current?.dispose();
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

      // JS Updates - measure total time and main thread blocking
      const updateJsStart = performance.now();
      let jsMainThreadBlock = 0;

      for (let i = 0; i < UPDATE_CYCLES; i++) {
        const cycleStart = performance.now();
        jsStore.batchUpdate(updateBatches[i]);
        jsStore.getViewCount();
        jsMainThreadBlock += performance.now() - cycleStart;
      }
      const updatesJs = performance.now() - updateJsStart;
      const throughputJs = totalUpdates / (updatesJs / 1000);

      // =====================
      // WASM DIRECT BENCHMARK
      // =====================
      let loadWasm: number | null = null;
      let updatesWasm: number | null = null;
      let wasmMainThreadBlock: number | null = null;
      let throughputWasm: number | null = null;

      if (wasmLoaded) {
        setProgress('Running WASM benchmark...');
        await new Promise((r) => setTimeout(r, 10));

        wasmStoreRef.current?.dispose();
        const store = await WasmGridStore.create<TestRow>(SCHEMA);
        wasmStoreRef.current = store;

        // WASM Load
        const loadWasmStart = performance.now();
        store.loadRows(rows);
        loadWasm = performance.now() - loadWasmStart;

        // WASM Updates
        const updateWasmStart = performance.now();
        wasmMainThreadBlock = 0;

        for (let i = 0; i < UPDATE_CYCLES; i++) {
          const cycleStart = performance.now();
          store.updateRows(updateBatches[i]);
          store.getViewCount();
          wasmMainThreadBlock += performance.now() - cycleStart;

          if (i % 20 === 0) {
            setProgress(`WASM update cycle ${i + 1}/${UPDATE_CYCLES}...`);
            await new Promise((r) => setTimeout(r, 0));
          }
        }
        updatesWasm = performance.now() - updateWasmStart;
        throughputWasm = totalUpdates / (updatesWasm / 1000);
      }

      // =====================
      // WORKER + WASM BENCHMARK
      // =====================
      let loadWorker: number | null = null;
      let updatesWorker: number | null = null;
      let workerMainThreadBlock: number | null = null;
      let throughputWorker: number | null = null;

      if (wasmLoaded) {
        setProgress('Running Worker + WASM benchmark...');
        await new Promise((r) => setTimeout(r, 10));

        workerStoreRef.current?.dispose();

        try {
          const workerStore = await WorkerGridStore.create<TestRow>(SCHEMA, {
            batchInterval: 16, // 60fps batching
          });
          workerStoreRef.current = workerStore;

          // Set viewport (simulate virtualized grid showing 50 rows)
          workerStore.setViewport(0, 50);

          // Worker Load
          const loadWorkerStart = performance.now();
          await workerStore.loadRows(rows);
          loadWorker = performance.now() - loadWorkerStart;

          // Worker Updates - measure main thread time (should be minimal)
          // Updates are queued and processed in worker
          const updateWorkerStart = performance.now();
          workerMainThreadBlock = 0;

          for (let i = 0; i < UPDATE_CYCLES; i++) {
            const cycleStart = performance.now();
            workerStore.queueUpdates(updateBatches[i]); // Non-blocking!
            workerMainThreadBlock += performance.now() - cycleStart;

            if (i % 20 === 0) {
              setProgress(`Worker update cycle ${i + 1}/${UPDATE_CYCLES}...`);
              await new Promise((r) => setTimeout(r, 0));
            }
          }

          // Wait for all updates to process
          await new Promise((r) => setTimeout(r, 200));
          const stats = await workerStore.getStats();

          updatesWorker = performance.now() - updateWorkerStart;
          throughputWorker = stats.processedUpdates / (updatesWorker / 1000);
        } catch (e) {
          console.warn('Worker benchmark failed:', e);
        }
      }

      setResults({
        loadJs,
        loadWasm,
        loadWorker,
        updatesJs,
        updatesWasm,
        updatesWorker,
        mainThreadBlockJs: jsMainThreadBlock,
        mainThreadBlockWasm: wasmMainThreadBlock,
        mainThreadBlockWorker: workerMainThreadBlock,
        throughputJs,
        throughputWasm,
        throughputWorker,
      });
      setProgress('');
    } catch (e) {
      console.error('Benchmark error:', e);
      setError(e instanceof Error ? e.message : 'Benchmark failed');
      setProgress('');
    }

    setRunning(false);
  }, [rowCount, updatesPerCycle, totalUpdates, wasmLoaded]);

  const formatTime = (ms: number) => {
    if (ms < 1) return '<1ms';
    if (ms < 10) return `${ms.toFixed(1)}ms`;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatThroughput = (ups: number) => {
    if (ups >= 1000000) return `${(ups / 1000000).toFixed(1)}M/s`;
    if (ups >= 1000) return `${(ups / 1000).toFixed(0)}K/s`;
    return `${Math.round(ups)}/s`;
  };

  const getSpeedup = (baseline: number, value: number | null) => {
    if (value === null || value === 0 || baseline === 0) return null;
    const ratio = baseline / value;
    if (ratio < 1) return `${(1 / ratio).toFixed(1)}x slower`;
    if (ratio > 1.1) return `${ratio.toFixed(1)}x faster`;
    return 'similar';
  };

  const getSpeedupClass = (baseline: number, value: number | null) => {
    if (value === null) return '';
    return baseline > value ? 'faster' : baseline < value * 0.9 ? 'slower' : 'similar';
  };

  return (
    <div className="benchmark-runner">
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

      <div className={`wasm-status ${wasmLoaded ? 'loaded' : wasmLoading ? 'loading' : 'unavailable'}`}>
        {wasmLoading ? (
          'Loading WASM module...'
        ) : wasmLoaded ? (
          <>✓ WASM + Worker available</>
        ) : (
          <>⚠ WASM not available</>
        )}
      </div>

      {progress && <div className="benchmark-progress">{progress}</div>}
      {error && <div className="benchmark-error">{error}</div>}

      {results && (
        <div className="benchmark-results">
          <h3>Results: {rowCount.toLocaleString()} rows, {totalUpdates.toLocaleString()} updates</h3>

          <div className="results-grid three-col">
            {/* Main Thread Blocking - THE KEY METRIC */}
            <div className="result-card highlight">
              <div className="result-header">
                <span className="result-title">Main Thread Blocking</span>
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.mainThreadBlockJs)}</span>
                </div>
                {results.mainThreadBlockWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className="bar wasm"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.mainThreadBlockWasm / results.mainThreadBlockJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.mainThreadBlockWasm)}</span>
                  </div>
                )}
                {results.mainThreadBlockWorker !== null && (
                  <div className="bar-row">
                    <span className="bar-label">Worker</span>
                    <div className="bar-container">
                      <div
                        className={`bar worker ${getSpeedupClass(results.mainThreadBlockJs, results.mainThreadBlockWorker)}`}
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.mainThreadBlockWorker / results.mainThreadBlockJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className={`bar-value ${getSpeedupClass(results.mainThreadBlockJs, results.mainThreadBlockWorker)}`}>
                      {formatTime(results.mainThreadBlockWorker)}
                    </span>
                  </div>
                )}
              </div>
              <div className="index-note">Lower = smoother UI (target: &lt;16ms per frame)</div>
            </div>

            {/* Throughput */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Update Throughput</span>
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatThroughput(results.throughputJs)}</span>
                </div>
                {results.throughputWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className="bar wasm"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.throughputWasm / results.throughputJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatThroughput(results.throughputWasm)}</span>
                  </div>
                )}
                {results.throughputWorker !== null && (
                  <div className="bar-row">
                    <span className="bar-label">Worker</span>
                    <div className="bar-container">
                      <div
                        className={`bar worker ${getSpeedupClass(results.throughputWorker, results.throughputJs)}`}
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.throughputWorker / results.throughputJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatThroughput(results.throughputWorker)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">Updates processed per second</div>
            </div>

            {/* Initial Load */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Initial Load</span>
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
                          width: `${Math.min(100, Math.max(5, (results.loadWasm / Math.max(results.loadJs, results.loadWasm, results.loadWorker || 0)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.loadWasm)}</span>
                  </div>
                )}
                {results.loadWorker !== null && (
                  <div className="bar-row">
                    <span className="bar-label">Worker</span>
                    <div className="bar-container">
                      <div
                        className="bar worker"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.loadWorker / Math.max(results.loadJs, results.loadWasm || 0, results.loadWorker)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.loadWorker)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">One-time cost at startup</div>
            </div>
          </div>

          <div className="results-summary">
            <div className="summary-item highlight">
              <span className="summary-label">Worker Main Thread</span>
              <span className="summary-value success">
                {results.mainThreadBlockWorker !== null
                  ? getSpeedup(results.mainThreadBlockJs, results.mainThreadBlockWorker)
                  : 'N/A'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Scenario</span>
              <span className="summary-value">{UPDATE_CYCLES} cycles @ {UPDATE_PERCENT * 100}% updates</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Updates</span>
              <span className="summary-value">{totalUpdates.toLocaleString()}</span>
            </div>
          </div>

          <div className="benchmark-explanation">
            <p><strong>Why Worker wins:</strong> Updates are queued instantly (non-blocking), then processed in a background thread. Main thread stays free for smooth 60fps rendering.</p>
          </div>
        </div>
      )}

      {!results && !running && (
        <div className="benchmark-placeholder">
          <p>Compares three approaches:</p>
          <ul className="scenario-list">
            <li><strong>JavaScript</strong> - Pure JS, main thread</li>
            <li><strong>WASM</strong> - Rust/WASM, main thread</li>
            <li><strong>Worker + WASM</strong> - Rust/WASM in Web Worker (non-blocking)</li>
          </ul>
          <p className="key-metric">Key metric: <strong>Main Thread Blocking</strong> - how much the UI freezes</p>
        </div>
      )}
    </div>
  );
}
