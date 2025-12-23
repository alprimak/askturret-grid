import { useState, useCallback, useEffect, useRef } from 'react';
import {
  WasmGridStore,
  WorkerGridStore,
  initWasmStore,
  isWasmStoreAvailable,
  type ColumnSchema,
} from '@askturret/grid';

interface BenchmarkResults {
  // Per-update call latency (how long main thread blocks per update)
  avgLatencyJs: number;
  avgLatencyWasm: number | null;
  avgLatencyWorker: number | null;

  // Total main thread blocking over simulation
  totalBlockJs: number;
  totalBlockWasm: number | null;
  totalBlockWorker: number | null;

  // Frame budget (% of 16ms used per frame)
  frameBudgetJs: number;
  frameBudgetWasm: number | null;
  frameBudgetWorker: number | null;

  // Initial load
  loadJs: number;
  loadWasm: number | null;
  loadWorker: number | null;
}

interface TestRow {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  change: number;
  volume: number;
}

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM', 'V',
                 'MA', 'UNH', 'HD', 'PG', 'DIS', 'NFLX', 'ADBE', 'CRM', 'PYPL', 'INTC'];

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

function generateSmallBatch(batchSize: number, totalRows: number): { id: string; price: number; change: number }[] {
  const updates: { id: string; price: number; change: number }[] = [];
  const indices = new Set<number>();

  while (indices.size < batchSize) {
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

// Realistic trading scenario parameters
const SIMULATION_FRAMES = 60; // 1 second at 60fps
const UPDATES_PER_FRAME = 200; // ~200 price updates per 16ms tick (realistic for active market)
const FRAME_BUDGET_MS = 16; // Target frame time for 60fps

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
  const totalUpdates = SIMULATION_FRAMES * UPDATES_PER_FRAME;

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

      // Pre-generate all update batches (small, realistic batches)
      setProgress('Pre-generating update batches...');
      await new Promise((r) => setTimeout(r, 10));

      const updateBatches = Array.from({ length: SIMULATION_FRAMES }, () =>
        generateSmallBatch(UPDATES_PER_FRAME, rowCount)
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

      // JS Updates - measure per-frame latency
      const jsLatencies: number[] = [];
      for (let i = 0; i < SIMULATION_FRAMES; i++) {
        const frameStart = performance.now();
        jsStore.batchUpdate(updateBatches[i]);
        jsStore.getViewCount(); // Simulate render check
        jsLatencies.push(performance.now() - frameStart);
      }
      const totalBlockJs = jsLatencies.reduce((a, b) => a + b, 0);
      const avgLatencyJs = totalBlockJs / SIMULATION_FRAMES;
      const frameBudgetJs = (avgLatencyJs / FRAME_BUDGET_MS) * 100;

      // =====================
      // WASM DIRECT BENCHMARK
      // =====================
      let loadWasm: number | null = null;
      let avgLatencyWasm: number | null = null;
      let totalBlockWasm: number | null = null;
      let frameBudgetWasm: number | null = null;

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
        const wasmLatencies: number[] = [];
        for (let i = 0; i < SIMULATION_FRAMES; i++) {
          const frameStart = performance.now();
          store.updateRows(updateBatches[i]);
          store.getViewCount();
          wasmLatencies.push(performance.now() - frameStart);

          if (i % 10 === 0) {
            setProgress(`WASM frame ${i + 1}/${SIMULATION_FRAMES}...`);
            await new Promise((r) => setTimeout(r, 0));
          }
        }
        totalBlockWasm = wasmLatencies.reduce((a, b) => a + b, 0);
        avgLatencyWasm = totalBlockWasm / SIMULATION_FRAMES;
        frameBudgetWasm = (avgLatencyWasm / FRAME_BUDGET_MS) * 100;
      }

      // =====================
      // WORKER + JS BENCHMARK
      // =====================
      let loadWorker: number | null = null;
      let avgLatencyWorker: number | null = null;
      let totalBlockWorker: number | null = null;
      let frameBudgetWorker: number | null = null;

      setProgress('Running Worker benchmark...');
      await new Promise((r) => setTimeout(r, 10));

      workerStoreRef.current?.dispose();

      try {
        const workerStore = await WorkerGridStore.create<TestRow>(SCHEMA, {
          batchInterval: 16,
        });
        workerStoreRef.current = workerStore;

        // Set viewport
        workerStore.setViewport(0, 50);

        // Worker Load
        const loadWorkerStart = performance.now();
        await workerStore.loadRows(rows);
        loadWorker = performance.now() - loadWorkerStart;

        // Worker Updates - measure how fast queueUpdates returns (non-blocking)
        const workerLatencies: number[] = [];
        for (let i = 0; i < SIMULATION_FRAMES; i++) {
          const frameStart = performance.now();
          workerStore.queueUpdates(updateBatches[i]); // Should return instantly
          workerLatencies.push(performance.now() - frameStart);
        }

        // Wait for processing to complete
        await new Promise((r) => setTimeout(r, 100));

        totalBlockWorker = workerLatencies.reduce((a, b) => a + b, 0);
        avgLatencyWorker = totalBlockWorker / SIMULATION_FRAMES;
        frameBudgetWorker = (avgLatencyWorker / FRAME_BUDGET_MS) * 100;
      } catch (e) {
        console.warn('Worker benchmark failed:', e);
      }

      setResults({
        avgLatencyJs,
        avgLatencyWasm,
        avgLatencyWorker,
        totalBlockJs,
        totalBlockWasm,
        totalBlockWorker,
        frameBudgetJs,
        frameBudgetWasm,
        frameBudgetWorker,
        loadJs,
        loadWasm,
        loadWorker,
      });
      setProgress('');
    } catch (e) {
      console.error('Benchmark error:', e);
      setError(e instanceof Error ? e.message : 'Benchmark failed');
      setProgress('');
    }

    setRunning(false);
  }, [rowCount, wasmLoaded]);

  const formatTime = (ms: number) => {
    if (ms < 0.01) return '<0.01ms';
    if (ms < 0.1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 10) return `${ms.toFixed(1)}ms`;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercent = (pct: number) => {
    if (pct < 1) return '<1%';
    if (pct > 100) return `${Math.round(pct)}%`;
    return `${Math.round(pct)}%`;
  };

  const getSpeedup = (baseline: number, value: number | null) => {
    if (value === null || value === 0 || baseline === 0) return null;
    const ratio = baseline / value;
    if (ratio < 1) return `${(1 / ratio).toFixed(1)}x slower`;
    if (ratio > 100) return `${Math.round(ratio)}x faster`;
    if (ratio > 1.1) return `${ratio.toFixed(1)}x faster`;
    return 'similar';
  };

  const getBudgetClass = (pct: number | null) => {
    if (pct === null) return '';
    if (pct <= 20) return 'excellent';
    if (pct <= 50) return 'good';
    if (pct <= 100) return 'warning';
    return 'bad';
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
              'Run Benchmark'
            )}
          </button>
        </div>
      </div>

      <div className={`wasm-status ${wasmLoaded ? 'loaded' : wasmLoading ? 'loading' : 'unavailable'}`}>
        {wasmLoading ? (
          'Loading WASM module...'
        ) : wasmLoaded ? (
          <>✓ WASM + Worker ready</>
        ) : (
          <>⚠ WASM not available (Worker still works)</>
        )}
      </div>

      {progress && <div className="benchmark-progress">{progress}</div>}
      {error && <div className="benchmark-error">{error}</div>}

      {results && (
        <div className="benchmark-results">
          <h3>Trading Simulation: {rowCount.toLocaleString()} instruments</h3>
          <p className="scenario-desc">
            {SIMULATION_FRAMES} frames × {UPDATES_PER_FRAME} updates = {totalUpdates.toLocaleString()} price ticks (1 second @ 60fps)
          </p>

          <div className="results-grid three-col">
            {/* Per-Frame Latency - THE KEY METRIC */}
            <div className="result-card highlight">
              <div className="result-header">
                <span className="result-title">Per-Frame Latency</span>
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.avgLatencyJs)}</span>
                </div>
                {results.avgLatencyWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className="bar wasm"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.avgLatencyWasm / Math.max(results.avgLatencyJs, results.avgLatencyWasm)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.avgLatencyWasm)}</span>
                  </div>
                )}
                {results.avgLatencyWorker !== null && (
                  <div className="bar-row">
                    <span className="bar-label">Worker</span>
                    <div className="bar-container">
                      <div
                        className="bar worker faster"
                        style={{
                          width: `${Math.min(100, Math.max(2, (results.avgLatencyWorker / results.avgLatencyJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value success">{formatTime(results.avgLatencyWorker)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">Time main thread blocks per frame</div>
            </div>

            {/* Frame Budget Usage */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Frame Budget (16ms)</span>
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div
                      className={`bar js ${getBudgetClass(results.frameBudgetJs)}`}
                      style={{ width: `${Math.min(100, results.frameBudgetJs)}%` }}
                    />
                  </div>
                  <span className={`bar-value ${getBudgetClass(results.frameBudgetJs)}`}>
                    {formatPercent(results.frameBudgetJs)}
                  </span>
                </div>
                {results.frameBudgetWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className={`bar wasm ${getBudgetClass(results.frameBudgetWasm)}`}
                        style={{ width: `${Math.min(100, results.frameBudgetWasm)}%` }}
                      />
                    </div>
                    <span className={`bar-value ${getBudgetClass(results.frameBudgetWasm)}`}>
                      {formatPercent(results.frameBudgetWasm)}
                    </span>
                  </div>
                )}
                {results.frameBudgetWorker !== null && (
                  <div className="bar-row">
                    <span className="bar-label">Worker</span>
                    <div className="bar-container">
                      <div
                        className={`bar worker ${getBudgetClass(results.frameBudgetWorker)}`}
                        style={{ width: `${Math.min(100, Math.max(2, results.frameBudgetWorker))}%` }}
                      />
                    </div>
                    <span className={`bar-value ${getBudgetClass(results.frameBudgetWorker)}`}>
                      {formatPercent(results.frameBudgetWorker)}
                    </span>
                  </div>
                )}
              </div>
              <div className="index-note">&lt;50% = smooth 60fps</div>
            </div>

            {/* Total Blocking */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Total Main Thread Block</span>
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className="bar js" style={{ width: '100%' }} />
                  </div>
                  <span className="bar-value">{formatTime(results.totalBlockJs)}</span>
                </div>
                {results.totalBlockWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className="bar wasm"
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.totalBlockWasm / Math.max(results.totalBlockJs, results.totalBlockWasm)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.totalBlockWasm)}</span>
                  </div>
                )}
                {results.totalBlockWorker !== null && (
                  <div className="bar-row">
                    <span className="bar-label">Worker</span>
                    <div className="bar-container">
                      <div
                        className="bar worker faster"
                        style={{
                          width: `${Math.min(100, Math.max(2, (results.totalBlockWorker / results.totalBlockJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value success">{formatTime(results.totalBlockWorker)}</span>
                  </div>
                )}
              </div>
              <div className="index-note">Over 1 second simulation</div>
            </div>
          </div>

          <div className="results-summary">
            <div className="summary-item highlight">
              <span className="summary-label">Worker Speedup</span>
              <span className="summary-value success">
                {results.avgLatencyWorker !== null
                  ? getSpeedup(results.avgLatencyJs, results.avgLatencyWorker)
                  : 'N/A'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Updates/Frame</span>
              <span className="summary-value">{UPDATES_PER_FRAME}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Updates</span>
              <span className="summary-value">{totalUpdates.toLocaleString()}</span>
            </div>
          </div>

          <div className="benchmark-explanation">
            <p><strong>Why Worker wins:</strong> <code>queueUpdates()</code> returns instantly (~0.1ms). Processing happens in background thread. Main thread stays free for smooth 60fps animations.</p>
          </div>
        </div>
      )}

      {!results && !running && (
        <div className="benchmark-placeholder">
          <p>Simulates realistic trading data feed:</p>
          <ul className="scenario-list">
            <li><strong>{UPDATES_PER_FRAME} updates</strong> per 16ms frame (active market)</li>
            <li><strong>{SIMULATION_FRAMES} frames</strong> = 1 second @ 60fps</li>
            <li><strong>{(SIMULATION_FRAMES * UPDATES_PER_FRAME).toLocaleString()} total</strong> price updates</li>
          </ul>
          <p className="key-metric">Key metric: <strong>Per-Frame Latency</strong> — must be &lt;16ms for 60fps</p>
        </div>
      )}
    </div>
  );
}
