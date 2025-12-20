# TimeSales

Trade tape showing executed trades chronologically. Also known as Time & Sales or the tape.

## Basic Usage

```tsx
import { TimeSales } from '@askturret/grid';
import '@askturret/grid/styles.css';

const trades = [
  { id: '1', price: 100.50, size: 100, time: Date.now(), side: 'buy' },
  { id: '2', price: 100.25, size: 250, time: Date.now() - 1000, side: 'sell' },
  { id: '3', price: 100.50, size: 50, time: Date.now() - 2000, side: 'buy' },
];

<TimeSales trades={trades} maxTrades={100} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trades` | `Trade[]` | required | Array of trades (newest first) |
| `maxTrades` | `number` | `100` | Maximum trades to display |
| `showTickDirection` | `boolean` | `false` | Show up/down tick indicator |
| `flashOnNew` | `boolean` | `true` | Flash highlight new trades |
| `autoScroll` | `boolean` | `true` | Auto-scroll to latest trades |
| `largeTradeThreshold` | `number` | - | Highlight trades above this quantity |
| `priceDecimals` | `number` | `2` | Price decimal places |
| `quantityDecimals` | `number` | `0` | Quantity decimal places |
| `onTradeClick` | `(trade: Trade) => void` | - | Trade row click handler |
| `showHeader` | `boolean` | `true` | Show column headers |

## Trade Data Type

```tsx
interface Trade {
  id: string;
  price: number;
  size: number;
  time: number;         // Unix timestamp in ms
  side: 'buy' | 'sell';
}
```

## Tick Direction

Show whether each trade was an uptick or downtick:

```tsx
<TimeSales
  trades={trades}
  showTickDirection={true}
/>
```

Displays ↑ for upticks and ↓ for downticks.

## Large Trade Highlighting

Highlight significant trades:

```tsx
<TimeSales
  trades={trades}
  largeTradeThreshold={500}
/>
```

Trades with size >= 500 will be highlighted with a distinct style.

## Auto-Scroll

By default, the tape auto-scrolls to show the latest trades:

```tsx
// Disable auto-scroll (user can scroll manually)
<TimeSales
  trades={trades}
  autoScroll={false}
/>
```

## Trade Click Handler

Handle clicks on individual trades:

```tsx
<TimeSales
  trades={trades}
  onTradeClick={(trade) => {
    console.log('Trade clicked:', trade);
    // Show trade details dialog
    setSelectedTrade(trade);
  }}
/>
```

## Real-Time Updates

Handle streaming trade data:

```tsx
function LiveTape() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const ws = new WebSocket('wss://...');
    ws.onmessage = (event) => {
      const trade = JSON.parse(event.data);
      setTrades(prev => [trade, ...prev].slice(0, 100));
    };
    return () => ws.close();
  }, []);

  return (
    <TimeSales
      trades={trades}
      maxTrades={100}
      flashOnNew
      largeTradeThreshold={1000}
    />
  );
}
```

## Time Formatting

Times are displayed relative to now:
- `< 1 minute`: seconds ago (e.g., "5s")
- `< 1 hour`: minutes ago (e.g., "3m")
- `< 24 hours`: hours ago (e.g., "2h")
- `>= 24 hours`: date (e.g., "Dec 19")

## Styling

Colors based on trade side:

```css
:root {
  --grid-bid: #22c55e;   /* Buy trades (green) */
  --grid-ask: #ef4444;   /* Sell trades (red) */
}
```

Large trades get a highlighted background.
