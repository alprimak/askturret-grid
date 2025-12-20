# PositionLadder

DOM-style price ladder with click-to-trade functionality. Shows bid/ask depth at each price level with position and P&L overlay.

## Basic Usage

```tsx
import { PositionLadder } from '@askturret/grid';
import '@askturret/grid/styles.css';

const levels = [
  { price: 5925.00, bidSize: 150, askSize: 0 },
  { price: 5925.25, bidSize: 200, askSize: 0 },
  { price: 5925.50, bidSize: 0, askSize: 100 },
  { price: 5925.75, bidSize: 0, askSize: 250 },
];

<PositionLadder
  levels={levels}
  tickSize={0.25}
  centerPrice={5925.25}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `levels` | `LadderLevel[]` | required | Price levels with bid/ask quantities |
| `tickSize` | `number` | required | Tick size for price increments |
| `centerPrice` | `number` | required | Center price for the display |
| `visibleLevels` | `number` | `20` | Number of price levels to display |
| `position` | `Position` | - | Current position to display |
| `lastPrice` | `number` | - | Last traded price for highlighting |
| `showDepthBars` | `boolean` | `true` | Show depth visualization bars |
| `flashOnChange` | `boolean` | `true` | Flash on quantity changes |
| `priceDecimals` | `number` | `2` | Price decimal places |
| `quantityDecimals` | `number` | `0` | Quantity decimal places |
| `onBidClick` | `(price: number) => void` | - | Bid column click handler |
| `onAskClick` | `(price: number) => void` | - | Ask column click handler |
| `onRecenter` | `() => void` | - | Recenter button click handler |

## Data Types

```tsx
interface LadderLevel {
  price: number;
  bidSize: number;
  askSize: number;
}

interface Position {
  entryPrice: number;
  quantity: number;
  side: 'long' | 'short';
}
```

## Position Display

Show current position with P&L:

```tsx
<PositionLadder
  levels={levels}
  tickSize={0.25}
  centerPrice={5925.25}
  position={{
    entryPrice: 5920.00,
    quantity: 10,
    side: 'long',
  }}
  lastPrice={5925.50}
/>
```

The ladder displays:
- Entry price row highlighted
- Current position quantity
- Unrealized P&L at each price level

## Click-to-Trade

Handle clicks for order entry:

```tsx
<PositionLadder
  levels={levels}
  tickSize={0.25}
  centerPrice={5925.25}
  onBidClick={(price) => {
    // Place buy order at this price
    placeOrder({ side: 'buy', price, quantity: 1 });
  }}
  onAskClick={(price) => {
    // Place sell order at this price
    placeOrder({ side: 'sell', price, quantity: 1 });
  }}
/>
```

## Last Price Highlighting

Highlight the last traded price:

```tsx
<PositionLadder
  levels={levels}
  tickSize={0.25}
  centerPrice={5925.25}
  lastPrice={5925.50}
/>
```

The row at the last price gets a distinct highlight.

## Recenter Button

Allow users to recenter the ladder:

```tsx
function TradingLadder() {
  const [centerPrice, setCenterPrice] = useState(5925.25);

  return (
    <PositionLadder
      levels={levels}
      tickSize={0.25}
      centerPrice={centerPrice}
      onRecenter={() => setCenterPrice(marketPrice)}
    />
  );
}
```

## Real-Time Updates

Handle streaming market data:

```tsx
function LiveLadder() {
  const [levels, setLevels] = useState<LadderLevel[]>([]);
  const [lastPrice, setLastPrice] = useState(0);

  useEffect(() => {
    const ws = new WebSocket('wss://...');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'depth') {
        setLevels(data.levels);
      } else if (data.type === 'trade') {
        setLastPrice(data.price);
      }
    };
    return () => ws.close();
  }, []);

  return (
    <PositionLadder
      levels={levels}
      tickSize={0.25}
      centerPrice={lastPrice || 5925.25}
      lastPrice={lastPrice}
      flashOnChange
    />
  );
}
```

## Depth Bars

Visualize the relative size at each price level:

```tsx
<PositionLadder
  levels={levels}
  tickSize={0.25}
  centerPrice={5925.25}
  showDepthBars={true}  // Default
/>
```

Bar width represents the quantity relative to the maximum visible quantity.

## Styling

The ladder uses CSS variables:

```css
:root {
  --grid-bid: #22c55e;     /* Bid side color */
  --grid-ask: #ef4444;     /* Ask side color */
  --grid-accent: #3b82f6;  /* Last price highlight */
}
```
