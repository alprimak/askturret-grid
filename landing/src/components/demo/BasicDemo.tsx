import { useState } from 'react';
import { DataGrid, type ColumnDef, exportToCSV } from '@askturret/grid';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
}

const users: User[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Admin',
    status: 'active',
    lastLogin: '2024-01-15',
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'User',
    status: 'active',
    lastLogin: '2024-01-14',
  },
  {
    id: 3,
    name: 'Carol Williams',
    email: 'carol@example.com',
    role: 'User',
    status: 'pending',
    lastLogin: '2024-01-10',
  },
  {
    id: 4,
    name: 'David Brown',
    email: 'david@example.com',
    role: 'Editor',
    status: 'active',
    lastLogin: '2024-01-15',
  },
  {
    id: 5,
    name: 'Eve Davis',
    email: 'eve@example.com',
    role: 'User',
    status: 'inactive',
    lastLogin: '2023-12-20',
  },
  {
    id: 6,
    name: 'Frank Miller',
    email: 'frank@example.com',
    role: 'Admin',
    status: 'active',
    lastLogin: '2024-01-15',
  },
  {
    id: 7,
    name: 'Grace Wilson',
    email: 'grace@example.com',
    role: 'Editor',
    status: 'active',
    lastLogin: '2024-01-13',
  },
  {
    id: 8,
    name: 'Henry Taylor',
    email: 'henry@example.com',
    role: 'User',
    status: 'pending',
    lastLogin: '2024-01-08',
  },
];

const columns: ColumnDef<User>[] = [
  { field: 'name', header: 'Name', sortable: true },
  { field: 'email', header: 'Email', sortable: true },
  { field: 'role', header: 'Role', sortable: true, width: '100px' },
  {
    field: 'status',
    header: 'Status',
    width: '100px',
    sortable: true,
    formatter: (value) => {
      const status = value as string;
      const colors: Record<string, string> = {
        active: '#00c853',
        inactive: '#6b6b7b',
        pending: '#ffc107',
      };
      return (
        <span style={{ color: colors[status] }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      );
    },
  },
  { field: 'lastLogin', header: 'Last Login', align: 'right', sortable: true, width: '120px' },
];

// Columns for CSV export (without JSX formatters)
const exportColumns: ColumnDef<User>[] = [
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
  { field: 'role', header: 'Role' },
  { field: 'status', header: 'Status' },
  { field: 'lastLogin', header: 'Last Login' },
];

export function BasicDemo() {
  const [resizable, setResizable] = useState(false);
  const [reorderable, setReorderable] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const handleColumnResize = (field: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [field]: width }));
  };

  const handleColumnReorder = (newOrder: string[]) => {
    setColumnOrder(newOrder);
  };

  const resetColumns = () => {
    setColumnWidths({});
    setColumnOrder([]);
  };

  const handleExport = () => {
    exportToCSV(users, exportColumns, { filename: 'users.csv' });
  };

  return (
    <div className="demo-section">
      <div className="demo-header">
        <span className="demo-title">Basic DataGrid</span>
        <div className="demo-controls">
          <span style={{ fontSize: 12, color: '#6b6b7b' }}>
            Click column headers to sort • Use filter to search
          </span>
          <button onClick={handleExport} className="start">
            Export CSV
          </button>
        </div>
      </div>
      <div className="demo-options">
        <label>
          <input type="checkbox" checked={resizable} onChange={(e) => setResizable(e.target.checked)} />{' '}
          Resizable Columns
        </label>
        <label>
          <input type="checkbox" checked={reorderable} onChange={(e) => setReorderable(e.target.checked)} />{' '}
          Reorderable Columns
        </label>
        {(Object.keys(columnWidths).length > 0 || columnOrder.length > 0) && (
          <button onClick={resetColumns} style={{ marginLeft: 'auto' }}>
            Reset Columns
          </button>
        )}
      </div>
      <div className="demo-content">
        <DataGrid
          data={users}
          columns={columns}
          rowKey="id"
          showFilter
          filterPlaceholder="Search users..."
          filterFields={['name', 'email', 'role', 'status']}
          resizable={resizable}
          reorderable={reorderable}
          columnWidths={Object.keys(columnWidths).length > 0 ? columnWidths : undefined}
          onColumnResize={handleColumnResize}
          columnOrder={columnOrder.length > 0 ? columnOrder : undefined}
          onColumnReorder={handleColumnReorder}
        />
      </div>
      {(Object.keys(columnWidths).length > 0 || columnOrder.length > 0) && (
        <div className="demo-options" style={{ borderTop: '1px solid #1e1e2e', marginTop: 0 }}>
          <div style={{ fontSize: 11, color: '#6b6b7b' }}>
            {Object.keys(columnWidths).length > 0 && <span>Widths: {JSON.stringify(columnWidths)}</span>}
            {Object.keys(columnWidths).length > 0 && columnOrder.length > 0 && <span> | </span>}
            {columnOrder.length > 0 && <span>Order: {JSON.stringify(columnOrder)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
