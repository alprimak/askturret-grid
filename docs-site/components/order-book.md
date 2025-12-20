# OrderBook

Level 2 market depth visualization with bid/ask sides, depth bars, and spread indicator.

## Basic Usage

```tsx
import { OrderBook } from '@askturret/grid';
import '@askturret/grid/styles.css';

const data = {
  bids: [
    { price: 100.50, size: 500 },
    { price: 100.25, size: 300 },
    { price: 100.00, size: 800 },
  ],
  asks: [
    { price: 100.75, size: 400 },
    { price: 101.00, size: 200 },
    { price: 101.25, size: 600 },
  ],
};

<OrderBook data={data} levels={10} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `OrderBookData` | required | Order book data with bids and asks |
| `levels` | `number` | `10` | Number of price levels to show per side |
| `priceDecimals` | `number` | `2` | Price decimal places |
| `quantityDecimals` | `number` | `0` | Quantity decimal places |
| `showSpread` | `boolean` | `true` | Show spread indicator between bid/ask |
| `showDepthBars` | `boolean` | `true` | Show depth visualization bars |
| `showOrderCount` | `boolean` | `false` | Show order count column |
| `compact` | `boolean` | `false` | Compact mode for smaller displays |
| `onPriceClick` | `(price: number, side: 'bid' \| 'ask') => void` | - | Price level click handler |
| `flashOnChange` | `boolean` | `true` | Flash on quantity changes |

## Data Types

```tsx
interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

interface OrderBookLevel {
  price: number;
  size: number;
  orders?: number;  // Optional order count
}
```

## Depth Bars

Depth bars visualize the relative size at each price level:

```tsx
<OrderBook
  data={data}
  levels={15}
  showDepthBars={true}  // Default
/>
```

The bar width represents the cumulative size up to that price level.

## Spread Indicator

Shows the spread between best bid and ask:

```tsx
<OrderBook
  data={data}
  showSpread={true}  // Default
/>
```

Displays: `Spread: 0.25 (0.25%)`

## Price Click Handler

Handle clicks on price levels for order entry:

```tsx
<OrderBook
  data={data}
  levels={10}
  onPriceClick={(price, side) => {
    console.log(`Clicked ${side} at ${price}`);
    // Open order entry dialog
    setOrderPrice(price);
    setOrderSide(side);
  }}
/>
```

## Order Count

Display the number of orders at each level:

```tsx
const data = {
  bids: [
    { price: 100.50, size: 500, orders: 12 },
    { price: 100.25, size: 300, orders: 8 },
  ],
  asks: [
    { price: 100.75, size: 400, orders: 5 },
  ],
};

<OrderBook
  data={data}
  levels={10}
  showOrderCount={true}
/>
```

## Compact Mode

For smaller displays or side panels:

```tsx
<OrderBook
  data={data}
  levels={5}
  compact
/>
```

## Real-Time Updates

The component handles real-time updates efficiently:

```tsx
function LiveOrderBook() {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const ws = new WebSocket('wss://...');
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setData(prev => mergeOrderBook(prev, update));
    };
    return () => ws.close();
  }, []);

  return <OrderBook data={data} levels={10} flashOnChange />;
}
```

## Styling

The OrderBook uses CSS variables for theming:

```css
:root {
  --grid-bid: #22c55e;     /* Bid side color */
  --grid-ask: #ef4444;     /* Ask side color */
  --grid-surface: #12121a; /* Background */
}
```

See [Theming](/guides/theming) for full customization options.
