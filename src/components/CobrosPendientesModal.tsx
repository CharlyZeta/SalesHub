import React, { useMemo, useState } from 'react';
import { X, Search, FileDown, Wallet, AlertCircle } from 'lucide-react';
import { CompanyConfig, Sale } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { filtrarCobros, getResumenCobros, getVentasPendientes } from '../utils/cobrosPendientes';
import { getEstadoPago, getSaldo, getTotalCobrado } from '../utils/salePayments';
import { claveCliente } from '../utils/cuentaCorriente';
import { exportarCobrosPendientesPDF } from '../utils/pdfCobros';
import { PaymentStatusBadge } from './payments/PaymentStatusBadge';

export interface CobrosPendientesModalProps {
  sales: Sale[];
  empresa?: Partial<CompanyConfig>;
  onClose: () => void;
  onOpenPayments?: (sale: Sale) => void;
  /** Abre la cuenta corriente del cliente (FEAT-PAY-003). */
  onOpenCuentaCorriente?: (clave: string) => void;
}

/**
 * Listado de cobros pendientes (FEAT-PAY-002).
 *
 * Barre TODO el histórico, sin importar el mes en curso (BR-PAY-009): es el
 * listado de deuda, no un reporte mensual.
 */
export const CobrosPendientesModal: React.FC<CobrosPendientesModalProps> = ({
  sales,
  empresa,
  onClose,
  onOpenPayments,
  onOpenCuentaCorriente,
}) => {
  const [query, setQuery] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  const ventas = useMemo(() => filtrarCobros(sales, query, desde || undefined, hasta || undefined), [sales, query, desde, hasta]);
  const resumen = useMemo(() => getResumenCobros(sales), [sales]);
  const hayDeuda = getVentasPendientes(sales).length > 0;

  const handleExportar = async () => {
    setError('');
    setExportando(true);
    try {
      await exportarCobrosPendientesPDF(ventas, getResumenCobros(ventas), empresa);
    } catch (e: any) {
      setError(e?.message || 'No se pudo generar el PDF');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Cobros pendientes</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Todas las ventas con saldo, de cualquier mes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Ventas pendientes', value: String(resumen.cantidad) },
              { label: 'Clientes con deuda', value: String(resumen.clientesConDeuda) },
              { label: 'Total cobrado', value: formatCurrency(resumen.totalCobrado) },
              { label: 'Total a cobrar', value: formatCurrency(resumen.totalAdeudado), destacado: true },
            ].map((c) => (
              <div
                key={c.label}
                className={`border rounded-lg p-2.5 ${
                  c.destacado
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{c.label}</div>
                <div
                  className={`font-mono font-bold ${
                    c.destacado ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px]">
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Buscar</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cliente, comprobante o producto"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Desde (opcional)</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Hasta (opcional)</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={handleExportar}
              disabled={!hayDeuda || exportando || ventas.length === 0}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{exportando ? 'Generando…' : 'Exportar PDF'}</span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          {!hayDeuda ? (
            <div className="py-10 text-center text-slate-500 dark:text-slate-400">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No hay cobros pendientes</p>
              <p className="text-[11px]">Todas las ventas registradas están pagadas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="p-2.5 whitespace-nowrap">Fecha</th>
                    <th className="p-2.5">Cliente</th>
                    <th className="p-2.5 whitespace-nowrap">Comprobante</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Total</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Cobrado</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Saldo</th>
                    <th className="p-2.5 whitespace-nowrap">Estado</th>
                    <th className="p-2.5 text-center">Pagos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {ventas.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDate(s.fecha)}</td>
                      <td className="p-2.5 font-medium">
                        {onOpenCuentaCorriente ? (
                          <button
                            type="button"
                            onClick={() => onOpenCuentaCorriente(claveCliente(s))}
                            className="text-slate-900 dark:text-slate-100 hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer text-left"
                            title="Ver cuenta corriente del cliente"
                          >
                            {s.clienteNombre} {s.clienteApellido || ''}
                          </button>
                        ) : (
                          <span className="text-slate-900 dark:text-slate-100">
                            {s.clienteNombre} {s.clienteApellido || ''}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                        {s.numeroFactura || s.id}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(s.montoTotal)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(getTotalCobrado(s))}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-700 dark:text-rose-400">
                        {formatCurrency(getSaldo(s))}
                      </td>
                      <td className="p-2.5">
                        <PaymentStatusBadge status={getEstadoPago(s)} />
                      </td>
                      <td className="p-2.5 text-center">
                        {onOpenPayments && (
                          <button
                            type="button"
                            onClick={() => onOpenPayments(s)}
                            className="p-1 text-slate-500 hover:text-emerald-600 cursor-pointer"
                            title="Registrar pago"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CobrosPendientesModal;
