/**
 * CSV Export Utility
 *
 * Simple CSV export for grid data with proper escaping.
 */

import type { ColumnDef } from '../DataGrid';

export interface CSVExportOptions {
  /** Filename for download (default: 'export.csv') */
  filename?: string;
  /** Column delimiter (default: ',') */
  delimiter?: string;
  /** Include column headers (default: true) */
  includeHeaders?: boolean;
  /** Trigger browser download (default: true). If false, returns CSV string */
  download?: boolean;
}

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains delimiter, quotes, or newlines
 * - Escapes internal quotes by doubling them
 */
function escapeCSVValue(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Check if we need to quote the value
  const needsQuoting =
    str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r');

  if (needsQuoting) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object' && part in (acc as object)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Export data to CSV format
 *
 * @param data - Array of data objects
 * @param columns - Column definitions (uses field for data access, header for CSV header)
 * @param options - Export options
 * @returns CSV string if download is false, void if download is true
 *
 * @example
 * ```tsx
 * // Trigger download
 * exportToCSV(data, columns, { filename: 'users.csv' });
 *
 * // Get CSV string
 * const csv = exportToCSV(data, columns, { download: false });
 * ```
 */
export function exportToCSV<T>(
  data: T[],
  columns: ColumnDef<T>[],
  options: CSVExportOptions = {}
): string | void {
  const { filename = 'export.csv', delimiter = ',', includeHeaders = true, download = true } = options;

  const rows: string[] = [];

  // Add header row
  if (includeHeaders) {
    const headerRow = columns.map((col) => escapeCSVValue(col.header, delimiter)).join(delimiter);
    rows.push(headerRow);
  }

  // Add data rows
  for (const item of data) {
    const rowValues = columns.map((col) => {
      const value = getNestedValue(item, String(col.field));
      return escapeCSVValue(value, delimiter);
    });
    rows.push(rowValues.join(delimiter));
  }

  const csvContent = rows.join('\n');

  if (download) {
    downloadCSV(csvContent, filename);
    return;
  }

  return csvContent;
}

/**
 * Trigger browser download of CSV content
 */
function downloadCSV(content: string, filename: string): void {
  // Create blob with BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
