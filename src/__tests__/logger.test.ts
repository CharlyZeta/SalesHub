import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSystemLogs,
  addSystemLog,
  clearSystemLogs,
  filterSystemLogs,
  exportLogsJSON,
  exportLogsCSV,
  LogEntry
} from '../utils/logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    // Mock localStorage for node environment
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; }
    };
    clearSystemLogs();
  });

  it('starts with an empty log array after clearSystemLogs', () => {
    expect(getSystemLogs()).toEqual([]);
  });

  it('adds a system log entry and persists in storage', () => {
    const entry = addSystemLog('INFO', 'TestCategory', 'Test message', { key: 'value' });
    expect(entry.id).toBeDefined();
    expect(entry.level).toBe('INFO');
    expect(entry.category).toBe('TestCategory');
    expect(entry.message).toBe('Test message');

    const logs = getSystemLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('Test message');
  });

  it('filters logs by level, category, date range, and search query', () => {
    addSystemLog('INFO', 'Sales', 'Created sale V-1');
    addSystemLog('WARN', 'Inventory', 'Low stock alert');
    addSystemLog('ERROR', 'WooCommerce', 'API Connection Timeout', { code: 504 });

    const allLogs = getSystemLogs();
    expect(allLogs.length).toBe(3);

    const warnOnly = filterSystemLogs(allLogs, { level: 'WARN' });
    expect(warnOnly.length).toBe(1);
    expect(warnOnly[0].category).toBe('Inventory');

    const catSales = filterSystemLogs(allLogs, { category: 'sales' });
    expect(catSales.length).toBe(1);

    const searchResult = filterSystemLogs(allLogs, { search: 'Timeout' });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].level).toBe('ERROR');

    const searchByDetails = filterSystemLogs(allLogs, { search: '504' });
    expect(searchByDetails.length).toBe(1);

    const dateFilter = filterSystemLogs(allLogs, {
      startDate: '2020-01-01',
      endDate: '2030-12-31'
    });
    expect(dateFilter.length).toBe(3);
  });

  it('exports logs to valid JSON and CSV strings', () => {
    addSystemLog('SYNC', 'WooCommerce', 'Synced 5 products');
    const logs = getSystemLogs();

    const json = exportLogsJSON(logs);
    expect(json).toContain('Synced 5 products');
    expect(JSON.parse(json)).toBeInstanceOf(Array);

    const csv = exportLogsCSV(logs);
    expect(csv).toContain('ID,Timestamp,Level,Category,Message,Details');
    expect(csv).toContain('Synced 5 products');
  });
});
