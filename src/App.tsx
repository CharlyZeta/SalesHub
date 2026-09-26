import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { KpiSummary } from './components/KpiSummary';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { AuthModal } from './components/AuthModal';

// Modales diferidos (Code-Splitting on-demand)
const SaleFormModal = React.lazy(() => import('./components/SaleFormModal').then(m => ({ default: m.SaleFormModal })));
const ImportModal = React.lazy(() => import('./components/ImportModal').then(m => ({ default: m.ImportModal })));
const AnalyticsModal = React.lazy(() => import('./components/AnalyticsModal').then(m => ({ default: m.AnalyticsModal })));
const CustomerDirectoryModal = React.lazy(() => import('./components/CustomerDirectoryModal').then(m => ({ default: m.CustomerDirectoryModal })));
const WooCommerceModal = React.lazy(() => import('./components/WooCommerceModal').then(m => ({ default: m.WooCommerceModal })));
const ExportModal = React.lazy(() => import('./components/ExportModal').then(m => ({ default: m.ExportModal })));
const ConfigModal = React.lazy(() => import('./components/ConfigModal').then(m => ({ default: m.ConfigModal })));
const BudgetModal = React.lazy(() => import('./components/BudgetModal').then(m => ({ default: m.BudgetModal })));
const RemitoModal = React.lazy(() => import('./components/RemitoModal').then(m => ({ default: m.RemitoModal })));
const SystemLogsModal = React.lazy(() => import('./components/SystemLogsModal').then(m => ({ default: m.SystemLogsModal })));

const ModalFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-2xl flex items-center gap-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
      <div className="w-6 h-6 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">Cargando módulo...</span>
    </div>
  </div>
);

import { Sale, Customer, AppConfig, Budget } from './types';
import { INITIAL_CONFIG, INITIAL_BUDGETS, DEMO_SEED_ENABLED, INITIAL_DEMO_CUSTOMERS, INITIAL_WOO_CONFIG } from './data/initialData';
import { addSystemLog } from './utils/logger';
import { BackupItem, listAllBackups, restoreBackup, runBackup, checkAndTriggerAutoBackup } from './utils/backupService';
import { useCatalogState } from './hooks/useCatalogState';
import { useSecurityRole } from './hooks/useSecurityRole';
import { useWooCommerceSync } from './hooks/useWooCommerceSync';
import { useSalesState } from './hooks/useSalesState';

export default function App() {
  // Configuración de la aplicación
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

  useEffect(() => {
    localStorage.setItem('app_config_v1', JSON.stringify(config));
  }, [config]);

  // Presupuestos & Clientes
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('app_budgets_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEMO_SEED_ENABLED ? INITIAL_BUDGETS : [];
  });

  useEffect(() => {
    localStorage.setItem('app_budgets_v1', JSON.stringify(budgets));
  }, [budgets]);

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('app_customers_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEMO_SEED_ENABLED ? INITIAL_DEMO_CUSTOMERS : [];
  });

  useEffect(() => {
    localStorage.setItem('app_customers_v1', JSON.stringify(customers));
  }, [customers]);

  // Domain Hooks
  const { catalog, setCatalog, handleAddCatalogProduct } = useCatalogState();
  const { currentRole, isAuthLocked, handleUnlockRole, handleLockApp } = useSecurityRole(config.seguridad);
  const {
    wooConfig,
    setWooConfig,
    wooSyncStatus,
    setWooSyncStatus,
    serverSync,
    setServerSync,
    wooSyncBackoffRef,
    wooSyncNextAttemptRef,
    handleSyncCatalog,
    handleSyncCustomers,
    localMergePayload
  } = useWooCommerceSync({
    catalog,
    setCatalog,
    customers,
    setCustomers
  });

  // Backup & Recovery States
  const [operationsCount, setOperationsCount] = useState(0);
  const [availableBackup, setAvailableBackup] = useState<BackupItem | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

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

  const {
    sales,
    setSales,
    editingSale,
    setEditingSale,
    selectedMonth,
    setSelectedMonth,
    selectedChannelFilter,
    setSelectedChannelFilter,
    showAllMonths,
    setShowAllMonths,
    handleSaveSale,
    handleDeleteSale,
    handleUpdateInlineSale,
    handleImportSales,
    handleConvertBudgetToSale,
    handleSyncAndreaniTrackings
  } = useSalesState({
    config,
    setCustomers,
    setBudgets,
    onAfterOperation: checkAutoBackupAfterOp
  });

  // Modals visibility state
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
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

  // Theme state
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

  // Verificación de backups al inicio
  useEffect(() => {
    const initBackupChecks = async () => {
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

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    addSystemLog('INFO', 'Configuración', 'Actualizada configuración de canales y métodos de pago');
  };

  const handleSaveBudget = (budgetToSave: Budget) => {
    const exists = budgets.some((b) => b.id === budgetToSave.id);
    if (exists) {
      setBudgets(prev => prev.map((b) => (b.id === budgetToSave.id ? budgetToSave : b)));
      addSystemLog('BUDGET', 'Presupuestos', `Presupuesto modificado: ${budgetToSave.numeroPresupuesto}`, { total: budgetToSave.importeTotal });
    } else {
      setBudgets(prev => [budgetToSave, ...prev]);
      addSystemLog('BUDGET', 'Presupuestos', `Nuevo presupuesto emitido: ${budgetToSave.numeroPresupuesto}`, { cliente: budgetToSave.razonSocialNombre, total: budgetToSave.importeTotal });
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

  const handleAddCustomer = (newCust: Customer) => {
    setCustomers(prev => [newCust, ...prev]);
  };

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
            <span>
              Se detectó que la base de datos local está vacía. Sin embargo, hay una copia de seguridad disponible del{' '}
              {new Date(availableBackup.date).toLocaleString()} ({availableBackup.filename}).
            </span>
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

      {/* WooCommerce Auto-Sync Failure Banner */}
      {((wooSyncStatus.failureCount > 0 && wooConfig.autoSync) || (serverSync.lastError && serverSync.autoSync)) && (
        <div className="bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-100 border-b border-amber-300 dark:border-amber-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">⚠️</span>
            <span className="truncate">
              {serverSync.lastError ? (
                <>
                  <strong>Sincronización automática (servidor) fallando.</strong> Último error:{' '}
                  <span className="font-mono">{serverSync.lastError}</span>.
                  {serverSync.nextRunAt ? (
                    <> Próximo intento: <strong>{new Date(serverSync.nextRunAt).toLocaleTimeString()}</strong>.</>
                  ) : null}
                </>
              ) : (
                <>
                  <strong>Sincronización automática con WooCommerce fallando</strong> (intento {wooSyncStatus.failureCount}).
                  {wooSyncStatus.lastError ? <> Último error: <span className="font-mono">{wooSyncStatus.lastError}</span>.</> : null}
                  {wooSyncStatus.nextAttemptAt ? (
                    <> Próximo reintento: <strong>{new Date(wooSyncStatus.nextAttemptAt).toLocaleTimeString()}</strong>.</>
                  ) : null}
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
      {isSaleModalOpen && (
        <React.Suspense fallback={<ModalFallback />}>
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
            googleMapsApiKey={config.googleMapsApiKey}
            onPrintRemito={(sale) => {
              setRemitoSale(sale);
              setIsRemitoOpen(true);
            }}
          />
        </React.Suspense>
      )}

      {isImportOpen && (
        <React.Suspense fallback={<ModalFallback />}>
          <ImportModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onImportSales={handleImportSales}
          />
        </React.Suspense>
      )}

      {isAnalyticsOpen && (
        <React.Suspense fallback={<ModalFallback />}>
          <AnalyticsModal
            isOpen={isAnalyticsOpen}
            onClose={() => setIsAnalyticsOpen(false)}
            sales={sales}
          />
        </React.Suspense>
      )}

      {isCustomersOpen && (
        <React.Suspense fallback={<ModalFallback />}>
          <CustomerDirectoryModal
            isOpen={isCustomersOpen}
            onClose={() => setIsCustomersOpen(false)}
            customers={customers}
            sales={sales}
            onAddCustomer={handleAddCustomer}
          />
        </React.Suspense>
      )}

      {isWooCommerceOpen && (
        <React.Suspense fallback={<ModalFallback />}>
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
        </React.Suspense>
      )}

      {isExportOpen && (
        <React.Suspense fallback={<ModalFallback />}>
          <ExportModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            sales={sales}
            currentMonthIso={selectedMonth}
          />
        </React.Suspense>
      )}

      {isConfigOpen && (
        <React.Suspense fallback={<ModalFallback />}>
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
        </React.Suspense>
      )}

      {isBudgetOpen && (
        <React.Suspense fallback={<ModalFallback />}>
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
        </React.Suspense>
      )}

      {isRemitoOpen && (
        <React.Suspense fallback={<ModalFallback />}>
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
        </React.Suspense>
      )}

      {isLogsOpen && (
        <React.Suspense fallback={<ModalFallback />}>
          <SystemLogsModal
            isOpen={isLogsOpen}
            onClose={() => setIsLogsOpen(false)}
            currentRole={currentRole}
          />
        </React.Suspense>
      )}

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
