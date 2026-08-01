import React from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Store, 
  Truck, 
  Receipt, 
  DollarSign, 
  ArrowUpRight,
  Filter
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

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 py-3 px-4 transition-colors duration-200">
      <div className="max-w-[1920px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
        
        {/* Metric 1: Total Acumulado Mensual */}
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

        {/* Metric 2: Cantidad de Ventas y Ticket Promedio */}
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

        {/* Metric 3: Canal Local / Venta Física */}
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

        {/* Metric 4: MercadoLibre */}
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

        {/* Metric 5: E-Commerce / WooCommerce */}
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

        {/* Metric 6: Month Selector & Envíos Pendientes */}
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase">Mes:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer font-mono font-medium"
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Envíos pend:
            </span>
            <span className={`font-bold px-1.5 py-0.2 rounded text-xs ${pendingShipments > 0 ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'}`}>
              {pendingShipments}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
