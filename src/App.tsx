import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { KpiSummary } from './components/KpiSummary';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { SaleFormModal } from './components/SaleFormModal';
import { ImportModal } from './components/ImportModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { CustomerDirectoryModal } from './components/CustomerDirectoryModal';
import { WooCommerceModal } from './components/WooCommerceModal';
import { ExportModal } from './components/ExportModal';
import { ConfigModal } from './components/ConfigModal';
import { BudgetModal } from './components/BudgetModal';
import { RemitoModal } from './components/RemitoModal';
import { SystemLogsModal } from './components/SystemLogsModal';
import { AuthModal } from './components/AuthModal';

import { Sale, Customer, CatalogProduct, WooCommerceConfig, AppConfig, Budget, UserRole } from './types';
import { INITIAL_SALES, INITIAL_CATALOG, INITIAL_WOO_CONFIG, INITIAL_CONFIG, INITIAL_BUDGETS, DEMO_SEED_ENABLED, INITIAL_DEMO_CUSTOMERS } from './data/initialData';
import { getCurrentMonthISO, generateSaleId, normalizePersonName, DEFAULT_PROVINCE } from './utils/formatters';
import { addSystemLog } from './utils/logger';
import { fetchWooCommerceProducts, fetchWooCommerceCustomers } from './utils/wooCommerceApi';
import { BackupItem, listAllBackups, restoreBackup, runBackup, checkAndTriggerAutoBackup } from './utils/backupService';
import { fetchAndreaniTrackingsBulk } from './utils/andreaniSyncService';

export default function App() {
  // Los datos semilla son OPCIONALES (`VITE_SEED_DEMO=true`): por defecto la app
  // arranca vacía para no mezclar registros de ejemplo con datos reales.
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('app_sales_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEMO_SEED_ENABLED ? INITIAL_SALES : [];
  });

  const [catalog, setCatalog] = useState<CatalogProduct[]>(() => {
    const saved = localStorage.getItem('app_catalog_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEMO_SEED_ENABLED ? INITIAL_CATALOG : [];
  });

  const [wooConfig, setWooConfig] = useState<WooCommerceConfig>(() => {
    const saved = localStorage.getItem('app_woo_config_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_WOO_CONFIG;
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('app_config_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.metodosEnvio || !parsed.estadosEnvio) {
          return {
            ...INITIAL_CONFIG,
            ...parsed,
            metodosEnvio: parsed.metodosEnvio || INITIAL_CONFIG.metodosEnvio,
            estadosEnvio: parsed.estadosEnvio || INITIAL_CONFIG.estadosEnvio
          };
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CONFIG;
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('app_budgets_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEMO_SEED_ENABLED ? INITIAL_BUDGETS : [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('app_customers_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEMO_SEED_ENABLED ? INITIAL_DEMO_CUSTOMERS : [];
  });

  // Current Month ISO
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthISO());
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('TODOS');
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  // Modals state
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [isRemitoOpen, setIsRemitoOpen] = useState(false);
  const [remitoSale, setRemitoSale] = useState<Sale | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isWooCommerceOpen, setIsWooCommerceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Security & Role State
  const [currentRole, setCurrentRole] = useState<UserRole>('OPERADOR');
  const [isAuthLocked, setIsAuthLocked] = useState<boolean>(false);

  // H1: si la seguridad está habilitada, la aplicación arranca BLOQUEADA
  // (Auth Gate real en el inicio). Sin esto, el PIN solo se pedía al bloquear
  // manualmente o por inactividad.
  useEffect(() => {
    if (config.seguridad?.seguridadHabilitada) {
      setIsAuthLocked(true);
      addSystemLog('INFO', 'Seguridad', 'Sesión iniciada bloqueada: se requiere PIN de acceso');
    }
    // Se evalúa una sola vez al montar, con la config ya cargada de localStorage.
     
  }, [config.seguridad?.seguridadHabilitada]);

  // Backup & Recovery States
  const [operationsCount, setOperationsCount] = useState(0);
  const [availableBackup, setAvailableBackup] = useState<BackupItem | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Recovery banner and automatic startup backup checks
  useEffect(() => {
    const initBackupChecks = async () => {
      // 1. Check if sales is empty AND there is no custom configuration (i.e. localStorage was cleared)
      const salesInLocalStorage = localStorage.getItem('app_sales_v1');
      if (!salesInLocalStorage || JSON.parse(salesInLocalStorage).length === 0) {
        try {
          const list = await listAllBackups();
          if (list.length > 0) {
            setAvailableBackup(list[0]);
            setShowRecoveryBanner(true);
          }
        } catch (e) {
          console.error('Error al buscar backups para recuperación:', e);
        }
      }

      // 2. Run startup auto-backup if enabled
      const savedConfig = localStorage.getItem('app_config_v1');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          if (parsedConfig.backup?.autoBackup && parsedConfig.backup?.periodicity === 'startup') {
            const currentSales = JSON.parse(localStorage.getItem('app_sales_v1') || '[]');
            const currentCatalog = JSON.parse(localStorage.getItem('app_catalog_v1') || '[]');
            const currentBudgets = JSON.parse(localStorage.getItem('app_budgets_v1') || '[]');
            const currentCustomers = JSON.parse(localStorage.getItem('app_customers_v1') || '[]');
            const currentWoo = JSON.parse(localStorage.getItem('app_woo_config_v1') || 'null') || INITIAL_WOO_CONFIG;
            
            const fullState = {
              sales: currentSales,
              catalog: currentCatalog,
              budgets: currentBudgets,
              customers: currentCustomers,
              config: parsedConfig,
              wooConfig: currentWoo
            };
            
            const res = await runBackup(fullState);
            if (res.successServer || res.successIndexedDb) {
              const updatedConfig = {
                ...parsedConfig,
                backup: {
                  ...parsedConfig.backup,
                  lastBackupDate: new Date().toISOString(),
                  lastBackupFilename: res.filename
                }
              };
              setConfig(updatedConfig);
              localStorage.setItem('app_config_v1', JSON.stringify(updatedConfig));
            }
          }
        } catch (e) {
          console.error('Error en backup automático al inicio:', e);
        }
      }
    };
    
    initBackupChecks();
  }, []);

  const handleRestoreState = (restoredState: any) => {
    if (!restoredState) return;
    
    if (restoredState.sales) setSales(restoredState.sales);
    if (restoredState.catalog) setCatalog(restoredState.catalog);
    if (restoredState.budgets) setBudgets(restoredState.budgets);
    if (restoredState.customers) setCustomers(restoredState.customers);
    if (restoredState.config) setConfig(restoredState.config);
    if (restoredState.wooConfig) setWooConfig(restoredState.wooConfig);
    
    if (restoredState.sales) localStorage.setItem('app_sales_v1', JSON.stringify(restoredState.sales));
    if (restoredState.catalog) localStorage.setItem('app_catalog_v1', JSON.stringify(restoredState.catalog));
    if (restoredState.budgets) localStorage.setItem('app_budgets_v1', JSON.stringify(restoredState.budgets));
    if (restoredState.customers) localStorage.setItem('app_customers_v1', JSON.stringify(restoredState.customers));
    if (restoredState.config) localStorage.setItem('app_config_v1', JSON.stringify(restoredState.config));
    if (restoredState.wooConfig) localStorage.setItem('app_woo_config_v1', JSON.stringify(restoredState.wooConfig));
    
    setShowRecoveryBanner(false);
    setAvailableBackup(null);
    
    addSystemLog('INFO', 'RESTORE', `Base de datos restaurada de copia de seguridad.`);
  };

  const handleRestoreStateFromBanner = async () => {
    if (availableBackup) {
      try {
        const restoredState = await restoreBackup(availableBackup);
        handleRestoreState(restoredState);
      } catch (e: any) {
        alert(`Error al restaurar copia: ${e.message}`);
      }
    }
  };

  const checkAutoBackupAfterOp = async (updatedSales: Sale[]) => {
    const newOpsCount = operationsCount + 1;
    setOperationsCount(newOpsCount);
    
    const fullState = {
      sales: updatedSales,
      catalog,
      budgets,
      customers,
      config,
      wooConfig
    };
    
    const res = await checkAndTriggerAutoBackup(newOpsCount, config, fullState);
    if (res.triggered && res.filename) {
      const updatedConfig = {
        ...config,
        backup: {
          ...config.backup!,
          lastBackupDate: new Date().toISOString(),
          lastBackupFilename: res.filename
        }
      };
      setConfig(updatedConfig);
      localStorage.setItem('app_config_v1', JSON.stringify(updatedConfig));
      addSystemLog('INFO', 'BACKUP', `Copia de seguridad automática creada: ${res.filename}`);
    }
  };

  // Inactivity Timer for Auto-Lock
  useEffect(() => {
    const sec = config?.seguridad;
    if (!sec || !sec.seguridadHabilitada || !sec.tiempoInactividadMinutos || sec.tiempoInactividadMinutos <= 0) {
      return;
    }

    const timeoutMs = sec.tiempoInactividadMinutos * 60 * 1000;
    let timer: NodeJS.Timeout | undefined;

    const scheduleLock = () => {
      clearTimeout(timer);
      // No bloquear si la app está en segundo plano: con la pestaña oculta el
      // usuario no puede ver el aviso y al volver se encontraría la pantalla de PIN.
      if (isAuthLocked || document.hidden) return;
      timer = setTimeout(() => {
        setIsAuthLocked(true);
        addSystemLog('WARN', 'Seguridad', `Bloqueo automático activado por inactividad (${sec.tiempoInactividadMinutos} min)`);
      }, timeoutMs);
    };

    // Volver de otra ventana/pestaña cuenta como actividad: se reinicia el conteo.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timer);
      } else {
        scheduleLock();
      }
    };

    window.addEventListener('mousemove', scheduleLock);
    window.addEventListener('keydown', scheduleLock);
    window.addEventListener('click', scheduleLock);
    window.addEventListener('focus', scheduleLock);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    scheduleLock();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', scheduleLock);
      window.removeEventListener('keydown', scheduleLock);
      window.removeEventListener('click', scheduleLock);
      window.removeEventListener('focus', scheduleLock);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config?.seguridad, isAuthLocked]);

  const handleUnlockRole = (role: UserRole) => {
    setCurrentRole(role);
    setIsAuthLocked(false);
  };

  const handleLockApp = () => {
    setIsAuthLocked(true);
    addSystemLog('INFO', 'Seguridad', 'Sesión bloqueada manualmente por el usuario');
  };

  /**
   * Aplica el catálogo recibido (de la tienda) **combinándolo** con el local: nunca borra
   * productos manuales ni los que ya no están en la tienda (Fix D / W5). Si el SKU coincide,
   * se actualizan precio/stock conservando el id local.
   */
  const handleSyncCatalog = (syncedProducts: CatalogProduct[]) => {
    setCatalog(prevCatalog => {
      const merged = prevCatalog.map(p => ({ ...p }));
      const bySku = new Map<string, CatalogProduct>();
      const byName = new Map<string, CatalogProduct>();
      merged.forEach(p => {
        if (p.sku) bySku.set(p.sku.trim().toLowerCase(), p);
        if (p.nombre) byName.set(p.nombre.trim().toLowerCase(), p);
      });

      let added = 0;
      for (const incoming of syncedProducts) {
        const key = incoming.sku?.trim().toLowerCase();
        const nameKey = incoming.nombre?.trim().toLowerCase();
        const existing = (key && bySku.get(key)) || (nameKey && byName.get(nameKey));
        if (existing) {
          existing.precio = incoming.precio;
          existing.stock = incoming.stock;
          existing.nombre = incoming.nombre || existing.nombre;
          if (incoming.categoria) existing.categoria = incoming.categoria;
          if (incoming.imagenUrl) existing.imagenUrl = incoming.imagenUrl;
          existing.estadoWoo = incoming.estadoWoo || existing.estadoWoo;
        } else {
          const product = { ...incoming };
          merged.push(product);
          if (product.sku) bySku.set(product.sku.trim().toLowerCase(), product);
          if (product.nombre) byName.set(product.nombre.trim().toLowerCase(), product);
          added++;
        }
      }

      addSystemLog(
        'SYNC',
        'WooCommerce',
        `Catálogo combinado: ${syncedProducts.length} de la tienda, ${added} nuevos, ${prevCatalog.length} locales conservados (sin borrados).`
      );
      return merged;
    });
  };

  /**
   * Datos locales que el servidor necesita para combinar sin perder nada (Fix D / W5).
   * Se pasan al modal de WooCommerce, que los envía al sincronizar contra el servidor.
   */
  const localMergePayload = () => ({    products: catalog.map(p => ({
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      precio: p.precio,
      stock: p.stock,
      categoria: p.categoria,
      origen: p.origen,
      imagenUrl: p.imagenUrl,
    })),
    customers: customers.map(c => ({
      clienteId: c.clienteId,
      id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      razonSocialNombre: c.razonSocialNombre,
      dniCuit: c.dniCuit,
      telefono: c.telefono,
      email: c.email,
      direccion: c.direccion,
      localidad: c.localidad,
      provincia: c.provincia,
      totalCompras: c.totalCompras,
      cantidadPedidos: c.cantidadPedidos,
      ultimaCompra: c.ultimaCompra,
      canalHabitual: c.canalHabitual,
      origen: c.origen,
    })),
  });

  // Sync WooCommerce customers - appends only new customers that do not already exist in directory
  const handleSyncCustomers = (syncedCustomers: Customer[]) => {
    setCustomers(prevCustomers => {
      const existingIds = new Set(prevCustomers.map(c => c.clienteId?.toLowerCase().trim()).filter(Boolean));
      const existingEmails = new Set(prevCustomers.map(c => c.email?.toLowerCase().trim()).filter(Boolean));

      const newOnly = syncedCustomers.filter(c => {
        const cId = c.clienteId?.toLowerCase().trim();
        const email = c.email?.toLowerCase().trim();
        if (cId && existingIds.has(cId)) return false;
        if (email && email !== '' && !email.includes('@tienda.com') && existingEmails.has(email)) return false;
        return true;
      });

      return [...prevCustomers, ...newOnly];
    });
  };

  // Automated scheduled sync for WooCommerce based on configured hours
  //
  // Fix A: la programación depende ÚNICAMENTE de la configuración de WooCommerce
  // (autoSync + url + conectado). El flag `bloquearSincronizacionWooCommerce` ya NO
  // apaga la automatización: su alcance real es impedir que un OPERADOR edite las
  // claves de API (ver WooCommerceModal).
  // Fix C: ante errores se aplica backoff exponencial (1, 2, 4, ... hasta 30 min),
  // se registra el motivo en el log de auditoría y se muestra un aviso en pantalla.
  const wooSyncBackoffRef = useRef<number>(0); // reintentos consecutivos
  const wooSyncNextAttemptRef = useRef<number>(0); // epoch ms del próximo intento
  const [wooSyncStatus, setWooSyncStatus] = useState<{
    failureCount: number;
    lastError?: string;
    lastSuccessAt?: string;
    nextAttemptAt?: string;
  }>({ failureCount: 0 });

  // Fix E (W2): estado de la sincronización del SERVIDOR. Si está activa, es el servidor
  // quien consulta WooCommerce (incluso con la app cerrada) y la app solo importa el
  // snapshot resultante. Si el servidor no está disponible, se usa el modo navegador.
  const [serverSync, setServerSync] = useState<{
    available: boolean;
    autoSync: boolean;
    lastSync: string | null;
    lastError: string | null;
    nextRunAt: string | null;
    mergeSummary?: { productsAdded: number; productsUpdated: number; productsLocalKept: number; customersAdded: number } | null;
  }>({ available: false, autoSync: false, lastSync: null, lastError: null, nextRunAt: null });


  useEffect(() => {
    let cancelled = false;

    const pollServerSync = async () => {
      try {
        const statusRes = await fetch('/api/woo/status');
        if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
        const status = await statusRes.json();
        if (cancelled) return;

        setServerSync(prev => ({
          ...prev,
          available: true,
          autoSync: Boolean(status.autoSync),
          lastSync: status.lastSync ?? null,
          lastError: status.lastError ?? null,
          nextRunAt: status.nextRunAt ?? null,
        }));

        if (!status.autoSync || !status.hasSnapshot) return;

        // ¿El servidor trajo datos más nuevos que los que tengo localmente?
        const snapshotRes = await fetch('/api/woo/snapshot');
        if (!snapshotRes.ok) return;
        const { snapshot } = await snapshotRes.json();
        if (cancelled || !snapshot?.fetchedAt) return;

        const remoteTime = new Date(snapshot.fetchedAt).getTime();
        const localTime = wooConfig.ultimoSync ? new Date(wooConfig.ultimoSync).getTime() : 0;
        if (!Number.isFinite(remoteTime) || remoteTime <= localTime) return;

        // El snapshot del servidor ya viene combinado con los datos locales que le enviamos,
        // así que se aplica tal cual (sin volver a mezclar).
        if (Array.isArray(snapshot.products) && snapshot.products.length > 0) {
          setCatalog(snapshot.products);
        }
        if (Array.isArray(snapshot.customers) && snapshot.customers.length > 0) {
          setCustomers(snapshot.customers);
        }
        const fetchedAt = snapshot.fetchedAt;
        setWooConfig(prev => ({ ...prev, ultimoSync: fetchedAt }));
        addSystemLog(
          'SYNC',
          'WooCommerce',
          `Sincronización aplicada desde el servidor: ${snapshot.products?.length ?? 0} productos y ${snapshot.customers?.length ?? 0} clientes (traídos con la app cerrada).`
        );
      } catch {
        if (!cancelled) {
          // Servidor no disponible (p. ej. build estático sin server.js): modo navegador.
          setServerSync(prev => ({ ...prev, available: false }));
        }
      }
    };

    pollServerSync();
    const timer = setInterval(pollServerSync, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [wooConfig.ultimoSync]);

  useEffect(() => {
    // Si el servidor se encarga de la programación, no duplicamos consultas desde acá.
    if (serverSync.available && serverSync.autoSync) return;
    if (!wooConfig.autoSync || !wooConfig.url || !wooConfig.conectado) {
      return;
    }

    const intervalHours = wooConfig.syncIntervalHours || 1;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const BASE_RETRY_MS = 60 * 1000; // 1 min
    const MAX_RETRY_MS = 30 * 60 * 1000; // tope de 30 min

    const checkAutoSync = async () => {
      const now = Date.now();

      // Backoff activo: todavía no corresponde reintentar
      if (now < wooSyncNextAttemptRef.current) return;

      const lastSyncTime = wooConfig.ultimoSync ? new Date(wooConfig.ultimoSync).getTime() : 0;
      if (now - lastSyncTime < intervalMs) return;

      try {
        addSystemLog('SYNC', 'WooCommerce', `Iniciando sincronización automática programada (cada ${intervalHours} hora/s)...`);
        const fetchedProds = await fetchWooCommerceProducts(wooConfig);
        handleSyncCatalog(fetchedProds);

        const fetchedCusts = await fetchWooCommerceCustomers(wooConfig);
        handleSyncCustomers(fetchedCusts);

        const nowIso = new Date().toISOString();
        setWooConfig(prev => ({
          ...prev,
          ultimoSync: nowIso
        }));

        wooSyncBackoffRef.current = 0;
        wooSyncNextAttemptRef.current = 0;
        setWooSyncStatus({ failureCount: 0, lastSuccessAt: nowIso });
        addSystemLog(
          'SYNC',
          'WooCommerce',
          `Sincronización automática exitosa: ${fetchedProds.length} productos y ${fetchedCusts.length} clientes. Próxima corrida programada en ${intervalHours} hora/s.`
        );
      } catch (err: any) {
        const message = err?.message || String(err);
        const failures = wooSyncBackoffRef.current + 1;
        wooSyncBackoffRef.current = failures;
        const retryMs = Math.min(BASE_RETRY_MS * Math.pow(2, failures - 1), MAX_RETRY_MS);
        wooSyncNextAttemptRef.current = Date.now() + retryMs;

        setWooSyncStatus(prev => ({
          ...prev,
          failureCount: failures,
          lastError: message,
          nextAttemptAt: new Date(wooSyncNextAttemptRef.current).toISOString(),
        }));
        addSystemLog(
          'ERROR',
          'WooCommerce',
          `Fallo en sincronización automática (intento ${failures}): ${message}. Próximo reintento en ${Math.round(retryMs / 60000)} min.`
        );
      }
    };

    checkAutoSync();
    const intervalTimer = setInterval(checkAutoSync, 60000); // Check every 60s
    return () => clearInterval(intervalTimer);
  }, [wooConfig, serverSync.available, serverSync.autoSync]);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('app_sales_v1', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('app_catalog_v1', JSON.stringify(catalog));
  }, [catalog]);

  useEffect(() => {
    localStorage.setItem('app_woo_config_v1', JSON.stringify(wooConfig));
  }, [wooConfig]);

  useEffect(() => {
    localStorage.setItem('app_config_v1', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('app_budgets_v1', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('app_customers_v1', JSON.stringify(customers));
  }, [customers]);

  // Handlers for Config
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    addSystemLog('INFO', 'Configuración', 'Actualizada configuración de canales y métodos de pago');
  };

  // Handlers for Budgets
  const handleSaveBudget = (budgetToSave: Budget) => {
    const exists = budgets.some((b) => b.id === budgetToSave.id);
    if (exists) {
      setBudgets(prev => prev.map((b) => (b.id === budgetToSave.id ? budgetToSave : b)));
      addSystemLog('BUDGET', 'Presupuestos', `Presupuesto modificado: ${budgetToSave.numeroPresupuesto}`, { total: budgetToSave.importeTotal });
    } else {
      setBudgets(prev => [budgetToSave, ...prev]);
      addSystemLog('BUDGET', 'Presupuestos', `Nuevo presupuesto emitido: ${budgetToSave.numeroPresupuesto}`, { cliente: budgetToSave.razonSocialNombre, total: budgetToSave.importeTotal });
      // Update config last sequential budget number
      const numVal = parseInt(budgetToSave.comprobanteNumero) || config.ultimoNumeroPresupuesto;
      if (numVal > config.ultimoNumeroPresupuesto) {
        setConfig((prev) => ({
          ...prev,
          ultimoNumeroPresupuesto: numVal
        }));
      }
    }
  };

  const handleDeleteBudget = (budgetId: string) => {
    setBudgets(prev => prev.filter((b) => b.id !== budgetId));
    addSystemLog('WARN', 'Presupuestos', `Presupuesto eliminado ID: ${budgetId}`);
  };

  const handleConvertBudgetToSale = (budget: Budget) => {
    // Generate new Sale from Budget
    const newSaleId = generateSaleId(sales.map(s => s.id));
    const newSale: Sale = {
      id: newSaleId,
      fecha: budget.fechaEmision || new Date().toISOString().split('T')[0],
      clienteId: budget.clienteId || `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
      clienteNombre: budget.razonSocialNombre,
      clienteApellido: budget.apellido || '',
      clienteDniCuit: budget.dniCuit,
      clienteTelefono: budget.telefono,
      productos: budget.items.map((i) => ({
        id: i.id,
        nombre: i.descripcion,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal
      })),
      montoTotal: budget.importeTotal,
      numeroFactura: `FC-B-${budget.puntoVenta}-${budget.comprobanteNumero}`,
      tipoFactura: 'Factura B',
      metodoPago: budget.condicionVenta.includes('TRANSFERENCIA') ? 'Transferencia' : 'Efectivo',
      canal: 'Local',
      metodoEnvio: 'Retiro en Local',
      estadoEnvio: 'Entregado',
      notas: `Convertido desde Presupuesto ${budget.numeroPresupuesto}. ${budget.observaciones || ''}`,
      creadoEn: new Date().toISOString()
    };

    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);

    // Mark budget as converted
    setBudgets(prev =>
      prev.map((b) => {
        if (b.id === budget.id) {
          return {
            ...b,
            estado: 'Convertido',
            ventaConvertidaId: newSaleId
          };
        }
        return b;
      })
    );

    addSystemLog('SALE', 'Ventas', `Presupuesto ${budget.numeroPresupuesto} convertido a Venta #${newSaleId}`, { montoTotal: budget.importeTotal });
    checkAutoBackupAfterOp(updatedSales);
  };

  // Handlers for Sale operations
  const handleSaveSale = (saleToSave: Sale) => {
    let updatedSales: Sale[] = [];
    if (editingSale) {
      updatedSales = sales.map((s) => (s.id === saleToSave.id ? saleToSave : s));
      setSales(updatedSales);
      addSystemLog('SALE', 'Ventas', `Venta #${saleToSave.id} actualizada`, { cliente: saleToSave.clienteNombre, total: saleToSave.montoTotal });
    } else {
      updatedSales = [saleToSave, ...sales];
      setSales(updatedSales);
      addSystemLog('SALE', 'Ventas', `Nueva venta registrada #${saleToSave.id}`, { cliente: saleToSave.clienteNombre, total: saleToSave.montoTotal });
    }

    // Auto-update customer directory or add new customer if ID doesn't exist
    setCustomers(prevCustomers => {
      const existingCust = prevCustomers.find((c) => c.clienteId === saleToSave.clienteId);
      if (!existingCust && saleToSave.clienteNombre) {
        const newCust: Customer = {
          clienteId: saleToSave.clienteId,
          nombre: normalizePersonName(saleToSave.clienteNombre),
          apellido: normalizePersonName(saleToSave.clienteApellido || ''),
          dniCuit: (saleToSave.clienteDniCuit || '').trim(),
          telefono: (saleToSave.clienteTelefono || '').trim(),
          email: (saleToSave.clienteEmail || '').trim(),
          direccion: (saleToSave.clienteDireccion || '').trim(),
          localidad: (saleToSave.clienteLocalidad || '').trim(),
          codigoPostal: (saleToSave.clienteCodigoPostal || '').trim(),
          provincia: (saleToSave.clienteProvincia || '').trim() || DEFAULT_PROVINCE,
          totalCompras: saleToSave.montoTotal,
          cantidadPedidos: 1,
          ultimaCompra: saleToSave.fecha
        };
        return [newCust, ...prevCustomers];
      }
      return prevCustomers;
    });

    setEditingSale(null);
    checkAutoBackupAfterOp(updatedSales);
  };

  const handleDeleteSale = (saleId: string) => {
    setSales(prev => prev.filter((s) => s.id !== saleId));
    addSystemLog('WARN', 'Ventas', `Venta eliminada #${saleId}`);
  };

  const handleUpdateInlineSale = (saleId: string, updatedFields: Partial<Sale>) => {
    setSales(prev =>
      prev.map((s) => {
        if (s.id === saleId) {
          return { ...s, ...updatedFields };
        }
        return s;
      })
    );
  };

  const handleSyncAndreaniTrackings = async (trackingNumbers: string[], force = false) => {
    if (!config.andreaniHash || !trackingNumbers || trackingNumbers.length === 0) return;
    try {
      const data = await fetchAndreaniTrackingsBulk(trackingNumbers, config.andreaniHash, force);
      if (Array.isArray(data) && data.length > 0) {
        const trackingMap = new Map<string, typeof data[0]>();
        data.forEach(item => {
          if (item.tracking_number) {
            trackingMap.set(item.tracking_number.trim(), item);
          }
        });

        setSales(prev =>
          prev.map(sale => {
            const trackNum = sale.numeroSeguimiento?.trim();
            if (trackNum && trackingMap.has(trackNum)) {
              const info = trackingMap.get(trackNum)!;
              return {
                ...sale,
                andreaniStatus: info.tracking_status || info.status,
                andreaniLastCheck: info.updated_at || new Date().toISOString(),
                estadoEnvio: info.canonical_status
              };
            }
            return sale;
          })
        );
        if (force) {
          addSystemLog('INFO', 'Andreani', `Sincronizados ${data.length} envíos con éxito`);
        }
      }
    } catch (e: any) {
      if (force) {
        addSystemLog('ERROR', 'Andreani', `Error de rastreo: ${e.message}`);
      }
      throw e;
    }
  };

  const handleImportSales = (importedSales: Sale[]) => {
    setSales(prev => [...importedSales, ...prev]);
  };

  const handleAddCustomer = (newCust: Customer) => {
    setCustomers(prev => [newCust, ...prev]);
  };

  const handleAddCatalogProduct = (newProduct: CatalogProduct) => {
    setCatalog(prev => [newProduct, ...prev]);
  };

  // Quick Row Add
  const handleQuickAddSale = () => {
    setEditingSale(null);
    setIsSaleModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans select-none transition-colors duration-200">
      
      {/* 1. Header Toolbar */}
      <Header
        currentMonthIso={selectedMonth}
        totalMonthSales={sales.filter((s) => s.fecha.startsWith(selectedMonth)).reduce((acc, s) => acc + s.montoTotal, 0)}
        monthSalesCount={sales.filter((s) => s.fecha.startsWith(selectedMonth)).length}
        onOpenNewSale={() => {
          setEditingSale(null);
          setIsSaleModalOpen(true);
        }}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenCustomers={() => setIsCustomersOpen(true)}
        onOpenWooCommerce={() => setIsWooCommerceOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenBudget={() => setIsBudgetOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        onLockApp={handleLockApp}
        currentRole={currentRole}
        wooConnected={wooConfig.conectado}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Recovery Banner */}
      {showRecoveryBanner && availableBackup && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-md shrink-0 border-b border-amber-600 select-none animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span>Se detectó que la base de datos local está vacía. Sin embargo, hay una copia de seguridad disponible del {new Date(availableBackup.date).toLocaleString()} ({availableBackup.filename}).</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRestoreStateFromBanner}
              className="bg-white hover:bg-slate-100 text-amber-900 font-bold px-3 py-1 rounded shadow-xs transition-colors cursor-pointer"
            >
              Restaurar Copia
            </button>
            <button
              onClick={() => setShowRecoveryBanner(false)}
              className="text-white/80 hover:text-white font-bold px-2 py-1 cursor-pointer"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}

      {/* WooCommerce Auto-Sync Failure Banner (Fix C + Fix E: el fallo deja de ser silencioso,
          sea del temporizador del navegador o del servidor) */}
      {((wooSyncStatus.failureCount > 0 && wooConfig.autoSync) || (serverSync.lastError && serverSync.autoSync)) && (
        <div className="bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-100 border-b border-amber-300 dark:border-amber-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">⚠️</span>
            <span className="truncate">
              {serverSync.lastError ? (
                <>
                  <strong>Sincronización automática (servidor) fallando.</strong> Último error:{' '}
                  <span className="font-mono">{serverSync.lastError}</span>.
                  {serverSync.nextRunAt ? <> Próximo intento: <strong>{new Date(serverSync.nextRunAt).toLocaleTimeString()}</strong>.</> : null}
                </>
              ) : (
                <>
                  <strong>Sincronización automática con WooCommerce fallando</strong> (intento {wooSyncStatus.failureCount}).
                  {wooSyncStatus.lastError ? <> Último error: <span className="font-mono">{wooSyncStatus.lastError}</span>.</> : null}
                  {wooSyncStatus.nextAttemptAt ? <> Próximo reintento: <strong>{new Date(wooSyncStatus.nextAttemptAt).toLocaleTimeString()}</strong>.</> : null}
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsWooCommerceOpen(true)}
              className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/40 font-bold px-3 py-1 rounded transition-colors cursor-pointer"
            >
              Revisar WooCommerce
            </button>
            <button
              onClick={() => {
                wooSyncBackoffRef.current = 0;
                wooSyncNextAttemptRef.current = 0;
                setWooSyncStatus({ failureCount: 0 });
                setServerSync(prev => ({ ...prev, lastError: null }));
              }}
              className="font-bold px-2 py-1 opacity-80 hover:opacity-100 cursor-pointer"
            >
              Ocultar
            </button>
          </div>
        </div>
      )}

      {/* 2. Monthly Cumulative KPI Banner */}
      <KpiSummary
        sales={sales}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedChannelFilter={selectedChannelFilter}
        onChannelFilterChange={setSelectedChannelFilter}
        showAllMonths={showAllMonths}
        onShowAllMonthsChange={setShowAllMonths}
      />

      {/* 3. Main Interactive High-Density Spreadsheet Table */}
      <SpreadsheetGrid
        sales={sales}
        onEditSale={(sale) => {
          setEditingSale(sale);
          setIsSaleModalOpen(true);
        }}
        onDeleteSale={handleDeleteSale}
        onQuickAddSale={handleQuickAddSale}
        onUpdateInlineSale={handleUpdateInlineSale}
        onPrintRemito={(sale) => {
          setRemitoSale(sale);
          setIsRemitoOpen(true);
        }}
        selectedChannelFilter={selectedChannelFilter}
        onChannelFilterChange={setSelectedChannelFilter}
        canales={config.canales}
        metodosPago={config.metodosPago}
        estadosEnvio={config.estadosEnvio}
        andreaniHash={config.andreaniHash}
        onSyncAndreaniTrackings={handleSyncAndreaniTrackings}
        selectedMonth={selectedMonth}
        showAllMonths={showAllMonths}
      />

      {/* 4. Modals & Drawers */}
      <SaleFormModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setEditingSale(null);
        }}
        onSave={handleSaveSale}
        existingSale={editingSale}
        existingSaleIds={sales.map(s => s.id)}
        customers={customers}
        catalog={catalog}
        canales={config.canales}
        metodosPago={config.metodosPago}
        metodosEnvio={config.metodosEnvio}
        estadosEnvio={config.estadosEnvio}
        onPrintRemito={(sale) => {
          setRemitoSale(sale);
          setIsRemitoOpen(true);
        }}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSales={handleImportSales}
      />

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        sales={sales}
      />

      <CustomerDirectoryModal
        isOpen={isCustomersOpen}
        onClose={() => setIsCustomersOpen(false)}
        customers={customers}
        sales={sales}
        onAddCustomer={handleAddCustomer}
      />

      <WooCommerceModal
        isOpen={isWooCommerceOpen}
        onClose={() => setIsWooCommerceOpen(false)}
        config={wooConfig}
        onUpdateConfig={setWooConfig}
        catalog={catalog}
        onAddCatalogProduct={handleAddCatalogProduct}
        customers={customers}
        onSyncCatalog={handleSyncCatalog}
        onSyncCustomers={handleSyncCustomers}
        currentRole={currentRole}
        blockCredentialEditing={Boolean(config?.seguridad?.bloquearSincronizacionWooCommerce)}
        localData={localMergePayload()}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        sales={sales}
        currentMonthIso={selectedMonth}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onOpenImport={() => setIsImportOpen(true)}
        onRestoreBackup={handleRestoreState}
        fullAppState={{
          sales,
          catalog,
          budgets,
          customers,
          config,
          wooConfig
        }}
      />

      <BudgetModal
        isOpen={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
        budgets={budgets}
        customers={customers}
        catalog={catalog}
        config={config}
        onSaveBudget={handleSaveBudget}
        onDeleteBudget={handleDeleteBudget}
        onConvertToSale={handleConvertBudgetToSale}
      />

      <RemitoModal
        isOpen={isRemitoOpen}
        onClose={() => {
          setIsRemitoOpen(false);
          setRemitoSale(null);
        }}
        sale={remitoSale}
        customers={customers}
        config={config}
      />

      <SystemLogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        currentRole={currentRole}
      />

      <AuthModal
        isOpen={isAuthLocked}
        onUnlock={handleUnlockRole}
        securityConfig={config.seguridad || {
          seguridadHabilitada: true,
          pinAcceso: '1234',
          tiempoInactividadMinutos: 15,
          modoProduccionVPS: true,
          bloquearSincronizacionWooCommerce: true,
          bloquearBorradoLogs: true
        }}
      />

    </div>
  );
}

