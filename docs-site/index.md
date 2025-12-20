---
layout: home

hero:
  name: '@askturret/grid'
  text: 1 million rows. 60 FPS. Zero server.
  tagline: High-performance React data grid with Rust/WASM acceleration. Built for trading applications.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/alprimak/askturret-grid
    - theme: alt
      text: Live Demo
      link: https://grid.askturret.com

features:
  - icon: ⚡
    title: WASM-Powered Performance
    details: Rust core handles sorting, filtering, and aggregation. Sort 100k rows in 12ms.
  - icon: 📊
    title: Trading Components
    details: OrderBook, TimeSales, PositionLadder, and TopMovers built-in. Everything you need for trading UIs.
  - icon: 🎯
    title: Flash Highlighting
    details: Green/red cell flashes on value changes. Adaptive mode auto-disables when FPS drops.
  - icon: 🔧
    title: Column Management
    details: Resizable and reorderable columns with drag & drop. CSV export included.
  - icon: 🎨
    title: Themeable
    details: CSS variables for complete control. Dark mode by default.
  - icon: 📦
    title: Lightweight
    details: ~45kb bundle. No heavy dependencies. TypeScript-first.
---

## Quick Example

```tsx
import { DataGrid } from '@askturret/grid';
import '@askturret/grid/styles.css';

const columns = [
  { field: 'symbol', header: 'Symbol', sortable: true },
  { field: 'price', header: 'Price', flashOnChange: true },
  { field: 'volume', header: 'Volume' },
];

function App() {
  return (
    <DataGrid
      data={positions}
      columns={columns}
      rowKey="symbol"
      showFilter
    />
  );
}
```

## Performance

Tested on AMD Ryzen, Linux, Chrome 131:

| Operation | 10k rows | 100k rows | 1M rows |
|-----------|----------|-----------|---------|
| Initial render | 45ms | 52ms | 68ms |
| Sort (click) | 2ms | 5ms | 18ms |
| Filter (trigram) | <1ms | <1ms | <2ms |
| 10% row update | <16ms | <16ms | <16ms |

## Part of AskTurret

This grid is extracted from [AskTurret](https://askturret.com), an AI-native desktop platform for traders.
