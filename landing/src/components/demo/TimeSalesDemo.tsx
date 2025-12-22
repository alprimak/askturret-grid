import { useState, useEffect, useCallback, useRef } from 'react';
import { TimeSales, type Trade } from '@askturret/grid';

// Generate initial trades
function generateInitialTrades(basePrice: number, count: number): Trade[] {
  const trades: Trade[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const priceVariation = (Math.random() - 0.5) * 0.01 * basePrice;
    const price = basePrice + priceVariation;
    const quantity = Math.floor(Math.random() * 500) + 1;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';

    trades.push({
      id: `trade-${i}`,
      timestamp: now - (count - i) * 100,
      side,
      price,
      quantity,
    });
  }

  return trades;
}

// Generate a new trade
function generateNewTrade(basePrice: number, id: number, lastPrice: number): Trade {
  // Slight trend continuation with random variation
  const trend = Math.random() > 0.5 ? 1 : -1;
  const priceChange = trend * Math.random() * 0.002 * basePrice;
  const price = lastPrice + priceChange;
  const quantity = Math.floor(Math.random() * 500) + 1;
  // Buys more likely on uptick, sells on downtick
  const side =
    priceChange > 0 ? (Math.random() > 0.3 ? 'buy' : 'sell') : Math.random() > 0.3 ? 'sell' : 'buy';

  return {
    id: `trade-${id}`,
    timestamp: Date.now(),
    side,
    price,
    quantity,
  };
}

// Symbols with different price ranges
const SYMBOLS = [
  { symbol: 'BTC/USD', basePrice: 67500, priceDecimals: 2 },
  { symbol: 'ETH/USD', basePrice: 3450, priceDecimals: 2 },
  { symbol: 'AAPL', basePrice: 188.5, priceDecimals: 2 },
  { symbol: 'NVDA', basePrice: 875, priceDecimals: 2 },
  { symbol: 'ES (Futures)', basePrice: 5925.5, priceDecimals: 2 },
];

export function TimeSalesDemo() {
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [maxTrades, setMaxTrades] = useState(50);
  const [showTickDirection, setShowTickDirection] = useState(true);
  const [flashOnNew, setFlashOnNew] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [largeTradeThreshold, setLargeTradeThreshold] = useState(300);
  const [compact, setCompact] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const currentSymbol = SYMBOLS[symbolIndex];
  const tradeIdRef = useRef(100);

  // Initialize trades
  const [trades, setTrades] = useState<Trade[]>(() =>
    generateInitialTrades(currentSymbol.basePrice, maxTrades)
  );

  // Reset trades when symbol changes
  useEffect(() => {
    const sym = SYMBOLS[symbolIndex];
    setTrades(generateInitialTrades(sym.basePrice, maxTrades));
    setSelectedTrade(null);
    tradeIdRef.current = maxTrades + 100;
  }, [symbolIndex, maxTrades]);

  // Live updates - add new trades
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setTrades((prev) => {
        const lastPrice = prev[0]?.price || currentSymbol.basePrice;
        const newTrade = generateNewTrade(currentSymbol.basePrice, tradeIdRef.current++, lastPrice);
        const updated = [newTrade, ...prev];
        return updated.slice(0, maxTrades);
      });
    }, 150); // ~6-7 trades per second

    return () => clearInterval(interval);
  }, [isLive, currentSymbol.basePrice, maxTrades]);

  const handleTradeClick = useCallback((trade: Trade) => {
    setSelectedTrade(trade);
  }, []);

  // Calculate statistics
  const stats = {
    totalVolume: trades.reduce((sum, t) => sum + t.quantity, 0),
    buyVolume: trades.filter((t) => t.side === 'buy').reduce((sum, t) => sum + t.quantity, 0),
    sellVolume: trades.filter((t) => t.side === 'sell').reduce((sum, t) => sum + t.quantity, 0),
    lastPrice: trades[0]?.price || currentSymbol.basePrice,
    highPrice: Math.max(...trades.map((t) => t.price)),
    lowPrice: Math.min(...trades.map((t) => t.price)),
    largeTrades: trades.filter((t) => t.quantity >= largeTradeThreshold).length,
  };

  return (
    <div className="demo-section">
      <div className="demo-header">
        <span className="demo-title">Time & Sales</span>
        <div className="demo-controls">
          <select
            value={symbolIndex}
            onChange={(e) => setSymbolIndex(Number(e.target.value))}
            className="symbol-select"
          >
            {SYMBOLS.map((s, i) => (
              <option key={s.symbol} value={i}>
                {s.symbol}
              </option>
            ))}
          </select>
          <button className={isLive ? 'stop' : 'start'} onClick={() => setIsLive(!isLive)}>
            {isLive ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      <div className="demo-options">
        <label>
          <input
            type="number"
            min={10}
            max={200}
            value={maxTrades}
            onChange={(e) => setMaxTrades(Number(e.target.value))}
            style={{ width: 50 }}
          />{' '}
          Max Trades
        </label>
        <label>
          <input
            type="number"
            min={50}
            max={1000}
            value={largeTradeThreshold}
            onChange={(e) => setLargeTradeThreshold(Number(e.target.value))}
            style={{ width: 60 }}
          />{' '}
          Large Threshold
        </label>
        <label>
          <input
            type="checkbox"
            checked={showTickDirection}
            onChange={(e) => setShowTickDirection(e.target.checked)}
          />{' '}
          Tick
        </label>
        <label>
          <input type="checkbox" checked={flashOnNew} onChange={(e) => setFlashOnNew(e.target.checked)} />{' '}
          Flash
        </label>
        <label>
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />{' '}
          Auto-scroll
        </label>
        <label>
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> Compact
        </label>
      </div>

      <div className="demo-content timesales-demo-content">
        <div className="timesales-container">
          <TimeSales
            trades={trades}
            maxTrades={maxTrades}
            showTickDirection={showTickDirection}
            flashOnNew={flashOnNew}
            autoScroll={autoScroll}
            largeTradeThreshold={largeTradeThreshold}
            priceDecimals={currentSymbol.priceDecimals}
            compact={compact}
            onTradeClick={handleTradeClick}
          />
        </div>

        {selectedTrade && (
          <div className="timesales-selection">
            Selected:{' '}
            <span className={selectedTrade.side}>
              {selectedTrade.side.toUpperCase()} {selectedTrade.quantity.toLocaleString()} @ $
              {selectedTrade.price.toFixed(currentSymbol.priceDecimals)}
            </span>
          </div>
        )}

        <div className="timesales-stats">
          <div className="stat">
            <span className="stat-label">Last</span>
            <span className="stat-value">${stats.lastPrice.toFixed(currentSymbol.priceDecimals)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">High</span>
            <span className="stat-value">${stats.highPrice.toFixed(currentSymbol.priceDecimals)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Low</span>
            <span className="stat-value">${stats.lowPrice.toFixed(currentSymbol.priceDecimals)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Volume</span>
            <span className="stat-value">{stats.totalVolume.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Buy Vol</span>
            <span className="stat-value bid">{stats.buyVolume.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Sell Vol</span>
            <span className="stat-value ask">{stats.sellVolume.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Large</span>
            <span className="stat-value">{stats.largeTrades}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
