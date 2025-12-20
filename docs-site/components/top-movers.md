# TopMovers

Gainers and losers display with periodic ranking updates. Shows the top performing and worst performing instruments.

## Basic Usage

```tsx
import { TopMovers } from '@askturret/grid';
import '@askturret/grid/styles.css';

const movers = [
  { symbol: 'AAPL', price: 178.50, change: 4.25, changePercent: 2.44 },
  { symbol: 'GOOGL', price: 141.25, change: -2.10, changePercent: -1.47 },
  { symbol: 'MSFT', price: 378.90, change: 8.50, changePercent: 2.29 },
  { symbol: 'AMZN', price: 153.20, change: -3.80, changePercent: -2.42 },
];

<TopMovers data={movers} gainersCount={5} losersCount={5} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `MoverItem[]` | required | Array of items to rank |
| `gainersCount` | `number` | `5` | Number of top gainers to show |
| `losersCount` | `number` | `5` | Number of top losers to show |
| `updateInterval` | `number` | `5000` | How often to update rankings (ms) |
| `showPrice` | `boolean` | `true` | Show price column |
| `showChange` | `boolean` | `false` | Show absolute change |
| `priceDecimals` | `number` | `2` | Price decimal places |
| `onItemClick` | `(item: MoverItem, type: 'gainer' \| 'loser') => void` | - | Item click handler |
| `showHeaders` | `boolean` | `true` | Show section headers |
| `compact` | `boolean` | `false` | Compact mode for smaller displays |

## Data Type

```tsx
interface MoverItem {
  symbol: string;
  price: number;
  change: number;         // Absolute change
  changePercent: number;  // Percentage change
}
```

## Ranking Updates

Rankings update periodically to reflect changing market conditions:

```tsx
<TopMovers
  data={movers}
  gainersCount={5}
  losersCount={5}
  updateInterval={5000}  // Re-rank every 5 seconds
/>
```

Set `updateInterval={0}` to disable periodic updates (ranks only on data change).

## Item Click Handler

Handle clicks on individual items:

```tsx
<TopMovers
  data={movers}
  onItemClick={(item, type) => {
    console.log(`Clicked ${type}: ${item.symbol}`);
    // Navigate to symbol detail
    navigate(`/symbols/${item.symbol}`);
  }}
/>
```

## Show Absolute Change

Display both absolute and percentage change:

```tsx
<TopMovers
  data={movers}
  showChange={true}
/>
```

Shows: `+$4.25 (+2.44%)`

## Compact Mode

For smaller panels or mobile displays:

```tsx
<TopMovers
  data={movers}
  gainersCount={3}
  losersCount={3}
  compact
/>
```

## Hide Section Headers

For embedded use:

```tsx
<TopMovers
  data={movers}
  showHeaders={false}
/>
```

## Real-Time Updates

Handle streaming price data:

```tsx
function LiveMovers() {
  const [movers, setMovers] = useState<MoverItem[]>([]);

  useEffect(() => {
    const ws = new WebSocket('wss://...');
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setMovers(prev =>
        prev.map(item =>
          item.symbol === update.symbol
            ? { ...item, ...update }
            : item
        )
      );
    };
    return () => ws.close();
  }, []);

  return (
    <TopMovers
      data={movers}
      gainersCount={5}
      losersCount={5}
      updateInterval={5000}
    />
  );
}
```

## Styling

Colors indicate performance:

```css
:root {
  --grid-bid: #22c55e;   /* Gainers (green) */
  --grid-ask: #ef4444;   /* Losers (red) */
}
```

Ranking changes are animated with smooth transitions.
