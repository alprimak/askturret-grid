import { useState, useEffect, useCallback } from 'react';
import { TopMovers, type MoverItem } from '@askturret/grid';

// Generate initial market data
const SYMBOLS = [
  'AAPL',
  'GOOGL',
  'MSFT',
  'AMZN',
  'NVDA',
  'TSLA',
  'META',
  'JPM',
  'V',
  'WMT',
  'BTC',
  'ETH',
  'SOL',
  'AVAX',
  'DOGE',
  'XRP',
  'ADA',
  'DOT',
  'MATIC',
  'LINK',
];

function generateInitialData(): MoverItem[] {
  return SYMBOLS.map((symbol, i) => {
    const basePrice = symbol === 'BTC' ? 67500 : symbol === 'ETH' ? 3450 : 50 + Math.random() * 450;
    const changePercent = (Math.random() - 0.5) * 20; // -10% to +10%
    const change = basePrice * (changePercent / 100);

    return {
      id: symbol,
      symbol,
      price: basePrice,
      change,
      changePercent,
    };
  });
}

function updateMarketData(data: MoverItem[]): MoverItem[] {
  return data.map((item) => {
    // Random walk for price
    const priceChange = (Math.random() - 0.5) * 0.02 * item.price;
    const newPrice = Math.max(1, item.price + priceChange);

    // Update change percent with some momentum and mean reversion
    const momentum = item.changePercent * 0.95;
    const noise = (Math.random() - 0.5) * 2;
    const newChangePercent = Math.max(-15, Math.min(15, momentum + noise));
    const newChange = newPrice * (newChangePercent / 100);

    return {
      ...item,
      price: newPrice,
      change: newChange,
      changePercent: newChangePercent,
    };
  });
}

export function TopMoversDemo() {
  const [data, setData] = useState<MoverItem[]>(generateInitialData);
  const [isLive, setIsLive] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(5000);
  const [dataUpdateInterval, setDataUpdateInterval] = useState(500);
  const [gainersCount, setGainersCount] = useState(5);
  const [losersCount, setLosersCount] = useState(5);
  const [showPrice, setShowPrice] = useState(true);
  const [showChange, setShowChange] = useState(false);
  const [compact, setCompact] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    item: MoverItem;
    type: 'gainer' | 'loser';
  } | null>(null);

  // Simulate market data updates (faster than ranking updates)
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setData((prev) => updateMarketData(prev));
    }, dataUpdateInterval);

    return () => clearInterval(interval);
  }, [isLive, dataUpdateInterval]);

  const handleItemClick = useCallback((item: MoverItem, type: 'gainer' | 'loser') => {
    setSelectedItem({ item, type });
  }, []);

  const handleReset = () => {
    setData(generateInitialData());
    setSelectedItem(null);
  };

  return (
    <div className="demo-section">
      <div className="demo-header">
        <span className="demo-title">Top Movers</span>
        <div className="demo-controls">
          <button className={isLive ? 'stop' : 'start'} onClick={() => setIsLive(!isLive)}>
            {isLive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={handleReset} style={{ marginLeft: 8 }}>
            Reset
          </button>
        </div>
      </div>

      <div className="demo-options">
        <label>
          <span className="control-label">Ranking Update:</span>
          <select
            value={updateInterval}
            onChange={(e) => setUpdateInterval(Number(e.target.value))}
          >
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
        </label>

        <label>
          <span className="control-label">Data Update:</span>
          <select
            value={dataUpdateInterval}
            onChange={(e) => setDataUpdateInterval(Number(e.target.value))}
          >
            <option value={100}>100ms</option>
            <option value={250}>250ms</option>
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
          </select>
        </label>

        <label>
          <span className="control-label">Show:</span>
          <input
            type="number"
            min={3}
            max={10}
            value={gainersCount}
            onChange={(e) => setGainersCount(Number(e.target.value))}
            style={{ width: 40 }}
          />
          <span style={{ margin: '0 4px' }}>/</span>
          <input
            type="number"
            min={3}
            max={10}
            value={losersCount}
            onChange={(e) => setLosersCount(Number(e.target.value))}
            style={{ width: 40 }}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={showPrice}
            onChange={(e) => setShowPrice(e.target.checked)}
          />{' '}
          Price
        </label>

        <label>
          <input
            type="checkbox"
            checked={showChange}
            onChange={(e) => setShowChange(e.target.checked)}
          />{' '}
          Change
        </label>

        <label>
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />{' '}
          Compact
        </label>
      </div>

      <div className="demo-content topmovers-demo-content">
        <TopMovers
          data={data}
          gainersCount={gainersCount}
          losersCount={losersCount}
          updateInterval={updateInterval}
          showPrice={showPrice}
          showChange={showChange}
          compact={compact}
          onItemClick={handleItemClick}
        />

        {selectedItem && (
          <div className="topmovers-selection">
            Clicked:{' '}
            <span className={selectedItem.type === 'gainer' ? 'positive' : 'negative'}>
              {selectedItem.item.symbol} ({selectedItem.type === 'gainer' ? '+' : ''}
              {selectedItem.item.changePercent.toFixed(2)}%)
            </span>
          </div>
        )}

        <div className="topmovers-info">
          <p>
            <strong>How it works:</strong> Data updates every {dataUpdateInterval}ms, but rankings
            only refresh every {updateInterval / 1000}s.
          </p>
          <p>
            This prevents the jarring experience of items jumping around constantly while still
            showing current market leaders.
          </p>
        </div>
      </div>
    </div>
  );
}
