import { useState, useEffect } from 'react';
import { DataGrid, type ColumnDef, useAdaptiveFlash } from '@askturret/grid';

interface TestRow {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  value: number;
  change: number;
  changePercent: number;
  status: 'active' | 'pending' | 'closed';
}

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'BTC', 'ETH', 'TSLA', 'META', 'JPM'];
const STATUSES: TestRow['status'][] = ['active', 'pending', 'closed'];

function generateRow(index: number): TestRow {
  const symbol = SYMBOLS[index % SYMBOLS.length];
  const price = 100 + Math.random() * 900;
  const quantity = Math.floor(10 + Math.random() * 990);
  return {
    id: `row-${index}`,
    symbol: `${symbol}-${Math.floor(index / SYMBOLS.length)}`,
    price,
    quantity,
    value: price * quantity,
    change: (Math.random() - 0.5) * 20,
    changePercent: (Math.random() - 0.5) * 10,
    status: STATUSES[index % 3],
  };
}

function updateRow(row: TestRow): TestRow {
  const priceChange = (Math.random() - 0.5) * 2;
  const newPrice = Math.max(1, row.price + priceChange);
  return {
    ...row,
    price: newPrice,
    value: newPrice * row.quantity,
    change: priceChange,
    changePercent: (priceChange / row.price) * 100,
  };
}

const columns: ColumnDef<TestRow>[] = [
  { field: 'symbol', header: 'Symbol', sortable: true, width: '120px' },
  {
    field: 'price',
    header: 'Price',
    align: 'right',
    width: '100px',
    flashOnChange: true,
    formatter: (v) => `$${(v as number).toFixed(2)}`,
  },
  {
    field: 'quantity',
    header: 'Qty',
    align: 'right',
    width: '80px',
    formatter: (v) => (v as number).toLocaleString(),
  },
  {
    field: 'value',
    header: 'Value',
    align: 'right',
    width: '120px',
    flashOnChange: true,
    formatter: (v) => `$${(v as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  },
  {
    field: 'change',
    header: 'Change',
    align: 'right',
    width: '80px',
    flashOnChange: true,
    formatter: (v) => {
      const val = v as number;
      return (
        <span className={val >= 0 ? 'positive' : 'negative'}>
          {val >= 0 ? '+' : ''}
          {val.toFixed(2)}
        </span>
      );
    },
  },
  {
    field: 'changePercent',
    header: '%',
    align: 'right',
    width: '70px',
    flashOnChange: true,
    formatter: (v) => {
      const val = v as number;
      return (
        <span className={val >= 0 ? 'positive' : 'negative'}>
          {val >= 0 ? '+' : ''}
          {val.toFixed(2)}%
        </span>
      );
    },
  },
  {
    field: 'status',
    header: 'Status',
    width: '80px',
    formatter: (v) => {
      const status = v as string;
      const className =
        status === 'active'
          ? 'status-active'
          : status === 'pending'
            ? 'status-pending'
            : 'status-closed';
      return <span className={className}>{status}</span>;
    },
  },
];

export function PerformanceDemo() {
  const [rowCount, setRowCount] = useState(1000);
  const [updateInterval, setUpdateInterval] = useState(250);
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<TestRow[]>([]);
  const [updateCount, setUpdateCount] = useState(0);
  const [virtualize, setVirtualize] = useState<boolean | 'auto'>('auto');
  const { disableFlash, fps } = useAdaptiveFlash();

  const isVirtualized = virtualize === true || (virtualize === 'auto' && rowCount > 100);

  useEffect(() => {
    setData(Array.from({ length: rowCount }, (_, i) => generateRow(i)));
    setUpdateCount(0);
  }, [rowCount]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setData((prev) => {
        const updatePct = 0.1 + Math.random() * 0.1;
        const rowsToUpdate = Math.floor(prev.length * updatePct);
        const indices = new Set<number>();

        while (indices.size < rowsToUpdate) {
          indices.add(Math.floor(Math.random() * prev.length));
        }

        return prev.map((row, i) => (indices.has(i) ? updateRow(row) : row));
      });
      setUpdateCount((c) => c + 1);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isRunning, updateInterval]);

  const fpsClass = fps >= 55 ? 'good' : fps >= 30 ? 'ok' : 'bad';

  return (
    <div className="demo-section">
      <div className="demo-header">
        <span className="demo-title">Performance Stress Test</span>
        <div className="demo-controls">
          <button className={isRunning ? 'stop' : 'start'} onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? 'Stop' : 'Start'}
          </button>
          <span className={`fps ${fpsClass}`}>{fps} FPS</span>
        </div>
      </div>

      <div className="demo-options">
        <label>
          <span className="control-label">Rows:</span>
          <input
            type="range"
            value={Math.log10(rowCount)}
            onChange={(e) => setRowCount(Math.round(Math.pow(10, parseFloat(e.target.value))))}
            min={2}
            max={6}
            step={0.1}
          />
          <span className="control-value">{rowCount.toLocaleString()}</span>
        </label>

        <label>
          <span className="control-label">Interval:</span>
          <input
            type="range"
            value={updateInterval}
            onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
            min={20}
            max={2000}
            step={10}
          />
          <span className="control-value">{updateInterval}ms</span>
        </label>

        <label>
          <span className="control-label">Virtualization:</span>
          <select
            value={String(virtualize)}
            onChange={(e) => {
              const v = e.target.value;
              setVirtualize(v === 'true' ? true : v === 'false' ? false : 'auto');
            }}
          >
            <option value="auto">Auto (&gt;100)</option>
            <option value="true">Always On</option>
            <option value="false">Always Off</option>
          </select>
        </label>

        <div className="stats">
          <span className={`badge ${isVirtualized ? 'virtualized' : 'standard'}`}>
            {isVirtualized ? 'VIRTUALIZED' : 'STANDARD'}
          </span>
          <span className={`badge ${disableFlash ? 'flash-off' : 'flash-on'}`}>
            {disableFlash ? 'FLASH OFF' : 'FLASH ON'}
          </span>
          <span className="stat">
            Updates: <span className="stat-value">{updateCount}</span>
          </span>
        </div>
      </div>

      <div className="demo-content">
        <DataGrid
          data={data}
          columns={columns}
          rowKey="id"
          showFilter
          filterPlaceholder="Filter symbols..."
          filterFields={['symbol', 'status']}
          virtualize={virtualize}
          disableFlash={disableFlash}
        />
      </div>
    </div>
  );
}
