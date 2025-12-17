import { useState, useEffect, useCallback } from 'react';
import { PositionLadder, type LadderLevel, type Position } from '@askturret/grid';

// Generate order book levels around a center price
function generateLevels(centerPrice: number, tickSize: number, levelCount: number): LadderLevel[] {
  const levels: LadderLevel[] = [];
  const halfLevels = Math.floor(levelCount / 2);

  for (let i = -halfLevels; i <= halfLevels; i++) {
    const price = centerPrice + i * tickSize;
    // Bid quantities below center, ask quantities above
    const bidQty =
      i < 0 ? Math.floor(Math.random() * 1000) + 100 : i === 0 ? Math.floor(Math.random() * 500) : 0;
    const askQty =
      i > 0 ? Math.floor(Math.random() * 1000) + 100 : i === 0 ? Math.floor(Math.random() * 500) : 0;

    levels.push({
      price: Math.round(price * 100) / 100,
      bidQty,
      askQty,
    });
  }

  return levels;
}

// Simulate order book updates
function updateLevels(levels: LadderLevel[]): LadderLevel[] {
  return levels.map((level) => {
    // Randomly update ~30% of levels
    if (Math.random() > 0.7) {
      const bidChange = level.bidQty > 0 ? (Math.random() - 0.5) * 0.3 * level.bidQty : 0;
      const askChange = level.askQty > 0 ? (Math.random() - 0.5) * 0.3 * level.askQty : 0;

      return {
        ...level,
        bidQty: Math.max(0, Math.floor(level.bidQty + bidChange)),
        askQty: Math.max(0, Math.floor(level.askQty + askChange)),
      };
    }
    return level;
  });
}

// Symbols with different price ranges
const SYMBOLS = [
  { symbol: 'ES', basePrice: 5925.0, tickSize: 0.25, priceDecimals: 2 },
  { symbol: 'NQ', basePrice: 21150.0, tickSize: 0.25, priceDecimals: 2 },
  { symbol: 'CL', basePrice: 72.5, tickSize: 0.01, priceDecimals: 2 },
  { symbol: 'GC', basePrice: 2650.0, tickSize: 0.1, priceDecimals: 1 },
  { symbol: 'BTC/USD', basePrice: 67500, tickSize: 0.5, priceDecimals: 2 },
];

type PositionState = 'flat' | 'long' | 'short';

export function PositionLadderDemo() {
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [visibleLevels, setVisibleLevels] = useState(20);
  const [showDepthBars, setShowDepthBars] = useState(true);
  const [compact, setCompact] = useState(false);
  const [positionState, setPositionState] = useState<PositionState>('flat');
  const [clickFeedback, setClickFeedback] = useState<string | null>(null);

  const currentSymbol = SYMBOLS[symbolIndex];

  // State
  const [centerPrice, setCenterPrice] = useState(currentSymbol.basePrice);
  const [lastPrice, setLastPrice] = useState(currentSymbol.basePrice);
  const [levels, setLevels] = useState<LadderLevel[]>(() =>
    generateLevels(currentSymbol.basePrice, currentSymbol.tickSize, 30)
  );

  // Position based on state
  const position: Position | undefined =
    positionState === 'flat'
      ? undefined
      : {
          entryPrice: currentSymbol.basePrice - currentSymbol.tickSize * 2,
          quantity: 10,
          side: positionState,
        };

  // Reset when symbol changes
  useEffect(() => {
    const sym = SYMBOLS[symbolIndex];
    setCenterPrice(sym.basePrice);
    setLastPrice(sym.basePrice);
    setLevels(generateLevels(sym.basePrice, sym.tickSize, 30));
    setClickFeedback(null);
  }, [symbolIndex]);

  // Live updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setLevels((prev) => updateLevels(prev));

      // Occasionally move last price
      if (Math.random() > 0.7) {
        setLastPrice((prev) => {
          const direction = Math.random() > 0.5 ? 1 : -1;
          return prev + direction * currentSymbol.tickSize;
        });
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isLive, currentSymbol.tickSize]);

  const handleBidClick = useCallback(
    (price: number) => {
      setClickFeedback(`BUY @ ${price.toFixed(currentSymbol.priceDecimals)}`);
      setTimeout(() => setClickFeedback(null), 2000);
    },
    [currentSymbol.priceDecimals]
  );

  const handleAskClick = useCallback(
    (price: number) => {
      setClickFeedback(`SELL @ ${price.toFixed(currentSymbol.priceDecimals)}`);
      setTimeout(() => setClickFeedback(null), 2000);
    },
    [currentSymbol.priceDecimals]
  );

  const handleRecenter = useCallback(() => {
    setCenterPrice(lastPrice);
  }, [lastPrice]);

  return (
    <div className="demo-section">
      <div className="demo-header">
        <span className="demo-title">Position Ladder (DOM)</span>
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
            max={40}
            value={visibleLevels}
            onChange={(e) => setVisibleLevels(Number(e.target.value))}
            style={{ width: 50 }}
          />{' '}
          Levels
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
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> Compact
        </label>
        <label>
          Position:
          <select
            value={positionState}
            onChange={(e) => setPositionState(e.target.value as PositionState)}
            style={{ marginLeft: 6 }}
          >
            <option value="flat">Flat</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
      </div>

      <div className="demo-content ladder-demo-content">
        <div className="ladder-container">
          <PositionLadder
            levels={levels}
            tickSize={currentSymbol.tickSize}
            centerPrice={centerPrice}
            visibleLevels={visibleLevels}
            position={position}
            lastPrice={lastPrice}
            showDepthBars={showDepthBars}
            flashOnChange
            priceDecimals={currentSymbol.priceDecimals}
            onBidClick={handleBidClick}
            onAskClick={handleAskClick}
            onRecenter={handleRecenter}
            compact={compact}
          />
        </div>

        {clickFeedback && (
          <div className={`ladder-feedback ${clickFeedback.startsWith('BUY') ? 'buy' : 'sell'}`}>
            {clickFeedback}
          </div>
        )}

        <div className="ladder-info">
          <p>
            <strong>How it works:</strong> Click bid (left) to buy, ask (right) to sell. The ladder shows
            order depth at each price level with bid quantities on left and ask quantities on right.
          </p>
          <p>
            <strong>Features:</strong> Flash highlighting on quantity changes, position P&L tracking, last
            traded price indicator, depth bars showing relative size.
          </p>
        </div>
      </div>
    </div>
  );
}
