import { useState, useCallback, useEffect } from 'react';
import { initWasm, isWasmAvailable, sortValues, filterValues } from '@askturret/grid';

interface BenchmarkResults {
  sortJs: number;
  sortWasm: number | null;
  filterJs: number;
  filterWasm: number | null;
}

// Generate test data once, reuse for both JS and WASM
function generateNumericData(count: number): number[] {
  return Array.from({ length: count }, () => Math.random() * 10000);
}

function generateStringData(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `item-${i % 100}-${i}`);
}

// Pure JS sort (indices sort)
function jsSortIndices(values: number[]): number[] {
  const indices = Array.from({ length: values.length }, (_, i) => i);
  indices.sort((a, b) => values[a] - values[b]);
  return indices;
}

// Pure JS filter
function jsFilterIndices(values: string[], search: string): number[] {
  const searchLower = search.toLowerCase();
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i].toLowerCase().includes(searchLower)) {
      result.push(i);
    }
  }
  return result;
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
        await initWasm();
        setWasmLoaded(isWasmAvailable());
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
      // =====================
      // SORT BENCHMARK
      // =====================
      // Generate numeric data (shared for both tests)
      const numericData = generateNumericData(rowCount);

      // JS Sort
      const sortJsStart = performance.now();
      jsSortIndices(numericData);
      const sortJs = performance.now() - sortJsStart;

      await new Promise((r) => setTimeout(r, 10));

      // WASM Sort (using the library's sortValues which uses WASM internally)
      let sortWasm: number | null = null;
      if (wasmLoaded) {
        const sortWasmStart = performance.now();
        sortValues(numericData, 'asc');
        sortWasm = performance.now() - sortWasmStart;
      }

      await new Promise((r) => setTimeout(r, 10));

      // =====================
      // FILTER BENCHMARK
      // =====================
      // Generate string data (shared for both tests)
      const stringData = generateStringData(rowCount);
      const searchTerm = 'item-50';

      // JS Filter
      const filterJsStart = performance.now();
      jsFilterIndices(stringData, searchTerm);
      const filterJs = performance.now() - filterJsStart;

      await new Promise((r) => setTimeout(r, 10));

      // WASM Filter (using the library's filterValues which uses WASM internally)
      let filterWasm: number | null = null;
      if (wasmLoaded) {
        const filterWasmStart = performance.now();
        filterValues([stringData], searchTerm, 'contains');
        filterWasm = performance.now() - filterWasmStart;
      }

      setResults({
        sortJs,
        sortWasm,
        filterJs,
        filterWasm,
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
                <span className="result-title">Sort (numeric)</span>
                {results.sortWasm !== null && (
                  <span className={`speedup ${getSpeedupClass(results.sortJs, results.sortWasm)}`}>
                    {getSpeedup(results.sortJs, results.sortWasm)}
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div
                      className={`bar js`}
                      style={{ width: '100%' }}
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
                          width: `${Math.min(100, Math.max(5, (results.sortWasm / results.sortJs) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{formatTime(results.sortWasm)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter */}
            <div className="result-card">
              <div className="result-header">
                <span className="result-title">Filter (string search)</span>
                {results.filterWasm !== null && (
                  <span className={`speedup ${getSpeedupClass(results.filterJs, results.filterWasm)}`}>
                    {getSpeedup(results.filterJs, results.filterWasm)}
                  </span>
                )}
              </div>
              <div className="result-bars">
                <div className="bar-row">
                  <span className="bar-label">JavaScript</span>
                  <div className="bar-container">
                    <div
                      className={`bar js`}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <span className="bar-value">{formatTime(results.filterJs)}</span>
                </div>
                {results.filterWasm !== null && (
                  <div className="bar-row">
                    <span className="bar-label">WASM</span>
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
