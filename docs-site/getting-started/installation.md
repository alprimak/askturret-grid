# Installation

## Package Manager

::: code-group

```bash [npm]
npm install @askturret/grid
```

```bash [pnpm]
pnpm add @askturret/grid
```

```bash [yarn]
yarn add @askturret/grid
```

:::

## Import Styles

The grid requires CSS to be imported. Add this to your app's entry point:

```tsx
import '@askturret/grid/styles.css';
```

Or import individual component styles:

```tsx
import '@askturret/grid/src/styles/grid.css';
import '@askturret/grid/src/styles/orderbook.css';
import '@askturret/grid/src/styles/timesales.css';
import '@askturret/grid/src/styles/positionladder.css';
import '@askturret/grid/src/styles/topmovers.css';
```

## Peer Dependencies

The package requires React 18+:

```json
{
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

## WASM Core (Optional)

For maximum performance with 100k+ rows, install the optional WASM core:

```bash
npm install @askturret/grid-wasm
```

The grid automatically detects and uses the WASM core when available. Without it, the grid falls back to pure JavaScript implementations.

## TypeScript

The package includes TypeScript definitions. No additional `@types` package needed.

```tsx
import { DataGrid, type ColumnDef } from '@askturret/grid';

interface User {
  id: number;
  name: string;
  email: string;
}

const columns: ColumnDef<User>[] = [
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
];
```

## Next Steps

- [Quick Start](/getting-started/quick-start) - Build your first grid
- [TypeScript Guide](/getting-started/typescript) - Type-safe column definitions
