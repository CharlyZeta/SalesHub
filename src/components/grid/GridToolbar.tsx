import React from 'react';
import { Search, X, Columns, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { GridVisibleColumns } from './GridRow';

export interface GridToolbarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedChannelFilter: string;
  onChannelFilterChange: (val: string) => void;
  canales: string[];
  paymentFilter: string;
  setPaymentFilter: (val: string) => void;
  metodosPago: string[];
  shippingStatusFilter: string;
  setShippingStatusFilter: (val: string) => void;
  estadosEnvio: string[];
  visibleColumns: GridVisibleColumns;
  setVisibleColumns: React.Dispatch<React.SetStateAction<GridVisibleColumns>>;
  showColumnMenu: boolean;
  setShowColumnMenu: (val: boolean) => void;
  isSyncingAndreani: boolean;
  handleSyncAndreaniClick: () => void;
  onQuickAddSale: () => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  onDeleteSale: (id: string) => void;
}

export const GridToolbar: React.FC<GridToolbarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedChannelFilter,
  onChannelFilterChange,
  canales,
  paymentFilter,
  setPaymentFilter,
  metodosPago,
  shippingStatusFilter,
  setShippingStatusFilter,
  estadosEnvio,
  visibleColumns,
  setVisibleColumns,
  showColumnMenu,
  setShowColumnMenu,
  isSyncingAndreani,
  handleSyncAndreaniClick,
  onQuickAddSale,
  selectedIds,
  setSelectedIds,
  onDeleteSale
}) => {
  return (
    <>
      {/* Spreadsheet Control Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar cliente, nº cliente, nº factura, producto o nº seguimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Canal Filter Dropdown */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Canal:</span>
            <select
              value={selectedChannelFilter}
              onChange={(e) => onChannelFilterChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="TODOS" className="dark:bg-slate-900">
                Todos los Canales
              </option>
              {canales.map((c) => (
                <option key={c} value={c} className="dark:bg-slate-900">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Pago:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="dark:bg-slate-900">
                Todos los métodos
              </option>
              {metodosPago.map((m) => (
                <option key={m} value={m} className="dark:bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Shipping Status Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Envío:</span>
            <select
              value={shippingStatusFilter}
              onChange={(e) => setShippingStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="dark:bg-slate-900">
                Todos los estados
              </option>
              {estadosEnvio.map((status) => (
                <option key={status} value={status} className="dark:bg-slate-900">
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Column Visibility Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Configurar columnas visibles"
            >
              <Columns className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Columnas</span>
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2 text-xs space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-700 mb-1 px-1">
                  Mostrar / Ocultar
                </div>
                {Object.keys(visibleColumns).map((colKey) => (
                  <label
                    key={colKey}
                    className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 p-1 rounded cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={(visibleColumns as any)[colKey]}
                      onChange={(e) =>
                        setVisibleColumns({
                          ...visibleColumns,
                          [colKey]: e.target.checked
                        })
                      }
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-0"
                    />
                    <span className="capitalize">{colKey.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Andreani Sync Button */}
          <button
            type="button"
            onClick={handleSyncAndreaniClick}
            disabled={isSyncingAndreani}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-800/80 dark:hover:bg-red-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            title="Sincronizar estados de envíos de Andreani con el servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAndreani ? 'animate-spin' : ''}`} />
            <span>Rastrear Andreani</span>
          </button>

          {/* Quick Add Row Button */}
          <button
            type="button"
            onClick={onQuickAddSale}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Fila Rápida</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar if items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/80 border-b border-blue-200 dark:border-blue-800 px-4 py-2 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <span className="font-medium">{selectedIds.length} fila(s) seleccionada(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Eliminar ${selectedIds.length} ventas seleccionadas?`)) {
                  selectedIds.forEach((id) => onDeleteSale(id));
                  setSelectedIds([]);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Selección</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
