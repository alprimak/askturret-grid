# Theming

Customize the grid appearance using CSS variables.

## Default Theme

The grid uses a dark theme by default, optimized for trading applications:

```css
:root {
  /* Backgrounds */
  --grid-bg: #0a0a0f;
  --grid-surface: #12121a;
  --grid-border: #2a2a3a;

  /* Text */
  --grid-text: #e4e4e7;
  --grid-muted: #71717a;

  /* Accent */
  --grid-accent: #3b82f6;

  /* Flash colors */
  --grid-flash-up: rgba(34, 197, 94, 0.4);
  --grid-flash-down: rgba(239, 68, 68, 0.4);

  /* Trading colors */
  --grid-bid: #22c55e;
  --grid-ask: #ef4444;
}
```

## Light Theme

Override variables for a light theme:

```css
.light-theme {
  --grid-bg: #ffffff;
  --grid-surface: #f4f4f5;
  --grid-border: #e4e4e7;
  --grid-text: #18181b;
  --grid-muted: #71717a;
  --grid-accent: #2563eb;
  --grid-flash-up: rgba(34, 197, 94, 0.3);
  --grid-flash-down: rgba(239, 68, 68, 0.3);
  --grid-bid: #16a34a;
  --grid-ask: #dc2626;
}
```

Apply the class to the grid container:

```tsx
<div className="light-theme">
  <DataGrid data={data} columns={columns} rowKey="id" />
</div>
```

## Custom Brand Colors

Match your application's brand:

```css
.brand-theme {
  --grid-accent: #8b5cf6;     /* Purple accent */
  --grid-bid: #10b981;        /* Teal for positive */
  --grid-ask: #f43f5e;        /* Rose for negative */
}
```

## Component Scoping

Apply different themes to different grids:

```tsx
<div className="dark-theme">
  <DataGrid data={positions} columns={positionColumns} rowKey="id" />
</div>

<div className="light-theme">
  <DataGrid data={orders} columns={orderColumns} rowKey="id" />
</div>
```

## Available Variables

### Layout

| Variable | Default | Description |
|----------|---------|-------------|
| `--grid-bg` | `#0a0a0f` | Main background |
| `--grid-surface` | `#12121a` | Surface/card background |
| `--grid-border` | `#2a2a3a` | Border color |

### Typography

| Variable | Default | Description |
|----------|---------|-------------|
| `--grid-text` | `#e4e4e7` | Primary text |
| `--grid-muted` | `#71717a` | Secondary/muted text |

### Interactive

| Variable | Default | Description |
|----------|---------|-------------|
| `--grid-accent` | `#3b82f6` | Accent/highlight color |
| `--grid-hover` | `rgba(255,255,255,0.05)` | Row hover background |

### Trading

| Variable | Default | Description |
|----------|---------|-------------|
| `--grid-bid` | `#22c55e` | Bid/buy/positive color |
| `--grid-ask` | `#ef4444` | Ask/sell/negative color |
| `--grid-flash-up` | `rgba(34, 197, 94, 0.4)` | Flash up background |
| `--grid-flash-down` | `rgba(239, 68, 68, 0.4)` | Flash down background |

## Row Styling

### Row Height

```css
.askturret-grid-row {
  height: 40px;  /* Default: 36px */
}

.askturret-grid.compact .askturret-grid-row {
  height: 28px;  /* Compact mode */
}
```

### Alternating Rows

```css
.askturret-grid-row:nth-child(even) {
  background: var(--grid-surface);
}
```

### Hover Effect

```css
.askturret-grid-row:hover {
  background: var(--grid-hover);
}
```

## Header Styling

```css
.askturret-grid-header {
  background: var(--grid-surface);
  border-bottom: 1px solid var(--grid-border);
}

.askturret-grid-header-cell {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}
```

## Cell Styling

```css
/* All cells */
.askturret-grid-cell {
  padding: 0 12px;
}

/* Numeric cells */
.askturret-grid-cell[data-align="right"] {
  font-variant-numeric: tabular-nums;
}
```

## Filter Input

```css
.askturret-grid-filter {
  background: var(--grid-surface);
  border: 1px solid var(--grid-border);
  color: var(--grid-text);
}

.askturret-grid-filter:focus {
  border-color: var(--grid-accent);
  outline: none;
}
```

## Trading Components

Each component inherits from the same CSS variables:

### OrderBook

```css
.askturret-orderbook-bid {
  color: var(--grid-bid);
}

.askturret-orderbook-ask {
  color: var(--grid-ask);
}

.askturret-orderbook-depth-bar-bid {
  background: var(--grid-bid);
  opacity: 0.2;
}
```

### TimeSales

```css
.askturret-timesales-buy {
  color: var(--grid-bid);
}

.askturret-timesales-sell {
  color: var(--grid-ask);
}
```

## System Preference Detection

Respect user's system theme preference:

```css
@media (prefers-color-scheme: light) {
  :root {
    --grid-bg: #ffffff;
    --grid-surface: #f4f4f5;
    --grid-border: #e4e4e7;
    --grid-text: #18181b;
    /* ... other light theme variables */
  }
}
```

Or use JavaScript:

```tsx
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

<div className={prefersDark ? 'dark-theme' : 'light-theme'}>
  <DataGrid ... />
</div>
```

## Example: Bloomberg Terminal Style

```css
.bloomberg-theme {
  --grid-bg: #000000;
  --grid-surface: #1a1a1a;
  --grid-border: #333333;
  --grid-text: #ff9900;
  --grid-muted: #666666;
  --grid-accent: #ff9900;
  --grid-bid: #00ff00;
  --grid-ask: #ff0000;

  font-family: 'Consolas', 'Monaco', monospace;
}
```
