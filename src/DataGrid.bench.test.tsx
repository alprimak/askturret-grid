/**
 * DataGrid Performance Benchmark
 *
 * Run with: npm run test -- --run DataGrid.bench
 */

import { describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DataGrid, type ColumnDef } from './index';

interface TestRow {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  change: number;
  changePercent: number;
  volume: number;
}

function generateTestData(count: number): TestRow[] {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'BTC', 'ETH', 'SOL'];
  const rows: TestRow[] = [];

  for (let i = 0; i < count; i++) {
    const symbol = symbols[i % symbols.length];
    const price = Math.random() * 1000 + 10;
    const quantity = Math.floor(Math.random() * 10000);
    const change = (Math.random() - 0.5) * 20;

    rows.push({
      id: `row-${i}`,
      symbol: `${symbol}-${Math.floor(i / symbols.length)}`,
      quantity,
      price,
      value: price * quantity,
      change,
      changePercent: (change / price) * 100,
      volume: Math.floor(Math.random() * 1000000),
    });
  }

  return rows;
}

const columns: ColumnDef<TestRow>[] = [
  { field: 'symbol', header: 'Symbol', sortable: true },
  { field: 'quantity', header: 'Qty', align: 'right', sortable: true },
  {
    field: 'price',
    header: 'Price',
    align: 'right',
    sortable: true,
    flashOnChange: true,
    formatter: (v: unknown) => `$${(v as number).toFixed(2)}`,
  },
  {
    field: 'value',
    header: 'Value',
    align: 'right',
    sortable: true,
    flashOnChange: true,
    formatter: (v: unknown) => `$${(v as number).toLocaleString()}`,
  },
  {
    field: 'change',
    header: 'Change',
    align: 'right',
    flashOnChange: true,
    formatter: (v: unknown) => {
      const num = v as number;
      return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    },
    cellClass: (v: unknown) => ((v as number) >= 0 ? 'text-green-400' : 'text-red-400'),
  },
  {
    field: 'changePercent',
    header: '%',
    align: 'right',
    formatter: (v: unknown) => `${(v as number).toFixed(2)}%`,
  },
  {
    field: 'volume',
    header: 'Volume',
    align: 'right',
    sortable: true,
    formatter: (v: unknown) => (v as number).toLocaleString(),
  },
];

function measureRender(
  _name: string,
  component: React.ReactElement,
  iterations: number = 10
): { avgMs: number; minMs: number; maxMs: number; p95Ms: number } {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    cleanup();
    const start = performance.now();
    render(component);
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);

  return {
    avgMs: times.reduce((a, b) => a + b, 0) / iterations,
    minMs: times[0],
    maxMs: times[times.length - 1],
    p95Ms: times[Math.floor(iterations * 0.95)],
  };
}

describe('DataGrid Performance Benchmarks', () => {
  it('should render 100 rows efficiently', () => {
    const data = generateTestData(100);
    const result = measureRender('100 rows', <DataGrid data={data} columns={columns} rowKey="id" />);

    console.log(`\n100 rows: avg=${result.avgMs.toFixed(2)}ms, p95=${result.p95Ms.toFixed(2)}ms`);
    expect(result.p95Ms).toBeLessThan(300); // Should render in under 300ms (includes test overhead)
  });

  it('should render 500 rows efficiently', () => {
    const data = generateTestData(500);
    const result = measureRender('500 rows', <DataGrid data={data} columns={columns} rowKey="id" />);

    console.log(`500 rows: avg=${result.avgMs.toFixed(2)}ms, p95=${result.p95Ms.toFixed(2)}ms`);
    expect(result.p95Ms).toBeLessThan(300); // Should render in under 300ms
  });

  it('should render 1000 rows', () => {
    const data = generateTestData(1000);
    const result = measureRender(
      '1000 rows',
      <DataGrid data={data} columns={columns} rowKey="id" />,
      5 // Fewer iterations for large dataset
    );

    console.log(`1000 rows: avg=${result.avgMs.toFixed(2)}ms, p95=${result.p95Ms.toFixed(2)}ms`);
    expect(result.p95Ms).toBeLessThan(1000); // Should render in under 1s
  });

  it('should render with filtering enabled', () => {
    const data = generateTestData(500);
    const result = measureRender(
      '500 rows + filter',
      <DataGrid data={data} columns={columns} rowKey="id" showFilter={true} filterFields={['symbol']} />
    );

    console.log(`500 rows + filter: avg=${result.avgMs.toFixed(2)}ms, p95=${result.p95Ms.toFixed(2)}ms`);
    expect(result.p95Ms).toBeLessThan(350);
  });

  it('should handle rapid data updates', () => {
    const data = generateTestData(200);
    const { rerender } = render(<DataGrid data={data} columns={columns} rowKey="id" />);

    const updateTimes: number[] = [];

    // Simulate 50 rapid updates
    for (let i = 0; i < 50; i++) {
      // Mutate some prices
      const newData = data.map((row, idx) => {
        if (idx % 10 === i % 10) {
          return { ...row, price: row.price * (1 + (Math.random() - 0.5) * 0.01) };
        }
        return row;
      });

      const start = performance.now();
      rerender(<DataGrid data={newData} columns={columns} rowKey="id" />);
      updateTimes.push(performance.now() - start);
    }

    updateTimes.sort((a, b) => a - b);
    const avgUpdate = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
    const p95Update = updateTimes[Math.floor(updateTimes.length * 0.95)];

    console.log(`Update 200 rows: avg=${avgUpdate.toFixed(2)}ms, p95=${p95Update.toFixed(2)}ms`);
    expect(p95Update).toBeLessThan(100); // Updates should be under 100ms (includes test overhead)

    cleanup();
  });

  it('benchmark summary', () => {
    const results = [
      {
        rows: 100,
        ...measureRender('100', <DataGrid data={generateTestData(100)} columns={columns} rowKey="id" />),
      },
      {
        rows: 250,
        ...measureRender('250', <DataGrid data={generateTestData(250)} columns={columns} rowKey="id" />),
      },
      {
        rows: 500,
        ...measureRender('500', <DataGrid data={generateTestData(500)} columns={columns} rowKey="id" />),
      },
      {
        rows: 750,
        ...measureRender('750', <DataGrid data={generateTestData(750)} columns={columns} rowKey="id" />, 5),
      },
      {
        rows: 1000,
        ...measureRender('1000', <DataGrid data={generateTestData(1000)} columns={columns} rowKey="id" />, 5),
      },
    ];

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              DATAGRID RENDER PERFORMANCE                      ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ Rows   │ Avg (ms)  │ Min (ms)  │ Max (ms)  │ p95 (ms)        ║');
    console.log('╠════════╪═══════════╪═══════════╪═══════════╪═════════════════╣');

    for (const r of results) {
      console.log(
        `║ ${String(r.rows).padStart(6)} │ ${r.avgMs.toFixed(2).padStart(9)} │ ${r.minMs.toFixed(2).padStart(9)} │ ${r.maxMs.toFixed(2).padStart(9)} │ ${r.p95Ms.toFixed(2).padStart(15)} ║`
      );
    }

    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // All tests should pass
    expect(results[0].p95Ms).toBeLessThan(100);
  });
});
