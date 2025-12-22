import { useState, useCallback, useEffect } from 'react';
import {
  initGridCore,
  isGridCoreAvailable,
  benchSortOnly,
  benchIndexedFilterOnly,
  benchScanFilter,
} from '@askturret/grid';

interface BenchmarkResults {
  sortJs: number;
  sortWasm: number | null;
  filterScanJs: number;
  filterScanWasm: number | null;
  filterIndexedJs: number;
  filterIndexedWasm: number | null;
}

// Pure JS benchmarks
function jsBenchSort(count: number): number {
  const values = Array.from({ length: count }, () => Math.random() * 1000);
  const indices = Array.from({ length: count }, (_, i) => i);
  const start = performance.now();
  indices.sort((a, b) => values[a] - values[b]);
  return performance.now() - start;
}

function jsBenchScanFilter(count: number): number {
  const strings = Array.from({ length: count }, (_, i) => `item-${i % 100}-${i}`);
  const start = performance.now();
  const search = 'item-50';
  const filtered = [];
  for (let i = 0; i < count; i++) {
    if (strings[i].includes(search)) {
      filtered.push(i);
    }
  }
  return performance.now() - start;
}

function jsBenchIndexedFilter(count: number): number {
  const strings = Array.from({ length: count }, (_, i) => `item-${i % 100}-${i}`);

  // Build trigram index
  const index = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const str = strings[i];
    for (let j = 0; j <= str.length - 3; j++) {
      const trigram = str.substring(j, j + 3);
      if (!index.has(trigram)) {
        index.set(trigram, []);
      }
      index.get(trigram)!.push(i);
    }
  }

  // Filter using index
  const filterStart = performance.now();
  const search = 'item-50';
  const searchTrigrams: string[] = [];
  for (let j = 0; j <= search.length - 3; j++) {
    searchTrigrams.push(search.substring(j, j + 3));
  }

  let candidates: Set<number> | null = null;
  for (const trigram of searchTrigrams) {
    const rows = index.get(trigram);
    if (!rows) {
      candidates = new Set();
      break;
    }
    if (candidates === null) {
      candidates = new Set(rows);
    } else {
      const newCandidates = new Set<number>();
      for (const r of rows) {
        if (candidates.has(r)) newCandidates.add(r);
      }
      candidates = newCandidates;
    }
  }

  // Verify candidates
  const results: number[] = [];
  if (candidates) {
    for (const row of candidates) {
      if (strings[row].includes(search)) {
        results.push(row);
      }
    }
  }

  return performance.now() - filterStart;
}

const ROW_COUNTS = [10000, 100000, 500000, 1000000];
const ROW_LABELS = ['10k', '100k', '500k', '1M'];

export function BenchmarkRunner() {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmLoading, setWasmLoading] = useState(false);
  const [rowCountIndex, setRowCountIndex] = useState(1); // Default 100k
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rowCount = ROW_COUNTS[rowCountIndex];

  // Load WASM on mount
  useEffect(() => {
    async function load() {
      setWasmLoading(true);
      try {
        await initGridCore();
        setWasmLoaded(isGridCoreAvailable());
      } catch (e) {
        console.warn('WASM not available:', e);
      }
      setWasmLoading(false);
    }
    load();
  }, []);

  const runBenchmarks = useCallback(async () => {
    setRunning(true);
    setResults(null);
    setError(null);

    // Let UI update
    await new Promise((r) => setTimeout(r, 50));

    try {
      // Run JS benchmarks
      const sortJs = jsBenchSort(rowCount);
      await new Promise((r) => setTimeout(r, 10));

      const filterScanJs = jsBenchScanFilter(rowCount);
      await new Promise((r) => setTimeout(r, 10));

      const filterIndexedJs = jsBenchIndexedFilter(rowCount);
      await new Promise((r) => setTimeout(r, 10));

      // Run WASM benchmarks if available
      let sortWasm: number | null = null;
      let filterScanWasm: number | null = null;
      let filterIndexedWasm: number | null = null;

      if (wasmLoaded) {
        sortWasm = benchSortOnly(rowCount);
        await new Promise((r) => setTimeout(r, 10));

        filterScanWasm = benchScanFilter(rowCount);
        await new Promise((r) => setTimeout(r, 10));

        filterIndexedWasm = benchIndexedFilterOnly(rowCount);
      }

      setResults({
        sortJs,
        sortWasm,
        filterScanJs,
        filterScanWasm,
        filterIndexedJs,
        filterIndexedWasm,
      });
    } catch (e) {
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
    if (wasm === null) return null;
    return (js / wasm).toFixed(1);
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
          <>✓ WASM acceleration active</>
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
            {/* Sort */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Sort</span>
                {results.sortWasm && (
                  <span className="speedup">{getSpeedup(results.sortJs, results.sortWasm)}x faster</span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div
                      className={`bar js ${getGrade(results.sortJs)}`}
                      style={{
                        width: `${Math.min(100, (results.sortJs / Math.max(results.sortJs, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="bar-value">{formatTime(results.sortJs)}</span>
                </div>
                {results.sortWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className={`bar wasm ${getGrade(results.sortWasm)}`}
                        style={{
                          width: `${Math.min(100, (results.sortWasm / results.sortJs) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.sortWasm)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter (Scan) */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Filter (Linear Scan)</span>
                {results.filterScanWasm && (
                  <span className="speedup">
                    {getSpeedup(results.filterScanJs, results.filterScanWasm)}x faster
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div
                      className={`bar js ${getGrade(results.filterScanJs)}`}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <span className="bar-value">{formatTime(results.filterScanJs)}</span>
                </div>
                {results.filterScanWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className={`bar wasm ${getGrade(results.filterScanWasm)}`}
                        style={{
                          width: `${Math.min(100, (results.filterScanWasm / results.filterScanJs) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.filterScanWasm)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter (Indexed) */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Filter (Trigram Index)</span>
                {results.filterIndexedWasm && (
                  <span className="speedup">
                    {getSpeedup(results.filterIndexedJs, results.filterIndexedWasm)}x faster
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div
                      className={`bar js ${getGrade(results.filterIndexedJs)}`}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <span className="bar-value">{formatTime(results.filterIndexedJs)}</span>
                </div>
                {results.filterIndexedWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
                    <div className="bar-container">
                      <div
                        className={`bar wasm ${getGrade(results.filterIndexedWasm)}`}
                        style={{
                          width: `${Math.min(100, (results.filterIndexedWasm / results.filterIndexedJs) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.filterIndexedWasm)}</span>
                  </div>
                )}
              </div>
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
              <span className="summary-label">WASM Status</span>
              <span className={`summary-value ${wasmLoaded ? 'success' : 'warning'}`}>
                {wasmLoaded ? 'Active' : 'Fallback to JS'}
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
            Tests sorting and filtering on {rowCount.toLocaleString()} rows
          </p>
        </div>
      )}
    </div>
  );
}
