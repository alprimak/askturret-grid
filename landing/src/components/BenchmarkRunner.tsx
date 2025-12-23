import { useState, useCallback, useEffect, useRef } from 'react';
import {
  WasmGridStore,
  WorkerGridStore,
  initWasmStore,
  isWasmStoreAvailable,
  type ColumnSchema,
} from '@askturret/grid';

// Benchmark patterns
type BenchmarkPattern = 'realtime' | 'batch' | 'filter' | 'mixed';

interface PatternConfig {
  name: string;
  description: string;
  updatesPerFrame: number;
  frames: number;
  filterDuring: boolean;
  batchMode: boolean;
}

const PATTERNS: Record<BenchmarkPattern, PatternConfig> = {
  realtime: {
    name: 'Real-time Streaming',
    description: '200 updates every 16ms — live market data',
    updatesPerFrame: 200,
    frames: 60,
    filterDuring: false,
    batchMode: false,
  },
  batch: {
    name: 'Large Batch',
    description: '10,000 updates at once — bulk data load',
    updatesPerFrame: 10000,
    frames: 10,
    filterDuring: false,
    batchMode: true,
  },
  filter: {
    name: 'Filter + Updates',
    description: 'Active filter while data streams — search while trading',
    updatesPerFrame: 200,
    frames: 60,
    filterDuring: true,
    batchMode: false,
  },
  mixed: {
    name: 'Mixed Workload',
    description: 'Varied batch sizes — realistic trading session',
    updatesPerFrame: 500,
    frames: 40,
    filterDuring: false,
    batchMode: false,
  },
};

interface BenchmarkResults {
  pattern: BenchmarkPattern;
  avgLatencyJs: number;
  avgLatencyWasm: number | null;
  avgLatencyWorker: number | null;
  totalBlockJs: number;
  totalBlockWasm: number | null;
  totalBlockWorker: number | null;
  frameBudgetJs: number;
  frameBudgetWasm: number | null;
  frameBudgetWorker: number | null;
  loadJs: number;
  loadWasm: number | null;
  loadWorker: number | null;
  winner: 'js' | 'wasm' | 'worker';
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

function generateBatch(batchSize: number, totalRows: number): { id: string; price: number; change: number }[] {
  const updates: { id: string; price: number; change: number }[] = [];
  const indices = new Set<number>();

  while (indices.size < Math.min(batchSize, totalRows)) {
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
const FRAME_BUDGET_MS = 16;

export function BenchmarkRunner() {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmLoading, setWasmLoading] = useState(false);
  const [rowCountIndex, setRowCountIndex] = useState(2);
  const [pattern, setPattern] = useState<BenchmarkPattern>('realtime');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<BenchmarkResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wasmStoreRef = useRef<WasmGridStore<TestRow> | null>(null);
  const workerStoreRef = useRef<WorkerGridStore<TestRow> | null>(null);

  const rowCount = ROW_COUNTS[rowCountIndex];
  const patternConfig = PATTERNS[pattern];
  const totalUpdates = patternConfig.updatesPerFrame * patternConfig.frames;

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
      const config = PATTERNS[pattern];
      const rows = generateRows(rowCount);

      // Pre-generate update batches
      setProgress('Pre-generating update batches...');
      await new Promise((r) => setTimeout(r, 10));

      const updateBatches = Array.from({ length: config.frames }, () =>
        generateBatch(config.updatesPerFrame, rowCount)
      );

      // =====================
      // JAVASCRIPT BENCHMARK
      // =====================
      setProgress('Running JavaScript benchmark...');
      await new Promise((r) => setTimeout(r, 10));

      const jsStore = new JsGridStore();

      const loadJsStart = performance.now();
      jsStore.loadRows(rows);
      const loadJs = performance.now() - loadJsStart;

      if (config.filterDuring) {
        jsStore.setFilter('AAPL');
      }

      const jsLatencies: number[] = [];
      for (let i = 0; i < config.frames; i++) {
        const frameStart = performance.now();
        jsStore.batchUpdate(updateBatches[i]);
        jsStore.getViewCount();
        jsLatencies.push(performance.now() - frameStart);
      }
      const totalBlockJs = jsLatencies.reduce((a, b) => a + b, 0);
      const avgLatencyJs = totalBlockJs / config.frames;
      const frameBudgetJs = (avgLatencyJs / FRAME_BUDGET_MS) * 100;

      if (config.filterDuring) {
        jsStore.clearFilter();
      }

      // =====================
      // WASM BENCHMARK
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

        const loadWasmStart = performance.now();
        store.loadRows(rows);
        loadWasm = performance.now() - loadWasmStart;

        if (config.filterDuring) {
          store.setFilter('AAPL');
        }

        const wasmLatencies: number[] = [];
        for (let i = 0; i < config.frames; i++) {
          const frameStart = performance.now();
          store.updateRows(updateBatches[i]);
          store.getViewCount();
          wasmLatencies.push(performance.now() - frameStart);

          if (i % 10 === 0) {
            setProgress(`WASM frame ${i + 1}/${config.frames}...`);
            await new Promise((r) => setTimeout(r, 0));
          }
        }
        totalBlockWasm = wasmLatencies.reduce((a, b) => a + b, 0);
        avgLatencyWasm = totalBlockWasm / config.frames;
        frameBudgetWasm = (avgLatencyWasm / FRAME_BUDGET_MS) * 100;

        if (config.filterDuring) {
          store.clearFilter();
        }
      }

      // =====================
      // WORKER BENCHMARK
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
        workerStore.setViewport(0, 50);

        const loadWorkerStart = performance.now();
        await workerStore.loadRows(rows);
        loadWorker = performance.now() - loadWorkerStart;

        if (config.filterDuring) {
          workerStore.setFilter('AAPL');
        }

        const workerLatencies: number[] = [];
        for (let i = 0; i < config.frames; i++) {
          const frameStart = performance.now();
          workerStore.queueUpdates(updateBatches[i]);
          workerLatencies.push(performance.now() - frameStart);
        }

        await new Promise((r) => setTimeout(r, 200));

        totalBlockWorker = workerLatencies.reduce((a, b) => a + b, 0);
        avgLatencyWorker = totalBlockWorker / config.frames;
        frameBudgetWorker = (avgLatencyWorker / FRAME_BUDGET_MS) * 100;

        if (config.filterDuring) {
          workerStore.clearFilter();
        }
      } catch (e) {
        console.warn('Worker benchmark failed:', e);
      }

      // Determine winner
      const times = [
        { name: 'js' as const, time: avgLatencyJs },
        { name: 'wasm' as const, time: avgLatencyWasm ?? Infinity },
        { name: 'worker' as const, time: avgLatencyWorker ?? Infinity },
      ];
      const winner = times.reduce((a, b) => (a.time < b.time ? a : b)).name;

      setResults({
        pattern,
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
        winner,
      });
      setProgress('');
    } catch (e) {
      console.error('Benchmark error:', e);
      setError(e instanceof Error ? e.message : 'Benchmark failed');
      setProgress('');
    }

    setRunning(false);
  }, [rowCount, pattern, wasmLoaded]);

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

  const getWinnerLabel = (type: 'js' | 'wasm' | 'worker') => {
    if (type === 'js') return 'JavaScript';
    if (type === 'wasm') return 'WasmGridStore';
    return 'WorkerGridStore';
  };

  const getRecommendation = (winner: 'js' | 'wasm' | 'worker', pattern: BenchmarkPattern) => {
    if (winner === 'worker') {
      return 'Use WorkerGridStore (default) for best UI responsiveness';
    }
    if (winner === 'wasm') {
      return 'Consider WasmGridStore for heavy filtering workloads';
    }
    return 'JavaScript baseline is sufficient for this workload';
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
          <label className="control-label">Update Pattern</label>
          <div className="pattern-selector">
            {(Object.keys(PATTERNS) as BenchmarkPattern[]).map((p) => (
              <button
                key={p}
                className={`pattern-btn ${pattern === p ? 'active' : ''}`}
                onClick={() => setPattern(p)}
                disabled={running}
                title={PATTERNS[p].description}
              >
                {PATTERNS[p].name}
              </button>
            ))}
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

      <div className="pattern-description">
        <strong>{patternConfig.name}:</strong> {patternConfig.description}
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
          <h3>{PATTERNS[results.pattern].name}: {rowCount.toLocaleString()} instruments</h3>
          <p className="scenario-desc">
            {patternConfig.frames} frames × {patternConfig.updatesPerFrame.toLocaleString()} updates = {totalUpdates.toLocaleString()} total
            {patternConfig.filterDuring && ' (with active filter)'}
          </p>

          <div className="results-grid three-col">
            {/* Per-Frame Latency */}
            <div className="result-card highlight">
              <div className="result-header">
                <span className="result-title">Per-Frame Latency</span>
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div className={`bar js ${results.winner === 'js' ? 'winner' : ''}`} style={{ width: '100%' }} />
                  </div>
                  <span className={`bar-value ${results.winner === 'js' ? 'success' : ''}`}>
                    {formatTime(results.avgLatencyJs)}
                  </span>
                </div>
                {results.avgLatencyWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className={`bar wasm ${results.winner === 'wasm' ? 'winner' : ''}`}
                        style={{
                          width: `${Math.min(100, Math.max(5, (results.avgLatencyWasm / Math.max(results.avgLatencyJs, results.avgLatencyWasm)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className={`bar-value ${results.winner === 'wasm' ? 'success' : ''}`}>
                      {formatTime(results.avgLatencyWasm)}
                    </span>
                  </div>
                )}
                {results.avgLatencyWorker !== null && (
                  <div className="bar-row">
                    <span className="bar-label">Worker</span>
                    <div className="bar-container">
                      <div
                        className={`bar worker ${results.winner === 'worker' ? 'winner' : ''}`}
                        style={{
                          width: `${Math.min(100, Math.max(2, (results.avgLatencyWorker / results.avgLatencyJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className={`bar-value ${results.winner === 'worker' ? 'success' : ''}`}>
                      {formatTime(results.avgLatencyWorker)}
                    </span>
                  </div>
                )}
              </div>
              <div className="index-note">Time main thread blocks per frame</div>
            </div>

            {/* Frame Budget */}
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
              <div className="index-note">Over full simulation</div>
            </div>
          </div>

          <div className="results-summary">
            <div className="summary-item highlight">
              <span className="summary-label">Winner</span>
              <span className="summary-value success">{getWinnerLabel(results.winner)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Worker Speedup</span>
              <span className="summary-value">
                {results.avgLatencyWorker !== null
                  ? getSpeedup(results.avgLatencyJs, results.avgLatencyWorker)
                  : 'N/A'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Updates</span>
              <span className="summary-value">{totalUpdates.toLocaleString()}</span>
            </div>
          </div>

          <div className="benchmark-recommendation">
            <strong>Recommendation:</strong> {getRecommendation(results.winner, results.pattern)}
          </div>
        </div>
      )}

      {!results && !running && (
        <div className="benchmark-placeholder">
          <p>Test different update patterns to find the best configuration:</p>
          <ul className="scenario-list">
            <li><strong>Real-time Streaming</strong> — WorkerGridStore excels</li>
            <li><strong>Large Batch</strong> — Compare bulk load performance</li>
            <li><strong>Filter + Updates</strong> — Test trigram index benefit</li>
            <li><strong>Mixed Workload</strong> — Realistic trading session</li>
          </ul>
          <p className="key-metric">Select a pattern and click <strong>Run Benchmark</strong></p>
        </div>
      )}
    </div>
  );
}