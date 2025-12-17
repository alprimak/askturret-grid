/**
 * PositionLadder - DOM-style price ladder component
 *
 * Displays a vertical price ladder with:
 * - Bid/ask quantities at each price level
 * - Depth bars showing relative size
 * - Current position with entry price and P&L
 * - Click-to-trade functionality
 * - Flash highlighting on quantity changes
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { formatPrice, formatQuantity, formatPnL } from './utils/formatters';

// Constants
const FLASH_DURATION = 800;

export interface LadderLevel {
  /** Price level */
  price: number;
  /** Bid quantity at this price */
  bidQty: number;
  /** Ask quantity at this price */
  askQty: number;
}

export interface Position {
  /** Entry price of the position */
  entryPrice: number;
  /** Position quantity (always positive) */
  quantity: number;
  /** Position side */
  side: 'long' | 'short';
}

export interface PositionLadderProps {
  /** Array of price levels with bid/ask quantities */
  levels: LadderLevel[];
  /** Tick size for price increments */
  tickSize: number;
  /** Center price for the ladder display */
  centerPrice: number;
  /** Number of price levels to display (default: 20) */
  visibleLevels?: number;
  /** Current position to display */
  position?: Position;
  /** Last traded price for highlighting */
  lastPrice?: number;
  /** Show depth bars (default: true) */
  showDepthBars?: boolean;
  /** Flash on quantity changes (default: true) */
  flashOnChange?: boolean;
  /** Price decimal places (default: 2) */
  priceDecimals?: number;
  /** Quantity decimal places (default: 0) */
  quantityDecimals?: number;
  /** Callback when bid side is clicked */
  onBidClick?: (price: number) => void;
  /** Callback when ask side is clicked */
  onAskClick?: (price: number) => void;
  /** Callback when recenter button is clicked */
  onRecenter?: () => void;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Container CSS class */
  className?: string;
}

interface FlashState {
  direction: 'up' | 'down';
  side: 'bid' | 'ask';
  expiry: number;
}

export function PositionLadder({
  levels,
  tickSize,
  centerPrice,
  visibleLevels = 20,
  position,
  lastPrice,
  showDepthBars = true,
  flashOnChange = true,
  priceDecimals = 2,
  quantityDecimals = 0,
  onBidClick,
  onAskClick,
  onRecenter,
  compact = false,
  className = '',
}: PositionLadderProps) {
  // Flash tracking
  const prevQuantitiesRef = useRef<Map<string, { bid: number; ask: number }>>(new Map());
  const flashMapRef = useRef<Map<string, FlashState>>(new Map());
  const [, forceUpdate] = React.useState(0);

  // Build levels map for O(1) lookup
  const levelsMap = useMemo(() => {
    const map = new Map<number, LadderLevel>();
    for (const level of levels) {
      // Round price to avoid floating point issues
      const roundedPrice = Math.round(level.price / tickSize) * tickSize;
      map.set(roundedPrice, level);
    }
    return map;
  }, [levels, tickSize]);

  // Generate visible price levels (highest to lowest)
  const visiblePrices = useMemo(() => {
    const prices: number[] = [];
    const halfLevels = Math.floor(visibleLevels / 2);
    const roundedCenter = Math.round(centerPrice / tickSize) * tickSize;

    for (let i = halfLevels; i >= -halfLevels; i--) {
      const price = roundedCenter + i * tickSize;
      // Round to avoid floating point precision issues
      prices.push(Math.round(price * 1e10) / 1e10);
    }

    return prices;
  }, [centerPrice, tickSize, visibleLevels]);

  // Calculate max quantities for depth bar scaling
  const maxQuantities = useMemo(() => {
    let maxBid = 1;
    let maxAsk = 1;

    for (const price of visiblePrices) {
      const roundedPrice = Math.round(price / tickSize) * tickSize;
      const level = levelsMap.get(roundedPrice);
      if (level) {
        maxBid = Math.max(maxBid, level.bidQty);
        maxAsk = Math.max(maxAsk, level.askQty);
      }
    }

    return { maxBid, maxAsk };
  }, [visiblePrices, levelsMap, tickSize]);

  // Calculate position P&L
  const positionPnL = useMemo(() => {
    if (!position || !lastPrice) return null;

    const direction = position.side === 'long' ? 1 : -1;
    const pnl = (lastPrice - position.entryPrice) * position.quantity * direction;

    return formatPnL(pnl, priceDecimals);
  }, [position, lastPrice, priceDecimals]);

  // Flash detection
  useEffect(() => {
    if (!flashOnChange) return;

    const now = Date.now();
    const prevQuantities = prevQuantitiesRef.current;
    const flashMap = flashMapRef.current;
    let hasNewFlash = false;

    for (const price of visiblePrices) {
      const roundedPrice = Math.round(price / tickSize) * tickSize;
      const level = levelsMap.get(roundedPrice);
      const key = price.toFixed(priceDecimals);
      const prev = prevQuantities.get(key);

      if (level && prev) {
        // Check bid change
        if (prev.bid !== level.bidQty) {
          flashMap.set(`bid-${key}`, {
            direction: level.bidQty > prev.bid ? 'up' : 'down',
            side: 'bid',
            expiry: now + FLASH_DURATION,
          });
          hasNewFlash = true;
        }
        // Check ask change
        if (prev.ask !== level.askQty) {
          flashMap.set(`ask-${key}`, {
            direction: level.askQty > prev.ask ? 'up' : 'down',
            side: 'ask',
            expiry: now + FLASH_DURATION,
          });
          hasNewFlash = true;
        }
      }

      // Store current values
      if (level) {
        prevQuantities.set(key, { bid: level.bidQty, ask: level.askQty });
      }
    }

    if (hasNewFlash) {
      forceUpdate((n) => n + 1);
    }
  }, [levels, visiblePrices, levelsMap, flashOnChange, priceDecimals, tickSize]);

  // Cleanup expired flashes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const flashMap = flashMapRef.current;
      let hasExpired = false;

      for (const [key, flash] of flashMap) {
        if (flash.expiry < now) {
          flashMap.delete(key);
          hasExpired = true;
        }
      }

      if (hasExpired) {
        forceUpdate((n) => n + 1);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Get flash class for a cell
  const getFlashClass = (side: 'bid' | 'ask', price: number): string => {
    const key = `${side}-${price.toFixed(priceDecimals)}`;
    const flash = flashMapRef.current.get(key);
    if (!flash) return '';
    return flash.direction === 'up' ? 'flash-up' : 'flash-down';
  };

  // Check if price is position entry
  const isPositionPrice = (price: number): boolean => {
    if (!position) return false;
    const roundedEntry = Math.round(position.entryPrice / tickSize) * tickSize;
    const roundedPrice = Math.round(price / tickSize) * tickSize;
    return Math.abs(roundedEntry - roundedPrice) < tickSize * 0.5;
  };

  // Check if price is last traded price
  const isLastPrice = (price: number): boolean => {
    if (!lastPrice) return false;
    const roundedLast = Math.round(lastPrice / tickSize) * tickSize;
    const roundedPrice = Math.round(price / tickSize) * tickSize;
    return Math.abs(roundedLast - roundedPrice) < tickSize * 0.5;
  };

  // Render a single price row
  const renderRow = (price: number) => {
    const roundedPrice = Math.round(price / tickSize) * tickSize;
    const level = levelsMap.get(roundedPrice);
    const bidQty = level?.bidQty || 0;
    const askQty = level?.askQty || 0;

    const bidDepthPercent = showDepthBars ? (bidQty / maxQuantities.maxBid) * 100 : 0;
    const askDepthPercent = showDepthBars ? (askQty / maxQuantities.maxAsk) * 100 : 0;

    const bidFlashClass = getFlashClass('bid', price);
    const askFlashClass = getFlashClass('ask', price);

    const isPosition = isPositionPrice(price);
    const isLast = isLastPrice(price);

    const rowClasses = ['askturret-ladder-row', isPosition ? 'position' : '', isLast ? 'last-price' : '']
      .filter(Boolean)
      .join(' ');

    return (
      <div key={price.toFixed(priceDecimals)} className={rowClasses}>
        {/* Bid side */}
        <div
          className={`askturret-ladder-cell bid ${bidFlashClass} ${onBidClick ? 'clickable' : ''}`}
          onClick={() => onBidClick?.(price)}
        >
          {showDepthBars && bidQty > 0 && (
            <div className="askturret-ladder-depth-bar bid" style={{ width: `${bidDepthPercent}%` }} />
          )}
          <span className="askturret-ladder-qty">
            {bidQty > 0 ? formatQuantity(bidQty, quantityDecimals) : ''}
          </span>
        </div>

        {/* Price */}
        <div className="askturret-ladder-price">
          {formatPrice(price, priceDecimals)}
          {isPosition && position && (
            <span className="askturret-ladder-position-marker">{position.side === 'long' ? '▲' : '▼'}</span>
          )}
        </div>

        {/* Ask side */}
        <div
          className={`askturret-ladder-cell ask ${askFlashClass} ${onAskClick ? 'clickable' : ''}`}
          onClick={() => onAskClick?.(price)}
        >
          {showDepthBars && askQty > 0 && (
            <div className="askturret-ladder-depth-bar ask" style={{ width: `${askDepthPercent}%` }} />
          )}
          <span className="askturret-ladder-qty">
            {askQty > 0 ? formatQuantity(askQty, quantityDecimals) : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`askturret-ladder ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="askturret-ladder-header">
        <span className="askturret-ladder-header-bid">Bid</span>
        <span className="askturret-ladder-header-price">
          Price
          {onRecenter && (
            <button className="askturret-ladder-recenter" onClick={onRecenter} title="Recenter">
              ⊙
            </button>
          )}
        </span>
        <span className="askturret-ladder-header-ask">Ask</span>
      </div>

      {/* Price ladder */}
      <div className="askturret-ladder-body">{visiblePrices.map(renderRow)}</div>

      {/* Position info */}
      {position && (
        <div className="askturret-ladder-position">
          <span className={`askturret-ladder-position-side ${position.side}`}>
            {position.side.toUpperCase()} {formatQuantity(position.quantity, quantityDecimals)}
          </span>
          <span className="askturret-ladder-position-entry">
            @ {formatPrice(position.entryPrice, priceDecimals)}
          </span>
          {positionPnL && (
            <span className={`askturret-ladder-position-pnl ${positionPnL.className}`}>
              {positionPnL.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
