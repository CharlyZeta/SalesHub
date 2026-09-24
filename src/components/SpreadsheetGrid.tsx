import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency } from '../utils/formatters';
import { isTerminalStatus } from '../utils/andreaniStatusMapper';
import { GridRow, GridVisibleColumns } from './grid/GridRow';
import { GridToolbar } from './grid/GridToolbar';
import { GridPagination } from './grid/GridPagination';

interface SpreadsheetGridProps {
  sales: Sale[];
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (saleId: string) => void;
  onQuickAddSale: () => void;
  onUpdateInlineSale: (saleId: string, updatedFields: Partial<Sale>) => void;
  onPrintRemito: (sale: Sale) => void;
  selectedChannelFilter: string;
  onChannelFilterChange: (channel: string) => void;
  canales?: string[];
  metodosPago?: string[];
  estadosEnvio?: string[];
  selectedMonth: string;
  showAllMonths: boolean;
  andreaniHash?: string;
  onSyncAndreaniTrackings?: (trackingNumbers: string[], force?: boolean) => Promise<void>;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sales,
  onEditSale,
  onDeleteSale,
  onQuickAddSale,
  onUpdateInlineSale,
  onPrintRemito,
  selectedChannelFilter,
  onChannelFilterChange,
  canales = ['Local', 'MercadoLibre', 'WooCommerce', 'WhatsApp', 'Instagram', 'Venta Telefónica', 'Otro'],
  metodosPago = [
    'Efectivo',
    'Transferencia',
    'Tarjeta de Débito',
    'Tarjeta de Crédito',
    'MercadoPago',
    'Efectivo contra entrega',
    'Cheque / eCheq',
    'Otro'
  ],
  estadosEnvio = [
    'Pendiente',
    'Pendiente de ingreso',
    'En camino',
    'Listo para retirar',
    'Entregado',
    'No entregado',
    'Enviado',
    'No Requiere'
  ],
  selectedMonth,
  showAllMonths,
  andreaniHash = '',
  onSyncAndreaniTrackings
}) => {
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('TODOS');
  const [shippingStatusFilter, setShippingStatusFilter] = useState<string>('TODOS');
  const [sortField, setSortField] = useState<keyof Sale>('fecha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Column Visibility state
  const [visibleColumns, setVisibleColumns] = useState<GridVisibleColumns>({
    fecha: true,
    clienteId: true,
    clienteNombre: true,
    productoNombre: true,
    montoTotal: true,
    numeroFactura: true,
    metodoPago: true,
    canal: true,
    metodoEnvio: true,
    numeroSeguimiento: true,
    estadoEnvio: true,
    acciones: true
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Andreani Sync Handling
  const [isSyncingAndreani, setIsSyncingAndreani] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [showAllRows, setShowAllRows] = useState(false);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Sale } | null>(null);
  const [inlineValue, setInlineValue] = useState<string>('');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedChannelFilter,
    paymentFilter,
    shippingStatusFilter,
    searchTerm,
    selectedMonth,
    showAllMonths,
    showAllRows
  ]);

  // Handle Sort
  const handleSort = (field: keyof Sale) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filtered & Sorted Sales
  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => {
        if (!showAllMonths && !s.fecha.startsWith(selectedMonth)) {
          return false;
        }
        if (selectedChannelFilter !== 'TODOS' && s.canal !== selectedChannelFilter) {
          return false;
        }
        if (paymentFilter !== 'TODOS' && s.metodoPago !== paymentFilter) {
          return false;
        }
        if (shippingStatusFilter !== 'TODOS' && s.estadoEnvio !== shippingStatusFilter) {
          return false;
        }
        if (searchTerm.trim() !== '') {
          const query = searchTerm.toLowerCase();
          const pNames = s.productos.map((p) => p.nombre.toLowerCase()).join(' ');
          const fullCustomer = `${s.clienteNombre} ${s.clienteApellido || ''} ${s.clienteId}`.toLowerCase();
          const matchInvoice = (s.numeroFactura || '').toLowerCase().includes(query);
          const matchTracking = (s.numeroSeguimiento || '').toLowerCase().includes(query);
          const matchNotes = (s.notas || '').toLowerCase().includes(query);

          return fullCustomer.includes(query) || pNames.includes(query) || matchInvoice || matchTracking || matchNotes;
        }
        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [
    sales,
    selectedChannelFilter,
    paymentFilter,
    shippingStatusFilter,
    searchTerm,
    sortField,
    sortDirection,
    selectedMonth,
    showAllMonths
  ]);

  const totalPages = showAllRows ? 1 : Math.ceil(filteredSales.length / recordsPerPage);

  const paginatedSales = useMemo(() => {
    if (showAllRows) {
      return filteredSales;
    }
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredSales.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredSales, currentPage, recordsPerPage, showAllRows]);

  const handleSyncAndreaniClick = async () => {
    if (!andreaniHash) {
      alert('Para utilizar el rastreo automático de Andreani, ingresa el Hash de tu cuenta en Ajustes (ícono ⚙).');
      return;
    }

    const trackingNumbers = paginatedSales
      .filter(
        (s) =>
          s.metodoEnvio?.toLowerCase().includes('andreani') &&
          s.numeroSeguimiento &&
          s.numeroSeguimiento.trim() !== '' &&
          !isTerminalStatus(s.estadoEnvio)
      )
      .map((s) => s.numeroSeguimiento!.trim());

    if (trackingNumbers.length === 0) {
      alert('No hay envíos de Andreani pendientes de entrega en la página actual o que no estén marcados como Entregado.');
      return;
    }

    setIsSyncingAndreani(true);
    try {
      if (onSyncAndreaniTrackings) {
        await onSyncAndreaniTrackings(trackingNumbers, true);
      }
    } catch (e: any) {
      alert(`Error al sincronizar tracking: ${e.message}`);
    } finally {
      setIsSyncingAndreani(false);
    }
  };

  // Automatic background tracking sync for visible Andreani items
  useEffect(() => {
    if (!andreaniHash || !onSyncAndreaniTrackings) return;

    const pendingVisible = paginatedSales
      .filter((s) => {
        const isAndreani = s.metodoEnvio?.toLowerCase().includes('andreani');
        const hasTracking = s.numeroSeguimiento && s.numeroSeguimiento.trim() !== '';
        const isNotTerminal = !isTerminalStatus(s.estadoEnvio);
        return isAndreani && hasTracking && isNotTerminal;
      })
      .map((s) => s.numeroSeguimiento!.trim());

    if (pendingVisible.length > 0) {
      const timer = setTimeout(() => {
        onSyncAndreaniTrackings(pendingVisible, false).catch((err) => {
          console.error('Auto visible tracking sync failed:', err);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [paginatedSales, andreaniHash, onSyncAndreaniTrackings]);

  // Memoized handlers for GridRow stability
  const handleCopyText = useCallback((text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredSales.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const startInlineEdit = useCallback((sale: Sale, field: string) => {
    setEditingCell({ id: sale.id, field: field as keyof Sale });
    setInlineValue(String(sale[field as keyof Sale] || ''));
  }, []);

  const saveInlineEdit = useCallback(
    (saleId: string) => {
      if (!editingCell) return;
      const { field } = editingCell;

      let updatedVal: any = inlineValue;
      if (field === 'montoTotal') {
        const parsed = parseFloat(inlineValue);
        updatedVal = isNaN(parsed) ? 0 : parsed;
      }

      onUpdateInlineSale(saleId, { [field]: updatedVal });
      setEditingCell(null);
      setInlineValue('');
    },
    [editingCell, inlineValue, onUpdateInlineSale]
  );

  return (
    <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-0 overflow-hidden transition-colors duration-200">
      {/* Spreadsheet Control Bar */}
      <GridToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedChannelFilter={selectedChannelFilter}
        onChannelFilterChange={onChannelFilterChange}
        canales={canales}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        metodosPago={metodosPago}
        shippingStatusFilter={shippingStatusFilter}
        setShippingStatusFilter={setShippingStatusFilter}
        estadosEnvio={estadosEnvio}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        showColumnMenu={showColumnMenu}
        setShowColumnMenu={setShowColumnMenu}
        isSyncingAndreani={isSyncingAndreani}
        handleSyncAndreaniClick={handleSyncAndreaniClick}
        onQuickAddSale={onQuickAddSale}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onDeleteSale={onDeleteSale}
      />

      {/* High Density Spreadsheet Table */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse font-sans text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
          {/* Table Header */}
          <thead className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider sticky top-0 z-20 backdrop-blur-xs select-none">
            <tr className="divide-x divide-slate-100 dark:divide-slate-800">
              <th className="p-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === filteredSales.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-blue-600 focus:ring-0 cursor-pointer"
                />
              </th>

              {visibleColumns.clienteId && (
                <th
                  onClick={() => handleSort('clienteId')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>NCLI</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.fecha && (
                <th
                  onClick={() => handleSort('fecha')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[100px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.clienteNombre && (
                <th
                  onClick={() => handleSort('clienteNombre')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[150px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.productoNombre && (
                <th className="p-2.5 whitespace-nowrap min-w-[200px]">
                  <span>Producto</span>
                </th>
              )}

              {visibleColumns.montoTotal && (
                <th
                  onClick={() => handleSort('montoTotal')}
                  className="p-2.5 text-right cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Precio</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.numeroFactura && (
                <th
                  onClick={() => handleSort('numeroFactura')}
                  className="p-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap min-w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Factura</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              )}

              {visibleColumns.canal && (
                <th className="p-2.5 whitespace-nowrap min-w-[120px]">
                  <span>Canal de Venta</span>
                </th>
              )}

              {visibleColumns.metodoPago && (
                <th className="p-2.5 whitespace-nowrap min-w-[120px]">
                  <span>Met. Pago</span>
                </th>
              )}

              {visibleColumns.metodoEnvio && (
                <th className="p-2.5 whitespace-nowrap min-w-[150px]">
                  <span>Método de Envío</span>
                </th>
              )}

              {visibleColumns.numeroSeguimiento && (
                <th className="p-2.5 whitespace-nowrap min-w-[140px]">
                  <span>Nº de Envío</span>
                </th>
              )}

              {visibleColumns.estadoEnvio && (
                <th className="p-2.5 whitespace-nowrap min-w-[110px]">
                  <span>Estado Envío</span>
                </th>
              )}

              {visibleColumns.acciones && (
                <th className="p-2.5 text-center whitespace-nowrap w-24 sticky right-0 bg-slate-50/90 dark:bg-slate-900/90">
                  <span>Acciones</span>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[12px]">
            {paginatedSales.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-12 text-slate-500 dark:text-slate-400 font-sans">
                  <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">No se encontraron ventas registradas</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Prueba modificando la búsqueda, los filtros de canal o agrega una nueva venta.
                    </p>
                    <button
                      type="button"
                      onClick={onQuickAddSale}
                      className="mt-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
                    >
                      + Registrar Venta Ahora
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedSales.map((sale) => (
                <GridRow
                  key={sale.id}
                  sale={sale}
                  isSelected={selectedIds.includes(sale.id)}
                  visibleColumns={visibleColumns}
                  editingCell={editingCell}
                  inlineValue={inlineValue}
                  copiedId={copiedId}
                  onSelectRow={handleSelectRow}
                  onStartInlineEdit={startInlineEdit}
                  onChangeInlineValue={setInlineValue}
                  onSaveInlineEdit={saveInlineEdit}
                  onCopyText={handleCopyText}
                  onEditSale={onEditSale}
                  onDeleteSale={onDeleteSale}
                  onPrintRemito={onPrintRemito}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <GridPagination
        recordsPerPage={recordsPerPage}
        setRecordsPerPage={setRecordsPerPage}
        showAllRows={showAllRows}
        setShowAllRows={setShowAllRows}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />

      {/* Spreadsheet Status Footer */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span>
            MOSTRANDO <strong className="text-white font-mono">{paginatedSales.length}</strong> DE{' '}
            <strong className="text-white font-mono">{filteredSales.length}</strong> FILTRADAS (TOTAL:{' '}
            <strong className="text-white font-mono">{sales.length}</strong>)
          </span>
          <span className="hidden sm:inline border-l border-slate-700 pl-4 text-slate-400">
            Haz clic en el monto o número de factura para editar celdas directamente
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">Total Filtrado:</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            {formatCurrency(filteredSales.reduce((acc, s) => acc + s.montoTotal, 0))}
          </span>
        </div>
      </div>
    </div>
  );
};
