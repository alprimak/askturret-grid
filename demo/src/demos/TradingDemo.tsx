import { useState, useEffect } from 'react';
import { DataGrid, type ColumnDef } from '@askturret/grid';

interface Position {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

const initialPositions: Position[] = [
  {
    symbol: 'AAPL',
    side: 'long',
    quantity: 100,
    avgPrice: 185.5,
    currentPrice: 188.25,
    marketValue: 18825,
    unrealizedPnl: 275,
    unrealizedPnlPercent: 1.48,
  },
  {
    symbol: 'GOOGL',
    side: 'long',
    quantity: 50,
    avgPrice: 140.2,
    currentPrice: 142.8,
    marketValue: 7140,
    unrealizedPnl: 130,
    unrealizedPnlPercent: 1.86,
  },
  {
    symbol: 'TSLA',
    side: 'short',
    quantity: 25,
    avgPrice: 245.0,
    currentPrice: 238.5,
    marketValue: -5962.5,
    unrealizedPnl: 162.5,
    unrealizedPnlPercent: 2.65,
  },
  {
    symbol: 'NVDA',
    side: 'long',
    quantity: 30,
    avgPrice: 480.0,
    currentPrice: 495.2,
    marketValue: 14856,
    unrealizedPnl: 456,
    unrealizedPnlPercent: 3.17,
  },
  {
    symbol: 'MSFT',
    side: 'long',
    quantity: 75,
    avgPrice: 375.8,
    currentPrice: 378.4,
    marketValue: 28380,
    unrealizedPnl: 195,
    unrealizedPnlPercent: 0.69,
  },
  {
    symbol: 'AMZN',
    side: 'long',
    quantity: 40,
    avgPrice: 155.0,
    currentPrice: 152.3,
    marketValue: 6092,
    unrealizedPnl: -108,
    unrealizedPnlPercent: -1.74,
  },
  {
    symbol: 'META',
    side: 'long',
    quantity: 60,
    avgPrice: 350.25,
    currentPrice: 365.8,
    marketValue: 21948,
    unrealizedPnl: 933,
    unrealizedPnlPercent: 4.44,
  },
  {
    symbol: 'BTC',
    side: 'long',
    quantity: 0.5,
    avgPrice: 42500,
    currentPrice: 43200,
    marketValue: 21600,
    unrealizedPnl: 350,
    unrealizedPnlPercent: 1.65,
  },
  {
    symbol: 'ETH',
    side: 'long',
    quantity: 5,
    avgPrice: 2280,
    currentPrice: 2195,
    marketValue: 10975,
    unrealizedPnl: -425,
    unrealizedPnlPercent: -3.73,
  },
  {
    symbol: 'JPM',
    side: 'short',
    quantity: 50,
    avgPrice: 168.5,
    currentPrice: 172.2,
    marketValue: -8610,
    unrealizedPnl: -185,
    unrealizedPnlPercent: -2.2,
  },
];

function updatePosition(pos: Position): Position {
  const priceChange = (Math.random() - 0.5) * 2 * (pos.currentPrice * 0.002);
  const newPrice = Math.max(0.01, pos.currentPrice + priceChange);
  const marketValue = pos.side === 'long' ? pos.quantity * newPrice : -pos.quantity * newPrice;
  const unrealizedPnl =
    pos.side === 'long' ? (newPrice - pos.avgPrice) * pos.quantity : (pos.avgPrice - newPrice) * pos.quantity;
  const unrealizedPnlPercent = (unrealizedPnl / (pos.avgPrice * pos.quantity)) * 100;

  return {
    ...pos,
    currentPrice: newPrice,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPercent,
  };
}

const columns: ColumnDef<Position>[] = [
  {
    field: 'symbol',
    header: 'Symbol',
    width: '100px',
    sortable: true,
    formatter: (v) => <strong>{String(v)}</strong>,
  },
  {
    field: 'side',
    header: 'Side',
    width: '80px',
    formatter: (v) => (
      <span className={v === 'long' ? 'positive' : 'negative'}>{String(v).toUpperCase()}</span>
    ),
  },
  {
    field: 'quantity',
    header: 'Qty',
    align: 'right',
    width: '80px',
    formatter: (v) => (v as number).toLocaleString(),
  },
  {
    field: 'avgPrice',
    header: 'Avg Price',
    align: 'right',
    width: '100px',
    formatter: (v) =>
      `$${(v as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    field: 'currentPrice',
    header: 'Current',
    align: 'right',
    width: '100px',
    flashOnChange: true,
    formatter: (v) =>
      `$${(v as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    field: 'marketValue',
    header: 'Mkt Value',
    align: 'right',
    width: '120px',
    flashOnChange: true,
    formatter: (v) =>
      `$${(v as number).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
  },
  {
    field: 'unrealizedPnl',
    header: 'P&L',
    align: 'right',
    width: '100px',
    flashOnChange: true,
    formatter: (v) => {
      const val = v as number;
      return (
        <span className={val >= 0 ? 'positive' : 'negative'}>
          {val >= 0 ? '+' : ''}$
          {val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      );
    },
  },
  {
    field: 'unrealizedPnlPercent',
    header: 'P&L %',
    align: 'right',
    width: '80px',
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
];

export function TradingDemo() {
  const [positions, setPositions] = useState(initialPositions);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setPositions((prev) => prev.map((pos) => (Math.random() > 0.5 ? updatePosition(pos) : pos)));
    }, 500);

    return () => clearInterval(interval);
  }, [isLive]);

  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0);

  return (
    <div className="demo-section">
      <div className="demo-header">
        <span className="demo-title">Portfolio Monitor</span>
        <div className="demo-controls">
          <button className={isLive ? 'stop' : 'start'} onClick={() => setIsLive(!isLive)}>
            {isLive ? 'Pause' : 'Resume'}
          </button>
          <div className="stats">
            <span className="stat">
              Total Value:{' '}
              <span className="stat-value">
                ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </span>
            <span className="stat">
              P&L:{' '}
              <span className={`stat-value ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="demo-content">
        <DataGrid
          data={positions}
          columns={columns}
          rowKey="symbol"
          showFilter
          filterPlaceholder="Filter positions..."
          filterFields={['symbol', 'side']}
        />
      </div>
    </div>
  );
}
