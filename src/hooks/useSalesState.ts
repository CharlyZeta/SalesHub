import type React from 'react';
import { useState, useEffect } from 'react';
import { Sale, Customer, Budget, AppConfig } from '../types';
import { INITIAL_SALES, DEMO_SEED_ENABLED } from '../data/initialData';
import { getCurrentMonthISO, generateSaleId, normalizePersonName, DEFAULT_PROVINCE } from '../utils/formatters';
import { addSystemLog } from '../utils/logger';
import { fetchAndreaniTrackingsBulk } from '../utils/andreaniSyncService';

export interface UseSalesStateProps {
  config: AppConfig;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
  onAfterOperation?: (updatedSales: Sale[]) => void;
}

export interface UseSalesStateReturn {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  editingSale: Sale | null;
  setEditingSale: React.Dispatch<React.SetStateAction<Sale | null>>;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedChannelFilter: string;
  setSelectedChannelFilter: (c: string) => void;
  showAllMonths: boolean;
  setShowAllMonths: (show: boolean) => void;
  handleSaveSale: (saleToSave: Sale) => void;
  handleDeleteSale: (saleId: string) => void;
  handleUpdateInlineSale: (saleId: string, updatedFields: Partial<Sale>) => void;
  handleImportSales: (importedSales: Sale[]) => void;
  handleConvertBudgetToSale: (budget: Budget) => void;
  handleSyncAndreaniTrackings: (trackingNumbers: string[], force?: boolean) => Promise<void>;
}

export function useSalesState({
  config,
  setCustomers,
  setBudgets,
  onAfterOperation
}: UseSalesStateProps): UseSalesStateReturn {
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('app_sales_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEMO_SEED_ENABLED ? INITIAL_SALES : [];
  });

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthISO());
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('TODOS');
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('app_sales_v1', JSON.stringify(sales));
  }, [sales]);

  const handleSaveSale = (saleToSave: Sale) => {
    let updatedSales: Sale[] = [];
    if (editingSale) {
      updatedSales = sales.map((s) => (s.id === saleToSave.id ? saleToSave : s));
      setSales(updatedSales);
      addSystemLog('SALE', 'Ventas', `Venta #${saleToSave.id} actualizada`, {
        cliente: saleToSave.clienteNombre,
        total: saleToSave.montoTotal
      });
    } else {
      updatedSales = [saleToSave, ...sales];
      setSales(updatedSales);
      addSystemLog('SALE', 'Ventas', `Nueva venta registrada #${saleToSave.id}`, {
        cliente: saleToSave.clienteNombre,
        total: saleToSave.montoTotal
      });
    }

    // Auto-update customer directory or add new customer if ID doesn't exist
    setCustomers((prevCustomers) => {
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
    if (onAfterOperation) {
      onAfterOperation(updatedSales);
    }
  };

  const handleDeleteSale = (saleId: string) => {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    addSystemLog('WARN', 'Ventas', `Venta eliminada #${saleId}`);
  };

  const handleUpdateInlineSale = (saleId: string, updatedFields: Partial<Sale>) => {
    setSales((prev) =>
      prev.map((s) => {
        if (s.id === saleId) {
          return { ...s, ...updatedFields };
        }
        return s;
      })
    );
  };

  const handleImportSales = (importedSales: Sale[]) => {
    setSales((prev) => [...importedSales, ...prev]);
  };

  const handleConvertBudgetToSale = (budget: Budget) => {
    const newSaleId = generateSaleId(sales.map((s) => s.id));
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

    setBudgets((prev) =>
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

    addSystemLog('SALE', 'Ventas', `Presupuesto ${budget.numeroPresupuesto} convertido a Venta #${newSaleId}`, {
      montoTotal: budget.importeTotal
    });

    if (onAfterOperation) {
      onAfterOperation(updatedSales);
    }
  };

  const handleSyncAndreaniTrackings = async (trackingNumbers: string[], force = false) => {
    if (!config.andreaniHash || !trackingNumbers || trackingNumbers.length === 0) return;
    try {
      const data = await fetchAndreaniTrackingsBulk(trackingNumbers, config.andreaniHash, force);
      if (Array.isArray(data) && data.length > 0) {
        const trackingMap = new Map<string, (typeof data)[0]>();
        data.forEach((item) => {
          if (item.tracking_number) {
            trackingMap.set(item.tracking_number.trim(), item);
          }
        });

        setSales((prev) =>
          prev.map((sale) => {
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

  return {
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
  };
}
