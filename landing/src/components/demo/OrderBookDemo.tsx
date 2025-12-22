import { useState, useEffect, useCallback } from 'react';
import { OrderBook, type OrderBookData, type OrderBookLevel } from '@askturret/grid';

// Generate initial order book levels
function generateLevels(basePrice: number, count: number, side: 'bid' | 'ask'): OrderBookLevel[] {
  const levels: OrderBookLevel[] = [];
  const tickSize = basePrice > 1000 ? 10 : basePrice > 100 ? 1 : 0.01;

  for (let i = 0; i < count; i++) {
    const priceOffset = tickSize * (i + 1);
    const price = side === 'bid' ? basePrice - priceOffset : basePrice + priceOffset;
    const quantity = Math.floor(Math.random() * 50000) + 1000;
    const orders = Math.floor(Math.random() * 20) + 1;

    levels.push({ price, quantity, orders });
  }

  return levels;
}

// Simulate order book updates
function updateOrderBook(data: OrderBookData, basePrice: number): OrderBookData {
  const updateLevel = (level: OrderBookLevel): OrderBookLevel => {
    // Randomly change quantity
    const qtyChange = (Math.random() - 0.5) * 0.3 * level.quantity;
    const newQty = Math.max(100, Math.floor(level.quantity + qtyChange));
    const orderChange = Math.floor((Math.random() - 0.5) * 4);
    const newOrders = Math.max(1, (level.orders || 1) + orderChange);
    return { ...level, quantity: newQty, orders: newOrders };
  };

  // Update ~30% of levels each tick
  const bids = data.bids.map((l) => (Math.random() > 0.7 ? updateLevel(l) : l));
  const asks = data.asks.map((l) => (Math.random() > 0.7 ? updateLevel(l) : l));

  // Occasionally shift the book
  const priceShift = (Math.random() - 0.5) * 0.001 * basePrice;
  const newLastPrice = (data.lastPrice || basePrice) + priceShift;

  return {
    bids,
    asks,
    lastPrice: newLastPrice,
    spread: asks[0].price - bids[0].price,
  };
}

// Symbols with different price ranges
const SYMBOLS = [
  { symbol: 'BTC/USD', basePrice: 67500, priceDecimals: 2, qtyDecimals: 4 },
  { symbol: 'ETH/USD', basePrice: 3450, priceDecimals: 2, qtyDecimals: 3 },
  { symbol: 'AAPL', basePrice: 188.5, priceDecimals: 2, qtyDecimals: 0 },
  { symbol: 'NVDA', basePrice: 875, priceDecimals: 2, qtyDecimals: 0 },
];

export function OrderBookDemo() {
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [levels, setLevels] = useState(10);
  const [showSpread, setShowSpread] = useState(true);
  const [showDepthBars, setShowDepthBars] = useState(true);
  const [showOrderCount, setShowOrderCount] = useState(false);
  const [compact, setCompact] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<{
    price: number;
    side: 'bid' | 'ask';
  } | null>(null);

  const currentSymbol = SYMBOLS[symbolIndex];

  // Initialize order book
  const [orderBook, setOrderBook] = useState<OrderBookData>(() => ({
    bids: generateLevels(currentSymbol.basePrice, 15, 'bid'),
    asks: generateLevels(currentSymbol.basePrice, 15, 'ask'),
    lastPrice: currentSymbol.basePrice,
    spread: 0,
  }));

  // Reset order book when symbol changes
  useEffect(() => {
    const sym = SYMBOLS[symbolIndex];
    setOrderBook({
      bids: generateLevels(sym.basePrice, 15, 'bid'),
      asks: generateLevels(sym.basePrice, 15, 'ask'),
      lastPrice: sym.basePrice,
      spread: 0,
    });
    setSelectedPrice(null);
  }, [symbolIndex]);

  // Live updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setOrderBook((prev) => updateOrderBook(prev, currentSymbol.basePrice));
    }, 250); // 4 updates per second

    return () => clearInterval(interval);
  }, [isLive, currentSymbol.basePrice]);

  const handlePriceClick = useCallback((price: number, side: 'bid' | 'ask') => {
    setSelectedPrice({ price, side });
  }, []);

  return (
    <div className="demo-section">
      <div className="demo-header">
        <span className="demo-title">Order Book</span>
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
            min={5}
            max={20}
            value={levels}
            onChange={(e) => setLevels(Number(e.target.value))}
            style={{ width: 50 }}
          />{' '}
          Levels
        </label>
        <label>
          <input type="checkbox" checked={showSpread} onChange={(e) => setShowSpread(e.target.checked)} />{' '}
          Spread
        </label>
        <label>
          <input
            type="checkbox"
            checked={showDepthBars}
            onChange={(e) => setShowDepthBars(e.target.checked)}
          />{' '}
          Depth Bars
        </label>
        <label>
          <input
            type="checkbox"
            checked={showOrderCount}
            onChange={(e) => setShowOrderCount(e.target.checked)}
          />{' '}
          Orders
        </label>
        <label>
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> Compact
        </label>
      </div>

      <div className="demo-content orderbook-demo-content">
        <div className="orderbook-container">
          <OrderBook
            data={orderBook}
            levels={levels}
            priceDecimals={currentSymbol.priceDecimals}
            quantityDecimals={currentSymbol.qtyDecimals}
            showSpread={showSpread}
            showDepthBars={showDepthBars}
            showOrderCount={showOrderCount}
            compact={compact}
            onPriceClick={handlePriceClick}
            flashOnChange
          />
        </div>

        {selectedPrice && (
          <div className="orderbook-selection">
            Selected:{' '}
            <span className={selectedPrice.side}>
              {selectedPrice.side.toUpperCase()} @ ${selectedPrice.price.toFixed(currentSymbol.priceDecimals)}
            </span>
          </div>
        )}

        <div className="orderbook-stats">
          <div className="stat">
            <span className="stat-label">Last Price</span>
            <span className="stat-value">${orderBook.lastPrice?.toFixed(currentSymbol.priceDecimals)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Best Bid</span>
            <span className="stat-value bid">
              ${orderBook.bids[0]?.price.toFixed(currentSymbol.priceDecimals)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Best Ask</span>
            <span className="stat-value ask">
              ${orderBook.asks[0]?.price.toFixed(currentSymbol.priceDecimals)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Bid Depth</span>
            <span className="stat-value">
              {orderBook.bids
                .slice(0, levels)
                .reduce((sum, l) => sum + l.quantity, 0)
                .toLocaleString()}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Ask Depth</span>
            <span className="stat-value">
              {orderBook.asks
                .slice(0, levels)
                .reduce((sum, l) => sum + l.quantity, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
