export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SYNC' | 'API' | 'SALE' | 'BUDGET';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, any> | string;
}

const STORAGE_KEY = 'app_system_logs_v1';
const MAX_LOGS = 500;
let memoryLogs: LogEntry[] = [];

export const getSystemLogs = (): LogEntry[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error reading logs from storage:', error);
  }
  return memoryLogs;
};

export const addSystemLog = (
  level: LogLevel,
  category: string,
  message: string,
  details?: Record<string, any> | string
): LogEntry => {
  const newLog: LogEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details
  };

  try {
    const currentLogs = getSystemLogs();
    const updated = [newLog, ...currentLogs].slice(0, MAX_LOGS);
    memoryLogs = updated;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('app-system-log-added', { detail: newLog }));
    }
  } catch (error) {
    console.error('Error saving log to storage:', error);
  }

  return newLog;
};

export const clearSystemLogs = (): void => {
  try {
    memoryLogs = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('app-system-log-cleared'));
    }
  } catch (error) {
    console.error('Error clearing system logs:', error);
  }
};

export interface LogFilterOptions {
  level?: string;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const filterSystemLogs = (logs: LogEntry[], options: LogFilterOptions): LogEntry[] => {
  return logs.filter((log) => {
    if (options.level && options.level !== 'ALL' && log.level !== options.level) {
      return false;
    }
    if (options.category && options.category !== 'ALL' && log.category.toLowerCase() !== options.category.toLowerCase()) {
      return false;
    }
    if (options.search) {
      const query = options.search.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(query);
      const matchCat = log.category.toLowerCase().includes(query);
      const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(query) : false;
      if (!matchMsg && !matchCat && !matchDetails) return false;
    }
    if (options.startDate) {
      if (new Date(log.timestamp) < new Date(options.startDate)) return false;
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(log.timestamp) > end) return false;
    }
    return true;
  });
};

export const exportLogsJSON = (logs: LogEntry[]): string => {
  return JSON.stringify(logs, null, 2);
};

export const exportLogsCSV = (logs: LogEntry[]): string => {
  const headers = ['ID', 'Timestamp', 'Level', 'Category', 'Message', 'Details'];
  const rows = logs.map((log) => [
    `"${log.id}"`,
    `"${log.timestamp}"`,
    `"${log.level}"`,
    `"${log.category.replace(/"/g, '""')}"`,
    `"${log.message.replace(/"/g, '""')}"`,
    `"${(log.details ? JSON.stringify(log.details) : '').replace(/"/g, '""')}"`
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};
