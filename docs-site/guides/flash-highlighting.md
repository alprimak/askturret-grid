# Flash Highlighting

Cells flash green or red when numeric values change. Essential for real-time trading data.

## Enable Flash

Add `flashOnChange: true` to column definitions:

```tsx
const columns = [
  { field: 'symbol', header: 'Symbol' },
  { field: 'price', header: 'Price', flashOnChange: true },
  { field: 'volume', header: 'Volume', flashOnChange: true },
];
```

## How It Works

When a cell value changes:
- **Increase**: Cell flashes green
- **Decrease**: Cell flashes red
- Animation duration: 300ms

The grid tracks previous values by row key, so each row's changes are detected independently.

## Disable Globally

Disable all flash highlighting:

```tsx
<DataGrid
  data={data}
  columns={columns}
  rowKey="id"
  disableFlash
/>
```

Useful for:
- Initial data load (avoid all cells flashing)
- Low-power mode
- Accessibility preferences

## Adaptive Mode

Flash highlighting automatically disables when performance drops:

```tsx
// The grid monitors FPS internally
// When FPS drops below 55, flash effects are temporarily disabled
// When FPS recovers above 58, flash effects resume
```

This ensures smooth scrolling and interaction even with high update rates.

### How Adaptive Mode Works

1. The `useAdaptiveFlash` hook monitors frame rate
2. Uses `requestAnimationFrame` timing for FPS calculation
3. Hysteresis prevents rapid toggling (55 FPS off, 58 FPS on)

## Customize Flash Colors

Use CSS variables:

```css
:root {
  --grid-flash-up: rgba(34, 197, 94, 0.4);   /* Green flash */
  --grid-flash-down: rgba(239, 68, 68, 0.4); /* Red flash */
}

/* Custom colors */
.my-grid {
  --grid-flash-up: rgba(0, 255, 0, 0.3);
  --grid-flash-down: rgba(255, 0, 0, 0.3);
}
```

## Flash Animation

The default animation:

```css
@keyframes askturret-grid-flash-up {
  0% { background-color: var(--grid-flash-up); }
  100% { background-color: transparent; }
}

@keyframes askturret-grid-flash-down {
  0% { background-color: var(--grid-flash-down); }
  100% { background-color: transparent; }
}

.askturret-grid-flash-up {
  animation: askturret-grid-flash-up 300ms ease-out;
}

.askturret-grid-flash-down {
  animation: askturret-grid-flash-down 300ms ease-out;
}
```

Override to customize duration or easing:

```css
.askturret-grid-flash-up {
  animation-duration: 500ms;
  animation-timing-function: linear;
}
```

## Performance Considerations

### Lazy Detection

Flash detection only runs for **visible rows**. Rows outside the viewport don't trigger comparisons.

### Update Rate

The grid handles high update rates efficiently:
- 100+ updates per second sustained
- Flash animations are batched per frame
- DOM updates are minimized

### Best Practices

1. **Use row keys**: Ensure `rowKey` correctly identifies rows for accurate change detection

2. **Batch updates**: If possible, batch multiple row updates into a single state update:
   ```tsx
   // Good - single state update
   setData(prev => updateMultipleRows(prev, updates));

   // Avoid - multiple state updates
   updates.forEach(update => {
     setData(prev => updateRow(prev, update));
   });
   ```

3. **Immutable updates**: Create new row objects when values change:
   ```tsx
   // Good - new object reference
   setData(prev => prev.map(row =>
     row.id === id ? { ...row, price: newPrice } : row
   ));

   // Bad - mutating existing object
   data.find(row => row.id === id).price = newPrice;
   setData([...data]);
   ```

## Trading Component Flash

All trading components support flash highlighting:

### OrderBook

```tsx
<OrderBook
  data={data}
  flashOnChange={true}  // Default
/>
```

### TimeSales

```tsx
<TimeSales
  trades={trades}
  flashOnNew={true}  // Flash new trades
/>
```

### PositionLadder

```tsx
<PositionLadder
  levels={levels}
  tickSize={0.25}
  centerPrice={100}
  flashOnChange={true}  // Default
/>
```
