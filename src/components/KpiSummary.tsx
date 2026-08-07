import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Store, 
  Truck, 
  Receipt, 
  DollarSign, 
  ArrowUpRight,
  Settings,
  X
} from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency, getMonthYearLabel, getCurrentMonthISO } from '../utils/formatters';

interface KpiSummaryProps {
  sales: Sale[];
  selectedMonth: string;
  onMonthChange: (monthIso: string) => void;
  selectedChannelFilter: string;
  onChannelFilterChange: (channel: string) => void;
}

export const KpiSummary: React.FC<KpiSummaryProps> = ({
  sales,
  selectedMonth,
  onMonthChange,
  selectedChannelFilter,
  onChannelFilterChange
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [visibleKpis, setVisibleKpis] = useState(() => {
    const saved = localStorage.getItem('saleshub_visible_kpis');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default
      }
    }
    return {
      acumuladoMensual: true,
      ticketPromedio: true,
      localFisico: true,
      mercadoLibre: true,
      wooCommerce: true,
      enviosPendientes: true
    };
  });

  const toggleKpi = (key: string) => {
    const updated = {
      ...visibleKpis,
      [key]: !((visibleKpis as any)[key])
    };
    setVisibleKpis(updated);
    localStorage.setItem('saleshub_visible_kpis', JSON.stringify(updated));
  };

  // Filter sales for the selected month
  const monthSales = sales.filter((s) => s.fecha.startsWith(selectedMonth));

  // Cumulative Totals
  const totalAmount = monthSales.reduce((sum, s) => sum + s.montoTotal, 0);
  const totalCount = monthSales.length;
  const averageTicket = totalCount > 0 ? totalAmount / totalCount : 0;

  // Breakdown by channel
  const localSales = monthSales.filter((s) => s.canal === 'Local');
  const meliSales = monthSales.filter((s) => s.canal === 'MercadoLibre');
  const wooSales = monthSales.filter((s) => s.canal === 'WooCommerce');

  const localTotal = localSales.reduce((sum, s) => sum + s.montoTotal, 0);
  const meliTotal = meliSales.reduce((sum, s) => sum + s.montoTotal, 0);
  const wooTotal = wooSales.reduce((sum, s) => sum + s.montoTotal, 0);

  const localPercent = totalAmount > 0 ? Math.round((localTotal / totalAmount) * 100) : 0;
  const meliPercent = totalAmount > 0 ? Math.round((meliTotal / totalAmount) * 100) : 0;
  const wooPercent = totalAmount > 0 ? Math.round((wooTotal / totalAmount) * 100) : 0;

  // Pending Shipments count
  const pendingShipments = monthSales.filter((s) => s.estadoEnvio === 'Pendiente' || s.estadoEnvio === 'Enviado').length;

  const visibleCardsCount = [
    visibleKpis.acumuladoMensual,
    visibleKpis.ticketPromedio,
    visibleKpis.localFisico,
    visibleKpis.mercadoLibre,
    visibleKpis.wooCommerce,
    true // Month selector is always visible
  ].filter(Boolean).length;

  const gridColsClass = 
    visibleCardsCount === 1 ? 'lg:grid-cols-1' :
    visibleCardsCount === 2 ? 'lg:grid-cols-2' :
    visibleCardsCount === 3 ? 'lg:grid-cols-3' :
    visibleCardsCount === 4 ? 'lg:grid-cols-4' :
    visibleCardsCount === 5 ? 'lg:grid-cols-5' :
    'lg:grid-cols-6';

  const smGridColsClass =
    visibleCardsCount === 1 ? 'sm:grid-cols-1' :
    visibleCardsCount === 2 ? 'sm:grid-cols-2' :
    'sm:grid-cols-3';

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 py-3 px-4 transition-colors duration-200">
      <div className="max-w-[1920px] mx-auto">
        <div className={`grid grid-cols-2 ${smGridColsClass} ${gridColsClass} gap-3 items-stretch`}>
          
          {/* Metric 1: Total Acumulado Mensual */}
          {visibleKpis.acumuladoMensual && (
            <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3 shadow-xs flex items-center justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  <span>Acumulado Mensual</span>
                </div>
                <div className="text-lg md:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                  {formatCurrency(totalAmount, false)}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                  {getMonthYearLabel(selectedMonth)}
                </div>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Metric 2: Cantidad de Ventas y Ticket Promedio */}
          {visibleKpis.ticketPromedio && (
            <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  Ventas / Ticket Prom.
                </div>
                <div className="text-lg md:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight mt-0.5 flex items-baseline gap-1.5">
                  <span>{totalCount} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">ops</span></span>
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-0.5 font-medium">
                  Prom: {formatCurrency(averageTicket, false)}
                </div>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-800">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Metric 3: Canal Local / Venta Física */}
          {visibleKpis.localFisico && (
            <button
              onClick={() => onChannelFilterChange(selectedChannelFilter === 'Local' ? 'TODOS' : 'Local')}
              className={`text-left p-3 rounded-lg border transition-all cursor-pointer shadow-xs ${
                selectedChannelFilter === 'Local'
                  ? 'bg-blue-50/80 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 ring-1 ring-blue-400'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase">
                <span className="flex items-center gap-1">
                  <Store className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  Local Físico
                </span>
                <span className="text-[10px] bg-blue-100/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded font-bold">
                  {localPercent}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {formatCurrency(localTotal, false)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {localSales.length} operaciones
              </div>
            </button>
          )}

          {/* Metric 4: MercadoLibre */}
          {visibleKpis.mercadoLibre && (
            <button
              onClick={() => onChannelFilterChange(selectedChannelFilter === 'MercadoLibre' ? 'TODOS' : 'MercadoLibre')}
              className={`text-left p-3 rounded-lg border transition-all cursor-pointer shadow-xs ${
                selectedChannelFilter === 'MercadoLibre'
                  ? 'bg-amber-50/80 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  MercadoLibre
                </span>
                <span className="text-[10px] bg-amber-100/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                  {meliPercent}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {formatCurrency(meliTotal, false)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {meliSales.length} operaciones
              </div>
            </button>
          )}

          {/* Metric 5: E-Commerce / WooCommerce */}
          {visibleKpis.wooCommerce && (
            <button
              onClick={() => onChannelFilterChange(selectedChannelFilter === 'WooCommerce' ? 'TODOS' : 'WooCommerce')}
              className={`text-left p-3 rounded-lg border transition-all cursor-pointer shadow-xs ${
                selectedChannelFilter === 'WooCommerce'
                  ? 'bg-purple-50/80 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700 ring-1 ring-purple-400'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  Woo / Web
                </span>
                <span className="text-[10px] bg-purple-100/70 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded font-bold">
                  {wooPercent}%
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {formatCurrency(wooTotal, false)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {wooSales.length} operaciones
              </div>
            </button>
          )}

          {/* Metric 6: Month Selector & Envíos Pendientes */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3 shadow-xs flex flex-col justify-between relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase">Mes:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer font-mono font-medium w-[115px]"
                />
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-1.5 rounded transition-colors cursor-pointer border ${
                      showSettings 
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="Configurar indicadores visibles"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2 text-[11px] space-y-1 font-sans">
                      <div className="font-semibold text-slate-700 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-700 mb-1 px-1 flex items-center justify-between">
                        <span>Mostrar Indicadores</span>
                        <button 
                          onClick={() => setShowSettings(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {[
                        { key: 'acumuladoMensual', label: 'Acumulado Mensual' },
                        { key: 'ticketPromedio', label: 'Ventas / Ticket Prom.' },
                        { key: 'localFisico', label: 'Local Físico' },
                        { key: 'mercadoLibre', label: 'MercadoLibre' },
                        { key: 'wooCommerce', label: 'Woo / Web' },
                        { key: 'enviosPendientes', label: 'Envíos Pendientes' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 p-1 rounded cursor-pointer text-slate-700 dark:text-slate-200">
                          <span>{item.label}</span>
                          <input
                            type="checkbox"
                            checked={!!(visibleKpis as any)[item.key]}
                            onChange={() => toggleKpi(item.key)}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {visibleKpis.enviosPendientes && (
              <div className="flex items-center justify-between mt-1 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                  <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Envíos pend:
                </span>
                <span className={`font-bold px-1.5 py-0.2 rounded text-xs ${pendingShipments > 0 ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'}`}>
                  {pendingShipments}
                </span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
