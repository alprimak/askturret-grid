import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { filterAndSort, isWasmAvailable, type SortDirection as WasmSortDirection } from './wasm';
import { GridCore } from './wasm/GridCore';

/**
 * Column definition for the DataGrid
 */
export interface ColumnDef<T> {
  /** Data field key - supports nested paths like "user.name" */
  field: keyof T | string;
  /** Column header text */
  header: string;
  /** CSS width (e.g., "100px", "20%") */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'right' | 'center';
  /** Enable sorting on this column (default: true) */
  sortable?: boolean;
  /** Custom cell formatter */
  formatter?: (value: unknown, row: T) => string | React.ReactNode;
  /** Dynamic cell CSS class */
  cellClass?: (value: unknown, row: T) => string;
  /** Enable flash highlighting on numeric value changes */
  flashOnChange?: boolean;
}

/**
 * Props for the DataGrid component
 */
export interface DataGridProps<T> {
  /** Data array to display */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Unique row identifier - field name or function */
  rowKey: keyof T | ((row: T) => string);
  /** Message shown when data is empty */
  emptyMessage?: string;
  /** Reduce row height for dense displays */
  compact?: boolean;
  /** Show filter input */
  showFilter?: boolean;
  /** Filter input placeholder text */
  filterPlaceholder?: string;
  /** Fields to include in filter search (default: all columns) */
  filterFields?: (keyof T)[];
  /** Additional CSS class for container */
  className?: string;
  /** Make header sticky (default: true) */
  stickyHeader?: boolean;
  /** Enable virtualization: true, false, or 'auto' (enables at >100 rows) */
  virtualize?: boolean | 'auto';
  /** Row height in pixels for virtualization */
  rowHeight?: number;
  /** Disable flash highlighting */
  disableFlash?: boolean;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /**
   * Use WASM GridCore with trigram indexing for filtering.
   * 'auto' enables for >1000 rows (default), true always, false never.
   */
  useWasmCore?: boolean | 'auto';
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  field: string | null;
  direction: SortDirection;
}

interface FlashEntry {
  direction: 'up' | 'down';
  expiry: number;
}

const FLASH_DURATION = 800;
const FLASH_CLEANUP_INTERVAL = 1000;
const VIRTUALIZATION_THRESHOLD = 100;
const WASM_CORE_THRESHOLD = 1000;
// Flash is now optimized to only track visible rows, so no disable threshold needed

/**
 * High-performance data grid component with virtualization,
 * sorting, filtering, and flash highlighting.
 */
export function DataGrid<T extends object>({
  data,
  columns,
  rowKey,
  emptyMessage = 'No data',
  compact = false,
  showFilter = false,
  filterPlaceholder = 'Filter...',
  filterFields,
  className = '',
  stickyHeader = true,
  virtualize = 'auto',
  rowHeight: rowHeightProp,
  disableFlash = false,
  onRowClick,
  useWasmCore = 'auto',
}: DataGridProps<T>) {
  const [sort, setSort] = useState<SortState>({ field: null, direction: null });
  const [filter, setFilter] = useState('');
  const [, forceUpdate] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const gridCoreRef = useRef<GridCore | null>(null);
  const [wasmCoreReady, setWasmCoreReady] = useState(false);

  const flashMapRef = useRef<Map<string, FlashEntry>>(new Map());
  const prevValuesRef = useRef<Map<string, number>>(new Map());

  const rowHeight = rowHeightProp ?? (compact ? 28 : 36);

  const shouldVirtualize = useMemo(() => {
    if (virtualize === true) return true;
    if (virtualize === false) return false;
    return data.length > VIRTUALIZATION_THRESHOLD;
  }, [virtualize, data.length]);

  const enableFlash = !disableFlash;

  // Determine if we should use WASM GridCore
  const shouldUseWasmCore = useMemo(() => {
    if (useWasmCore === true) return true;
    if (useWasmCore === false) return false;
    return data.length > WASM_CORE_THRESHOLD;
  }, [useWasmCore, data.length]);

  // Initialize GridCore when needed
  useEffect(() => {
    if (!shouldUseWasmCore) {
      if (gridCoreRef.current) {
        gridCoreRef.current.dispose();
        gridCoreRef.current = null;
        setWasmCoreReady(false);
      }
      return;
    }

    let mounted = true;

    async function init() {
      if (gridCoreRef.current) return;

      const core = new GridCore();
      const success = await core.init();
      if (mounted && success) {
        gridCoreRef.current = core;
        setWasmCoreReady(true);
        console.log('[DataGrid] WASM GridCore initialized successfully');
      } else if (mounted) {
        console.warn('[DataGrid] WASM GridCore failed to initialize, using JS fallback');
      }
    }

    init();

    return () => {
      mounted = false;
      if (gridCoreRef.current) {
        gridCoreRef.current.dispose();
        gridCoreRef.current = null;
      }
    };
  }, [shouldUseWasmCore]);

  // Track previous row count to detect structural changes
  const prevRowCountRef = useRef<number>(0);

  // Sync data to GridCore when structure changes (not on every value update)
  useEffect(() => {
    if (!wasmCoreReady || !gridCoreRef.current) return;

    // Only rebuild index when row count changes (structural change)
    // This avoids rebuilding trigram index on every price tick
    if (data.length === prevRowCountRef.current) {
      return;
    }
    prevRowCountRef.current = data.length;

    // Convert row-major data to column-major for GridCore
    // Always send ALL columns so sorting works on any column
    const allFields = columns.map((c) => String(c.field));
    const columnData: unknown[][] = allFields.map((field) =>
      data.map((row) => getNestedValue(row, field))
    );

    gridCoreRef.current.setData(columnData);
  }, [data, columns, filterFields, wasmCoreReady]);

  const getRowKey = useCallback(
    (row: T): string => {
      if (typeof rowKey === 'function') {
        return rowKey(row);
      }
      return String(row[rowKey]);
    },
    [rowKey]
  );

  const flashColumns = useMemo(
    () => columns.filter((col) => col.flashOnChange).map((col) => String(col.field)),
    [columns]
  );

  // Flash detection now happens lazily during render (see updateFlashForRow)
  // This avoids O(n) iteration on every data change

  // Update flash state for a single row (called during render for visible rows only)
  const updateFlashForRow = useCallback(
    (row: T, rowId: string): boolean => {
      if (!enableFlash || flashColumns.length === 0) return false;

      const now = Date.now();
      let hasNewFlash = false;

      flashColumns.forEach((field) => {
        const cellKey = `${rowId}-${field}`;
        const currentValue = getNestedValue(row, field);

        if (typeof currentValue !== 'number') return;

        const prevValue = prevValuesRef.current.get(cellKey);
        prevValuesRef.current.set(cellKey, currentValue);

        if (prevValue === undefined) return;

        if (currentValue !== prevValue) {
          flashMapRef.current.set(cellKey, {
            direction: currentValue > prevValue ? 'up' : 'down',
            expiry: now + FLASH_DURATION,
          });
          hasNewFlash = true;
        }
      });

      return hasNewFlash;
    },
    [enableFlash, flashColumns]
  );

  // Periodic cleanup of expired flashes
  useEffect(() => {
    if (!enableFlash) return;

    const cleanup = setInterval(() => {
      const now = Date.now();
      let cleaned = false;

      flashMapRef.current.forEach((entry, key) => {
        if (entry.expiry <= now) {
          flashMapRef.current.delete(key);
          cleaned = true;
        }
      });

      if (cleaned) {
        forceUpdate((n) => n + 1);
      }
    }, FLASH_CLEANUP_INTERVAL);

    return () => clearInterval(cleanup);
  }, [enableFlash]);

  // Limit map sizes to prevent memory leaks (simple LRU-like cleanup)
  useEffect(() => {
    const maxEntries = 10000; // Keep at most 10k entries
    if (prevValuesRef.current.size > maxEntries) {
      // Clear oldest entries (maps maintain insertion order)
      const entries = Array.from(prevValuesRef.current.keys());
      const toDelete = entries.slice(0, entries.length - maxEntries);
      toDelete.forEach((key) => {
        prevValuesRef.current.delete(key);
        flashMapRef.current.delete(key);
      });
    }
  }, [data.length]);

  // Compute WASM indices in useMemo so they're available during render (not after)
  const wasmIndices = useMemo(() => {
    if (!wasmCoreReady || !gridCoreRef.current) {
      return null;
    }

    // Set filter
    gridCoreRef.current.setFilter(filter);

    // Set sort - find column index in ALL columns (matches setData order)
    if (sort.field && sort.direction) {
      const allFields = columns.map((c) => String(c.field));
      const sortColIndex = allFields.findIndex((f) => f === sort.field);
      if (sortColIndex >= 0) {
        gridCoreRef.current.setSort(sortColIndex, sort.direction);
      } else {
        gridCoreRef.current.setSort(-1, null);
      }
    } else {
      gridCoreRef.current.setSort(-1, null);
    }

    return gridCoreRef.current.getView();
  }, [filter, sort, columns, wasmCoreReady, data.length]);

  // Get row at index - uses WASM indices or direct data access
  const getRowAtIndex = useCallback(
    (index: number): T | undefined => {
      if (wasmCoreReady && wasmIndices) {
        const dataIndex = wasmIndices[index];
        return dataIndex !== undefined ? data[dataIndex] : undefined;
      }
      return data[index];
    },
    [data, wasmCoreReady, wasmIndices]
  );

  // Get total visible count
  const visibleCount = useMemo(() => {
    if (wasmCoreReady && wasmIndices) {
      return wasmIndices.length;
    }

    const fieldsToSearch = filterFields || columns.map((c) => c.field as keyof T);
    const hasFilter = filter.trim().length > 0;

    if (!hasFilter) {
      return data.length;
    }

    // For JS fallback with filter, we need to count
    const lowerFilter = filter.toLowerCase();
    return data.filter((row) =>
      fieldsToSearch.some((field) => {
        const value = getNestedValue(row, String(field));
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerFilter);
      })
    ).length;
  }, [data, filter, filterFields, columns, wasmCoreReady, wasmIndices]);

  // sortedData for non-virtualized mode (still needed for table rendering)
  // For virtualized mode, we use getRowAtIndex directly
  const sortedData = useMemo(() => {
    // For WASM mode with virtualization, return empty - we'll use getRowAtIndex
    if (wasmCoreReady && wasmIndices && shouldVirtualize) {
      // Return a sparse proxy array that uses cached indices
      // This avoids creating 10k item array on every render
      return [] as T[];
    }

    const fieldsToSearch = filterFields || columns.map((c) => c.field as keyof T);
    const hasFilter = filter.trim().length > 0;
    const hasSort = sort.field && sort.direction;

    // Use WASM indices if available (non-virtualized mode)
    if (wasmCoreReady && wasmIndices) {
      return wasmIndices.map((i) => data[i]);
    }

    // Fallback: Try old WASM filterAndSort for medium datasets
    if (isWasmAvailable() && data.length > 1000 && (hasFilter || hasSort)) {
      const filterColumns = fieldsToSearch.map((field) =>
        data.map((row) => getNestedValue(row, String(field)))
      );
      const sortValues = sort.field
        ? data.map((row) => getNestedValue(row, sort.field!))
        : data.map((_, i) => i);
      const direction: WasmSortDirection = sort.direction === 'desc' ? 'desc' : 'asc';
      const indices = filterAndSort(sortValues, filterColumns, filter, direction);
      return indices.map((i) => data[i]);
    }

    // JavaScript fallback
    let result = data;

    if (hasFilter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter((row) =>
        fieldsToSearch.some((field) => {
          const value = getNestedValue(row, String(field));
          if (value == null) return false;
          return String(value).toLowerCase().includes(lowerFilter);
        })
      );
    }

    if (hasSort) {
      result = [...result].sort((a, b) => {
        const aVal = getNestedValue(a, sort.field!);
        const bVal = getNestedValue(b, sort.field!);
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sort.direction === 'asc' ? 1 : -1;
        if (bVal == null) return sort.direction === 'asc' ? -1 : 1;
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filter, filterFields, columns, sort, wasmCoreReady, wasmIndices, shouldVirtualize]);

  const handleSort = (field: string) => {
    setSort((prev) => {
      if (prev.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return { field: null, direction: null };
    });
  };

  const getCellFlashClass = useCallback(
    (rowId: string, field: string): string => {
      if (!enableFlash) return '';
      const cellKey = `${rowId}-${field}`;
      const entry = flashMapRef.current.get(cellKey);
      if (!entry || entry.expiry <= Date.now()) return '';
      return entry.direction === 'up' ? 'flash-up' : 'flash-down';
    },
    [enableFlash]
  );

  // Virtualizer - use visibleCount for WASM mode to avoid sortedData dependency
  const virtualizer = useVirtualizer({
    count: shouldVirtualize && wasmCoreReady ? visibleCount : sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  // Render a single row for standard mode
  const renderTableRow = useCallback(
    (row: T) => {
      const key = getRowKey(row);
      // Lazy flash detection - only for visible rows
      updateFlashForRow(row, key);
      return (
        <tr
          key={key}
          className={onRowClick ? 'clickable' : ''}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {columns.map((col) => {
            const field = String(col.field);
            const value = getNestedValue(row, field);
            const flashClass = col.flashOnChange ? getCellFlashClass(key, field) : '';
            const customClass = col.cellClass ? col.cellClass(value, row) : '';
            const alignClass =
              col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : '';

            return (
              <td key={field} className={`${alignClass} ${flashClass} ${customClass}`.trim()}>
                {col.formatter ? col.formatter(value, row) : String(value ?? '')}
              </td>
            );
          })}
        </tr>
      );
    },
    [columns, getRowKey, getCellFlashClass, onRowClick, updateFlashForRow]
  );

  // Render a virtualized row
  const renderVirtualRow = useCallback(
    (row: T, style: React.CSSProperties) => {
      const key = getRowKey(row);
      // Lazy flash detection - only for visible rows
      updateFlashForRow(row, key);
      return (
        <div
          key={key}
          className={`askturret-grid-virtual-row ${onRowClick ? 'clickable' : ''}`}
          style={style}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {columns.map((col) => {
            const field = String(col.field);
            const value = getNestedValue(row, field);
            const flashClass = col.flashOnChange ? getCellFlashClass(key, field) : '';
            const customClass = col.cellClass ? col.cellClass(value, row) : '';
            const alignClass =
              col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : '';

            return (
              <div
                key={field}
                className={`askturret-grid-virtual-cell ${alignClass} ${flashClass} ${customClass}`.trim()}
                style={{ minWidth: col.width }}
              >
                {col.formatter ? col.formatter(value, row) : String(value ?? '')}
              </div>
            );
          })}
        </div>
      );
    },
    [columns, getRowKey, getCellFlashClass, onRowClick, updateFlashForRow]
  );

  // Render virtualized header
  const renderVirtualHeader = () => (
    <div className="askturret-grid-virtual-header">
      {columns.map((col) => {
        const isSortable = col.sortable !== false;
        const alignClass =
          col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : '';
        const style = { minWidth: col.width };

        return isSortable ? (
          <button
            key={String(col.field)}
            type="button"
            className={`askturret-grid-virtual-header-cell sortable ${alignClass}`}
            style={style}
            onClick={() => handleSort(String(col.field))}
          >
            {col.header}
            {sort.field === String(col.field) && (
              <span className="sort-indicator">{sort.direction === 'asc' ? ' ▲' : ' ▼'}</span>
            )}
          </button>
        ) : (
          <div
            key={String(col.field)}
            className={`askturret-grid-virtual-header-cell ${alignClass}`}
            style={style}
          >
            {col.header}
          </div>
        );
      })}
    </div>
  );

  // Render table header
  const renderTableHeader = () => (
    <tr>
      {columns.map((col) => {
        const isSortable = col.sortable !== false;
        const alignClass =
          col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : '';

        return (
          <th
            key={String(col.field)}
            className={`${isSortable ? 'sortable' : ''} ${alignClass}`}
            style={{ width: col.width }}
            onClick={() => isSortable && handleSort(String(col.field))}
          >
            {col.header}
            {isSortable && sort.field === String(col.field) && (
              <span className="sort-indicator">{sort.direction === 'asc' ? '▲' : '▼'}</span>
            )}
          </th>
        );
      })}
    </tr>
  );

  const containerClass = `askturret-grid ${compact ? 'compact' : ''} ${className}`.trim();

  return (
    <div className={containerClass}>
      {/* Filter input */}
      {showFilter && (
        <div className="askturret-grid-filter">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={filterPlaceholder}
          />
        </div>
      )}

      {/* Table - Virtualized or Standard */}
      {shouldVirtualize ? (
        <div className="askturret-grid-virtual">
          <div className="sticky">{renderVirtualHeader()}</div>
          <div ref={parentRef} className="askturret-grid-virtual-body">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = getRowAtIndex(virtualRow.index);
                if (!row) return null;
                return renderVirtualRow(row, {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                });
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="askturret-grid-body">
          <table>
            <thead className={stickyHeader ? 'sticky' : ''}>{renderTableHeader()}</thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="askturret-grid-empty">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => renderTableRow(row))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Helper to get nested values like "foo.bar" */
function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object' && part in (acc as object)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}
