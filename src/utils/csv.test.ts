import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV } from './csv';
import type { ColumnDef } from '../DataGrid';

interface TestRow {
  id: number;
  name: string;
  value: number;
  status: string;
}

const testData: TestRow[] = [
  { id: 1, name: 'Alice', value: 100, status: 'active' },
  { id: 2, name: 'Bob', value: 200, status: 'pending' },
  { id: 3, name: 'Charlie', value: 150, status: 'active' },
];

const columns: ColumnDef<TestRow>[] = [
  { field: 'id', header: 'ID' },
  { field: 'name', header: 'Name' },
  { field: 'value', header: 'Value' },
  { field: 'status', header: 'Status' },
];

describe('exportToCSV', () => {
  describe('basic functionality', () => {
    it('generates CSV with headers and data', () => {
      const csv = exportToCSV(testData, columns, { download: false });

      expect(csv).toBe(
        'ID,Name,Value,Status\n' + '1,Alice,100,active\n' + '2,Bob,200,pending\n' + '3,Charlie,150,active'
      );
    });

    it('generates CSV without headers when includeHeaders is false', () => {
      const csv = exportToCSV(testData, columns, { download: false, includeHeaders: false });

      expect(csv).toBe('1,Alice,100,active\n' + '2,Bob,200,pending\n' + '3,Charlie,150,active');
    });

    it('uses custom delimiter', () => {
      const csv = exportToCSV(testData, columns, { download: false, delimiter: ';' });

      expect(csv).toBe(
        'ID;Name;Value;Status\n' + '1;Alice;100;active\n' + '2;Bob;200;pending\n' + '3;Charlie;150;active'
      );
    });

    it('handles empty data array', () => {
      const csv = exportToCSV([], columns, { download: false });

      expect(csv).toBe('ID,Name,Value,Status');
    });

    it('handles empty columns array', () => {
      const csv = exportToCSV(testData, [], { download: false });

      expect(csv).toBe('\n\n\n');
    });
  });

  describe('CSV escaping', () => {
    it('escapes values containing commas', () => {
      const data = [{ id: 1, name: 'Smith, John', value: 100, status: 'active' }];
      const csv = exportToCSV(data, columns, { download: false });

      expect(csv).toContain('"Smith, John"');
    });

    it('escapes values containing quotes', () => {
      const data = [{ id: 1, name: 'John "Johnny" Smith', value: 100, status: 'active' }];
      const csv = exportToCSV(data, columns, { download: false });

      expect(csv).toContain('"John ""Johnny"" Smith"');
    });

    it('escapes values containing newlines', () => {
      const data = [{ id: 1, name: 'Line1\nLine2', value: 100, status: 'active' }];
      const csv = exportToCSV(data, columns, { download: false });

      expect(csv).toContain('"Line1\nLine2"');
    });

    it('escapes header values containing delimiter', () => {
      const columnsWithComma: ColumnDef<TestRow>[] = [{ field: 'name', header: 'Full, Name' }];
      const csv = exportToCSV(testData, columnsWithComma, { download: false });

      expect(csv).toContain('"Full, Name"');
    });

    it('handles null and undefined values', () => {
      const data = [{ id: 1, name: null as unknown as string, value: undefined as unknown as number, status: 'active' }];
      const csv = exportToCSV(data, columns, { download: false });

      expect(csv).toBe('ID,Name,Value,Status\n1,,,active');
    });
  });

  describe('nested field access', () => {
    it('supports nested field paths', () => {
      interface NestedRow {
        id: number;
        user: { name: string };
      }

      const nestedData: NestedRow[] = [
        { id: 1, user: { name: 'Alice' } },
        { id: 2, user: { name: 'Bob' } },
      ];

      const nestedColumns: ColumnDef<NestedRow>[] = [
        { field: 'id', header: 'ID' },
        { field: 'user.name', header: 'User Name' },
      ];

      const csv = exportToCSV(nestedData, nestedColumns, { download: false });

      expect(csv).toBe('ID,User Name\n1,Alice\n2,Bob');
    });
  });

  describe('download functionality', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockAppendChild: ReturnType<typeof vi.fn>;
    let mockRemoveChild: ReturnType<typeof vi.fn>;
    let mockClick: ReturnType<typeof vi.fn>;
    let createdLink: HTMLAnchorElement | null = null;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      mockRevokeObjectURL = vi.fn();
      mockAppendChild = vi.fn();
      mockRemoveChild = vi.fn();
      mockClick = vi.fn();

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        mockAppendChild(node);
        createdLink = node as HTMLAnchorElement;
        return node;
      });

      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
        mockRemoveChild(node);
        return node;
      });

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          const link = {
            href: '',
            download: '',
            click: mockClick,
          } as unknown as HTMLAnchorElement;
          return link;
        }
        return document.createElement(tag);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      createdLink = null;
    });

    it('triggers download when download option is true', () => {
      exportToCSV(testData, columns, { download: true, filename: 'test.csv' });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('uses default filename when not specified', () => {
      exportToCSV(testData, columns, { download: true });

      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('returns void when download is true', () => {
      const result = exportToCSV(testData, columns, { download: true });

      expect(result).toBeUndefined();
    });

    it('returns string when download is false', () => {
      const result = exportToCSV(testData, columns, { download: false });

      expect(typeof result).toBe('string');
    });
  });
});
