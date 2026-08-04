import React, { useState, useEffect } from 'react';
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

import { Sale, Customer, CatalogProduct, WooCommerceConfig, AppConfig, Budget, UserRole, SecurityConfig } from './types';
import { INITIAL_SALES, INITIAL_CATALOG, INITIAL_WOO_CONFIG, INITIAL_CONFIG, INITIAL_BUDGETS } from './data/initialData';
import { getCurrentMonthISO, generateSaleId } from './utils/formatters';
import { addSystemLog } from './utils/logger';
import { fetchWooCommerceProducts, fetchWooCommerceCustomers } from './utils/wooCommerceApi';

export default function App() {
  // Load initial data from localStorage or default
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('app_sales_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_SALES;
  });

  const [catalog, setCatalog] = useState<CatalogProduct[]>(() => {
    const saved = localStorage.getItem('app_catalog_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_CATALOG;
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
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_CONFIG;
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('app_budgets_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_BUDGETS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('app_customers_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    // Generate customer directory from initial sales
    const initialCusts: Customer[] = [
      { clienteId: 'CLI-1001', nombre: 'Gonzalo', apellido: 'Fernández', email: 'gonzalo.f@gmail.com', telefono: '11-5491-8821', dniCuit: '20-38491029-4', totalCompras: 243500, cantidadPedidos: 2, ultimaCompra: new Date().toISOString().split('T')[0] },
      { clienteId: 'CLI-1008', nombre: 'Mariana', apellido: 'Rossi', email: 'marianarossi@hotmail.com', telefono: '342-4591029', dniCuit: '27-33104928-1', totalCompras: 274500, cantidadPedidos: 2, ultimaCompra: new Date().toISOString().split('T')[0] },
      { clienteId: 'CLI-1003', nombre: 'Esteban', apellido: 'Gómez', email: 'esteban_g@yahoo.com.ar', telefono: '341-8849102', dniCuit: '20-29184019-3', totalCompras: 164000, cantidadPedidos: 1, ultimaCompra: new Date().toISOString().split('T')[0] },
      { clienteId: 'CLI-1012', nombre: 'Roberto', apellido: 'Martínez', email: 'martinez_construcciones@gmail.com', telefono: '11-3920-1928', dniCuit: '30-71940192-8', totalCompras: 349000, cantidadPedidos: 1, ultimaCompra: new Date().toISOString().split('T')[0] }
    ];
    return initialCusts;
  });

  // Current Month ISO
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthISO());
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('TODOS');

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

  // Inactivity Timer for Auto-Lock
  useEffect(() => {
    const sec = config?.seguridad;
    if (!sec || !sec.seguridadHabilitada || !sec.tiempoInactividadMinutos || sec.tiempoInactividadMinutos <= 0) {
      return;
    }

    const timeoutMs = sec.tiempoInactividadMinutos * 60 * 1000;
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      if (!isAuthLocked) {
        timer = setTimeout(() => {
          setIsAuthLocked(true);
          addSystemLog('WARN', 'Seguridad', `Bloqueo automático activado por inactividad (${sec.tiempoInactividadMinutos} min)`);
        }, timeoutMs);
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
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

  // Sync WooCommerce catalog products - completely replaces current catalog with the synced products list
  const handleSyncCatalog = (syncedProducts: CatalogProduct[]) => {
    setCatalog(syncedProducts);
  };

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
  useEffect(() => {
    if (!wooConfig.autoSync || !wooConfig.url || !wooConfig.conectado || config?.seguridad?.bloquearSincronizacionWooCommerce) {
      return;
    }

    const checkAutoSync = async () => {
      const intervalHours = wooConfig.syncIntervalHours || 1;
      const intervalMs = intervalHours * 60 * 60 * 1000;
      const lastSyncTime = wooConfig.ultimoSync ? new Date(wooConfig.ultimoSync).getTime() : 0;
      const now = Date.now();

      if (now - lastSyncTime >= intervalMs) {
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

          addSystemLog('SYNC', 'WooCommerce', `Sincronización automática periódica exitosa: ${fetchedProds.length} productos actualizados`);
        } catch (err: any) {
          addSystemLog('ERROR', 'WooCommerce', `Fallo en sincronización automática periódica: ${err.message}`);
        }
      }
    };

    checkAutoSync();
    const intervalTimer = setInterval(checkAutoSync, 60000); // Check every 60s
    return () => clearInterval(intervalTimer);
  }, [wooConfig, config?.seguridad?.bloquearSincronizacionWooCommerce]);

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

    setSales(prev => [newSale, ...prev]);

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
  };

  // Handlers for Sale operations
  const handleSaveSale = (saleToSave: Sale) => {
    if (editingSale) {
      setSales(prev => prev.map((s) => (s.id === saleToSave.id ? saleToSave : s)));
      addSystemLog('SALE', 'Ventas', `Venta #${saleToSave.id} actualizada`, { cliente: saleToSave.clienteNombre, total: saleToSave.montoTotal });
    } else {
      setSales(prev => [saleToSave, ...prev]);
      addSystemLog('SALE', 'Ventas', `Nueva venta registrada #${saleToSave.id}`, { cliente: saleToSave.clienteNombre, total: saleToSave.montoTotal });
    }

    // Auto-update customer directory or add new customer if ID doesn't exist
    setCustomers(prevCustomers => {
      const existingCust = prevCustomers.find((c) => c.clienteId === saleToSave.clienteId);
      if (!existingCust && saleToSave.clienteNombre) {
        const newCust: Customer = {
          clienteId: saleToSave.clienteId,
          nombre: saleToSave.clienteNombre,
          apellido: saleToSave.clienteApellido || '',
          dniCuit: saleToSave.clienteDniCuit || '',
          telefono: saleToSave.clienteTelefono || '',
          email: saleToSave.clienteEmail || '',
          totalCompras: saleToSave.montoTotal,
          cantidadPedidos: 1,
          ultimaCompra: saleToSave.fecha
        };
        return [newCust, ...prevCustomers];
      }
      return prevCustomers;
    });

    setEditingSale(null);
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

      {/* 2. Monthly Cumulative KPI Banner */}
      <KpiSummary
        sales={sales}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedChannelFilter={selectedChannelFilter}
        onChannelFilterChange={setSelectedChannelFilter}
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

