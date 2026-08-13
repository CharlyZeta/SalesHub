import { Sale, Budget, Customer, CatalogProduct, AppConfig, WooCommerceConfig, BackupConfig } from '../types';

export interface FullAppState {
  sales: Sale[];
  catalog: CatalogProduct[];
  budgets: Budget[];
  customers: Customer[];
  config: AppConfig;
  wooConfig: WooCommerceConfig;
}

export interface BackupItem {
  filename: string;
  date: string;
  size: number;
  source: 'server' | 'indexedDB';
}

const DB_NAME = 'SalesHubBackups';
const STORE_NAME = 'backups';

// Open IndexedDB connection
const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'filename' });
      }
    };
  });
};

// Save a backup to IndexedDB
export const saveToIndexedDb = async (filename: string, data: FullAppState): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const jsonStr = JSON.stringify(data);
    const item = {
      filename,
      date: new Date().toISOString(),
      size: jsonStr.length,
      data
    };
    
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// List all backups from IndexedDB
export const listFromIndexedDb = async (): Promise<BackupItem[]> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const items = request.result || [];
      const backupItems: BackupItem[] = items.map(item => ({
        filename: item.filename,
        date: item.date,
        size: item.size,
        source: 'indexedDB'
      }));
      resolve(backupItems.sort((a, b) => b.date.localeCompare(a.date)));
    };
    request.onerror = () => reject(request.error);
  });
};

// Retrieve specific backup from IndexedDB
export const getFromIndexedDb = async (filename: string): Promise<FullAppState> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(filename);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data);
      } else {
        reject(new Error(`Backup ${filename} no encontrado en navegador`));
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Delete backup from IndexedDB
export const deleteFromIndexedDb = async (filename: string): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(filename);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Backend API Integration ---

export const saveToBackend = async (data: FullAppState): Promise<{ success: boolean; filename: string; timestamp: string }> => {
  const response = await fetch('/api/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.statusText}`);
  }
  return response.json();
};

export const listFromBackend = async (): Promise<BackupItem[]> => {
  try {
    const response = await fetch('/api/backup/list');
    if (!response.ok) return [];
    const files = await response.json();
    return files.map((f: any) => ({
      filename: f.filename,
      date: f.date,
      size: f.size,
      source: 'server' as const
    }));
  } catch (e) {
    // Fail silently if server is offline or not running Vite dev server
    return [];
  }
};

export const getFromBackend = async (filename: string): Promise<FullAppState> => {
  const response = await fetch('/api/backup/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  if (!response.ok) {
    throw new Error(`Error del servidor al recuperar backup: ${response.statusText}`);
  }
  return response.json();
};

// --- Unified runners ---

// Generate a new backup manual or auto
export const runBackup = async (
  state: FullAppState
): Promise<{ filename: string; successServer: boolean; successIndexedDb: boolean }> => {
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `backup-${dateStr}-${timeStr}.json`;
  
  let successServer = false;
  let successIndexedDb = false;
  
  // 1. Try to save to Server
  try {
    const serverResult = await saveToBackend(state);
    if (serverResult && serverResult.success) {
      successServer = true;
    }
  } catch (e) {
    console.warn('Servidor de desarrollo no disponible para backup en disco.', e);
  }
  
  // 2. Always save to IndexedDB
  try {
    await saveToIndexedDb(filename, state);
    successIndexedDb = true;
  } catch (e) {
    console.error('Error al guardar backup en IndexedDB del navegador.', e);
  }
  
  return { filename, successServer, successIndexedDb };
};

// List unified backups
export const listAllBackups = async (): Promise<BackupItem[]> => {
  const dbItems = await listFromIndexedDb();
  const serverItems = await listFromBackend();
  
  // Merge and sort by date descending
  return [...serverItems, ...dbItems].sort((a, b) => b.date.localeCompare(a.date));
};

// Restore a backup
export const restoreBackup = async (item: BackupItem): Promise<FullAppState> => {
  if (item.source === 'server') {
    return getFromBackend(item.filename);
  } else {
    return getFromIndexedDb(item.filename);
  }
};

// Auto backup trigger logic
export const checkAndTriggerAutoBackup = async (
  opsCount: number,
  config: AppConfig,
  state: FullAppState
): Promise<{ triggered: boolean; filename?: string }> => {
  const backupConf = config.backup;
  if (!backupConf || !backupConf.autoBackup) {
    return { triggered: false };
  }

  const lastDateStr = backupConf.lastBackupDate;
  const now = new Date();
  let shouldTrigger = false;

  switch (backupConf.periodicity) {
    case 'startup':
      // Handled during app mounting, skip here
      break;
      
    case 'daily': {
      if (!lastDateStr) {
        shouldTrigger = true;
      } else {
        const lastDate = new Date(lastDateStr);
        // Compare only date part (year, month, date)
        if (
          lastDate.getFullYear() !== now.getFullYear() ||
          lastDate.getMonth() !== now.getMonth() ||
          lastDate.getDate() !== now.getDate()
        ) {
          shouldTrigger = true;
        }
      }
      break;
    }
      
    case 'weekly': {
      if (!lastDateStr) {
        shouldTrigger = true;
      } else {
        const lastDate = new Date(lastDateStr);
        const diffMs = now.getTime() - lastDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays >= 7) {
          shouldTrigger = true;
        }
      }
      break;
    }
      
    case 'ops_20':
      if (opsCount > 0 && opsCount % 20 === 0) {
        shouldTrigger = true;
      }
      break;
      
    case 'ops_50':
      if (opsCount > 0 && opsCount % 50 === 0) {
        shouldTrigger = true;
      }
      break;
  }

  if (shouldTrigger) {
    try {
      const res = await runBackup(state);
      return { triggered: true, filename: res.filename };
    } catch (e) {
      console.error('Fallo en backup automático:', e);
    }
  }

  return { triggered: false };
};
