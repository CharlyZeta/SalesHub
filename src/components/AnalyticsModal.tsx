import React, { useState, useMemo } from 'react';
import { 
  X, 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  ShoppingBag, 
  Store, 
  DollarSign, 
  Calendar,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import { Sale } from '../types';
import { formatCurrency, getMonthYearLabel } from '../utils/formatters';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, sales }) => {
  if (!isOpen) return null;

  const [dateRange, setDateRange] = useState<'este_mes' | 'mes_anterior' | 'ultimos_30' | 'este_ano' | 'todos'>('este_mes');

  // Filter sales according to preset
  const filteredSales = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    // Prev month
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthIso = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    return sales.filter((s) => {
      if (dateRange === 'este_mes') {
        return s.fecha.startsWith(`${currentYear}-${currentMonth}`);
      }
      if (dateRange === 'mes_anterior') {
        return s.fecha.startsWith(prevMonthIso);
      }
      if (dateRange === 'ultimos_30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(s.fecha) >= thirtyDaysAgo;
      }
      if (dateRange === 'este_ano') {
        return s.fecha.startsWith(`${currentYear}`);
      }
      return true; // todos
    });
  }, [sales, dateRange]);

  // Aggregate Total Metrics
  const totalAmount = filteredSales.reduce((acc, s) => acc + s.montoTotal, 0);
  const totalOps = filteredSales.length;
  const ticketPromedio = totalOps > 0 ? totalAmount / totalOps : 0;

  // Chart Data 1: Revenue by Channel
  const channelData = useMemo(() => {
    const channels: Record<string, number> = {
      Local: 0,
      MercadoLibre: 0,
      WooCommerce: 0,
      Otro: 0
    };
    filteredSales.forEach((s) => {
      const c = s.canal || 'Local';
      channels[c] = (channels[c] || 0) + s.montoTotal;
    });

    return [
      { name: 'Local Físico', value: channels.Local, color: '#3b82f6' },
      { name: 'MercadoLibre', value: channels.MercadoLibre, color: '#f59e0b' },
      { name: 'WooCommerce / Web', value: channels.WooCommerce, color: '#a855f7' },
      { name: 'Otro Canal', value: channels.Otro, color: '#64748b' }
    ].filter((item) => item.value > 0);
  }, [filteredSales]);

  // Chart Data 2: Payment Method distribution
  const paymentData = useMemo(() => {
    const methods: Record<string, number> = {};
    filteredSales.forEach((s) => {
      const m = s.metodoPago || 'Efectivo';
      methods[m] = (methods[m] || 0) + s.montoTotal;
    });

    return Object.keys(methods).map((m) => ({
      name: m,
      monto: methods[m]
    })).sort((a, b) => b.monto - a.monto);
  }, [filteredSales]);

  // Top Products Sold
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};

    filteredSales.forEach((s) => {
      s.productos.forEach((p) => {
        if (!map[p.nombre]) {
          map[p.nombre] = { name: p.nombre, qty: 0, revenue: 0 };
        }
        map[p.nombre].qty += p.cantidad;
        map[p.nombre].revenue += p.subtotal;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-cyan-100 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-400 p-2 rounded-lg border border-cyan-200 dark:border-cyan-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Dashboard & Reportes Estadísticos de Ventas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Análisis de rendimiento por canal, métodos de cobro y productos estrella
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date filter dropdown */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-medium"
              >
                <option value="este_mes" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Este Mes Actual</option>
                <option value="mes_anterior" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Mes Anterior</option>
                <option value="ultimos_30" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Últimos 30 días</option>
                <option value="este_ano" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Año en curso</option>
                <option value="todos" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Todo el Historial</option>
              </select>
            </div>

            <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase">Ingresos Totales Período</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalAmount, false)}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">{totalOps} ventas realizadas</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase">Ticket Promedio por Venta</span>
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                {formatCurrency(ticketPromedio, false)}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Promedio de valor de compra</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase">Canal Principal</span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>
                  {channelData.length > 0 ? channelData.sort((a,b) => b.value - a.value)[0].name : 'N/A'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Mayor concentración de facturación</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Chart 1: Distribution by Channel */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-3 flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Ventas por Canal de Origen
              </h3>
              
              <div className="h-56 w-full">
                {channelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(Number(value)), 'Monto']} 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                    Sin datos en este período
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Revenue by Payment Method */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Métodos de Pago Utilizados
              </h3>

              <div className="h-56 w-full">
                {paymentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(Number(value)), 'Total ($)']}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      />
                      <Bar dataKey="monto" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                    Sin datos de pago
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Top Products Table */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
              Top 5 Productos Más Vendidos
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-center">Unidades Vendidas</th>
                    <th className="pb-2 text-right">Facturación Generada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                  {topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-900/50">
                      <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">{p.name}</td>
                      <td className="py-2.5 text-center text-cyan-600 dark:text-cyan-300 font-bold">{p.qty} u.</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
