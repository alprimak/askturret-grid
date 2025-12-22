import { useState } from 'react';
import { DataGrid, type ColumnDef } from '@askturret/grid';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

const products: Product[] = [
  { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 1299.99, stock: 45 },
  { id: 2, name: 'Wireless Mouse', category: 'Electronics', price: 49.99, stock: 230 },
  { id: 3, name: 'Standing Desk', category: 'Furniture', price: 599.0, stock: 18 },
  { id: 4, name: 'Monitor 27"', category: 'Electronics', price: 349.99, stock: 67 },
  { id: 5, name: 'Ergonomic Chair', category: 'Furniture', price: 449.0, stock: 32 },
  { id: 6, name: 'Keyboard Mechanical', category: 'Electronics', price: 149.99, stock: 89 },
  { id: 7, name: 'Desk Lamp', category: 'Furniture', price: 79.99, stock: 156 },
  { id: 8, name: 'Webcam HD', category: 'Electronics', price: 89.99, stock: 201 },
];

const columns: ColumnDef<Product>[] = [
  { field: 'name', header: 'Product Name', sortable: true },
  { field: 'category', header: 'Category', sortable: true, width: '120px' },
  {
    field: 'price',
    header: 'Price',
    align: 'right',
    width: '100px',
    sortable: true,
    formatter: (v) => `$${(v as number).toFixed(2)}`,
  },
  {
    field: 'stock',
    header: 'Stock',
    align: 'right',
    width: '80px',
    sortable: true,
    cellClass: (v) => {
      const stock = v as number;
      if (stock < 30) return 'low-stock';
      if (stock < 100) return 'medium-stock';
      return 'high-stock';
    },
  },
];

type Theme = 'dark' | 'light' | 'blue' | 'green';

const themes: Record<Theme, Record<string, string>> = {
  dark: {
    '--grid-bg': '#0a0a0f',
    '--grid-surface': '#12121a',
    '--grid-border': '#1e1e2e',
    '--grid-text': '#e1e1e6',
    '--grid-text-muted': '#6b6b7b',
    '--grid-accent': '#00d4aa',
    '--grid-flash-up': 'rgba(0, 200, 83, 0.4)',
    '--grid-flash-down': 'rgba(255, 82, 82, 0.4)',
  },
  light: {
    '--grid-bg': '#ffffff',
    '--grid-surface': '#f5f5f5',
    '--grid-border': '#e0e0e0',
    '--grid-text': '#1a1a1a',
    '--grid-text-muted': '#666666',
    '--grid-accent': '#1976d2',
    '--grid-flash-up': 'rgba(76, 175, 80, 0.3)',
    '--grid-flash-down': 'rgba(244, 67, 54, 0.3)',
  },
  blue: {
    '--grid-bg': '#0d1b2a',
    '--grid-surface': '#1b263b',
    '--grid-border': '#415a77',
    '--grid-text': '#e0e1dd',
    '--grid-text-muted': '#778da9',
    '--grid-accent': '#00b4d8',
    '--grid-flash-up': 'rgba(0, 180, 216, 0.4)',
    '--grid-flash-down': 'rgba(255, 107, 107, 0.4)',
  },
  green: {
    '--grid-bg': '#1a1a2e',
    '--grid-surface': '#16213e',
    '--grid-border': '#0f3460',
    '--grid-text': '#e8f4f8',
    '--grid-text-muted': '#94b8b8',
    '--grid-accent': '#4ecca3',
    '--grid-flash-up': 'rgba(78, 204, 163, 0.4)',
    '--grid-flash-down': 'rgba(231, 111, 81, 0.4)',
  },
};

export function ThemingDemo() {
  const [theme, setTheme] = useState<Theme>('dark');

  return (
    <div className="demo-section">
      <div className="demo-header">
        <span className="demo-title">CSS Variable Theming</span>
        <div className="demo-controls">
          <div className="control-group">
            <span className="control-label">Theme:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              style={{
                padding: '4px 8px',
                background: '#12121a',
                border: '1px solid #1e1e2e',
                borderRadius: '4px',
                color: '#e1e1e6',
              }}
            >
              <option value="dark">Terminal Dark</option>
              <option value="light">Light</option>
              <option value="blue">Ocean Blue</option>
              <option value="green">Forest Green</option>
            </select>
          </div>
        </div>
      </div>
      <div className="demo-content" style={themes[theme] as React.CSSProperties}>
        <DataGrid
          data={products}
          columns={columns}
          rowKey="id"
          showFilter
          filterPlaceholder="Search products..."
        />
      </div>
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #1e1e2e',
          fontSize: '12px',
          color: '#6b6b7b',
        }}
      >
        <strong>CSS Variables:</strong>
        <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {Object.entries(themes[theme])
            .map(([key, value]) => `${key}: ${value};`)
            .join('\n')}
        </pre>
      </div>
      <style>{`
        .low-stock { color: #ff5252 !important; }
        .medium-stock { color: #ffc107 !important; }
        .high-stock { color: #00c853 !important; }
      `}</style>
    </div>
  );
}
