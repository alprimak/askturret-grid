import { useState, useCallback } from 'react';
import {
  initGridCore,
  isGridCoreAvailable,
  benchSortOnly,
  benchIndexedFilterOnly,
  benchScanFilter,
  benchRepeatedFilter,
} from '@askturret/grid';

interface BenchmarkResult {
  name: string;
  jsTime: number;
  wasmTime: number | null;
  speedup: string;
  rowCount: number;
}

// Pure JS benchmarks for comparison
function jsBenchSort(count: number): number {
  const values = Array.from({ length: count }, () => Math.random() * 1000);
  const indices = Array.from({ length: count }, (_, i) => i);

  const start = performance.now();
  indices.sort((a, b) => values[a] - values[b]);
  return performance.now() - start;
}

function jsBenchFilter(count: number): number {
  // Generate data
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

// JS repeated filter (simulates user typing)
function jsBenchRepeatedFilter(count: number, iterations: number): number {
  const strings = Array.from({ length: count }, (_, i) => `item-${i % 100}-${i}`);

  // Build trigram index once
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

  // Simulate typing "item-50" one character at a time
  const queries = ['i', 'it', 'ite', 'item', 'item-', 'item-5', 'item-50'];

  const start = performance.now();
  for (let iter = 0; iter < iterations; iter++) {
    for (const search of queries) {
      // Build search trigrams
      const searchTrigrams: string[] = [];
      for (let j = 0; j <= search.length - 3; j++) {
        searchTrigrams.push(search.substring(j, j + 3));
      }

      let candidates: Set<number> | null = null;
      if (searchTrigrams.length === 0) {
        // Fall back to scan for short queries
        const results: number[] = [];
        for (let i = 0; i < count; i++) {
          if (strings[i].includes(search)) {
            results.push(i);
          }
        }
      } else {
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
      }
    }
  }
  return performance.now() - start;
}

// JS indexed filter using Map
function jsBenchIndexedFilter(count: number): { buildTime: number; filterTime: number } {
  const strings = Array.from({ length: count }, (_, i) => `item-${i % 100}-${i}`);

  // Build trigram index
  const buildStart = performance.now();
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
  const buildTime = performance.now() - buildStart;

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
  const filterTime = performance.now() - filterStart;

  return { buildTime, filterTime };
}

export function BenchmarkDemo() {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);

  const loadWasm = useCallback(async () => {
    setLoading(true);
    try {
      await initGridCore();
      setWasmLoaded(isGridCoreAvailable());
    } catch (e) {
      console.error('Failed to load WASM:', e);
    }
    setLoading(false);
  }, []);

  const runBenchmarks = useCallback(async () => {
    setRunning(true);
    setResults([]);

    const rowCounts = [100000, 500000, 1000000];
    const newResults: BenchmarkResult[] = [];

    for (const count of rowCounts) {
      // ==========================================
      // Sort benchmark
      // ==========================================
      const jsSort = jsBenchSort(count);
      const wasmSort = wasmLoaded ? benchSortOnly(count) : null;

      newResults.push({
        name: 'Sort (numbers)',
        jsTime: jsSort,
        wasmTime: wasmSort,
        speedup: wasmSort ? `${(jsSort / wasmSort).toFixed(2)}x` : 'N/A',
        rowCount: count,
      });

      // ==========================================
      // Linear scan filter (baseline)
      // ==========================================
      const jsScan = jsBenchFilter(count);
      const wasmScan = wasmLoaded ? benchScanFilter(count) : null;

      newResults.push({
        name: 'Filter (scan)',
        jsTime: jsScan,
        wasmTime: wasmScan,
        speedup: wasmScan ? `${(jsScan / wasmScan).toFixed(2)}x` : 'N/A',
        rowCount: count,
      });

      // ==========================================
      // Indexed filter (the interesting one!)
      // ==========================================
      const jsIndexed = jsBenchIndexedFilter(count);
      const wasmIndexed = wasmLoaded ? benchIndexedFilterOnly(count) : null;

      newResults.push({
        name: 'Filter (indexed)',
        jsTime: jsIndexed.filterTime,
        wasmTime: wasmIndexed,
        speedup: wasmIndexed ? `${(jsIndexed.filterTime / wasmIndexed).toFixed(2)}x` : 'N/A',
        rowCount: count,
      });

      // ==========================================
      // Repeated filter (simulates user typing)
      // ==========================================
      const iterations = 10;
      const jsRepeated = jsBenchRepeatedFilter(count, iterations);
      const wasmRepeated = wasmLoaded ? benchRepeatedFilter(count, iterations) : null;

      newResults.push({
        name: `Filter (${iterations}x typing)`,
        jsTime: jsRepeated,
        wasmTime: wasmRepeated,
        speedup: wasmRepeated ? `${(jsRepeated / wasmRepeated).toFixed(2)}x` : 'N/A',
        rowCount: count,
      });

      await new Promise((r) => setTimeout(r, 10));
    }

    setResults(newResults);
    setRunning(false);
  }, [wasmLoaded]);

  return (
    <div className="demo-section">
      <h2>WASM Performance Benchmarks</h2>
      <p>
        Comparing sort, linear scan filter, and <strong>trigram-indexed filter</strong>. Index allows O(1)
        lookup instead of O(n) scan.
      </p>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={loadWasm} disabled={loading || wasmLoaded}>
          {loading ? 'Loading...' : wasmLoaded ? '✓ WASM Loaded' : 'Load WASM Module'}
        </button>
        <button onClick={runBenchmarks} disabled={running}>
          {running ? 'Running...' : 'Run Benchmarks'}
        </button>
      </div>

      {!wasmLoaded && (
        <p style={{ color: '#f59e0b', fontSize: '0.875rem' }}>
          ⚠️ WASM module not loaded. Benchmarks will only show JS times.
        </p>
      )}

      {results.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #374151' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Rows</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Operation</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>JS (ms)</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>WASM (ms)</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Speedup</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const isFaster = r.wasmTime !== null && r.wasmTime < r.jsTime;
              const isSlower = r.wasmTime !== null && r.wasmTime > r.jsTime;
              return (
                <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '0.5rem' }}>{r.rowCount.toLocaleString()}</td>
                  <td style={{ padding: '0.5rem' }}>{r.name}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{r.jsTime.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                    {r.wasmTime !== null ? r.wasmTime.toFixed(2) : '-'}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '0.5rem',
                      color: isFaster ? '#22c55e' : isSlower ? '#ef4444' : '#6b7280',
                      fontWeight: isFaster || isSlower ? 'bold' : 'normal',
                    }}
                  >
                    {r.speedup}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#111827',
          borderRadius: '0.5rem',
        }}
      >
        <h3 style={{ marginTop: 0 }}>How Trigram Indexing Works</h3>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>
          Instead of scanning every string on each filter, we build an index at load time:
        </p>
        <pre
          style={{
            background: '#0a0a0f',
            padding: '1rem',
            borderRadius: '0.25rem',
            overflow: 'auto',
            fontSize: '0.75rem',
          }}
        >
          {`"item-50" → trigrams: ["ite", "tem", "em-", "m-5", "-50"]

Index (built once):
  "ite" → [0, 1, 2, 3, ...]  // all rows with "ite"
  "tem" → [0, 1, 2, 3, ...]
  "-50" → [50, 150, 250, ...]  // only rows ending in -50

Filter "item-50":
  1. Lookup each trigram in index
  2. Intersect results → candidates
  3. Verify candidates contain full string

Result: O(k) where k = matches, not O(n) full scan`}
        </pre>

        <h4>Trade-offs</h4>
        <ul style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>
          <li>
            <strong>Index build time</strong> - One-time cost when data loads
          </li>
          <li>
            <strong>Memory usage</strong> - Index adds ~30-50% memory overhead
          </li>
          <li>
            <strong>Filter speed</strong> - 10-100x faster for selective queries
          </li>
          <li>
            <strong>Update cost</strong> - Must update index on cell changes
          </li>
        </ul>
      </div>
    </div>
  );
}
