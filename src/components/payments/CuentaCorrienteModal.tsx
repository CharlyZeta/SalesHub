import React, { useMemo, useState } from 'react';
import { X, FileDown, Wallet, AlertCircle, UserRound } from 'lucide-react';
import { CompanyConfig, Sale } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getEstadoPago, getSaldo, getTotalCobrado } from '../../utils/salePayments';
import { getCuentaCorriente, getPagosDelCliente } from '../../utils/cuentaCorriente';
import { exportarCuentaCorrientePDF } from '../../utils/pdfCuentaCorriente';
import { PaymentStatusBadge } from './PaymentStatusBadge';

export interface CuentaCorrienteModalProps {
  sales: Sale[];
  clave: string;
  empresa?: Partial<CompanyConfig>;
  onClose: () => void;
  onOpenPayments?: (sale: Sale) => void;
}

/**
 * Cuenta corriente por cliente (FEAT-PAY-003): deuda total del cliente y
 * extracto de ventas y pagos. Solo consulta (AF-04): los pagos se registran
 * desde la venta para no perder el vínculo con el comprobante.
 */
export const CuentaCorrienteModal: React.FC<CuentaCorrienteModalProps> = ({
  sales,
  clave,
  empresa,
  onClose,
  onOpenPayments,
}) => {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  const resumen = useMemo(() => getCuentaCorriente(sales, clave), [sales, clave]);
  const pagos = useMemo(() => getPagosDelCliente(sales, clave), [sales, clave]);

  if (!resumen) return null;

  const handleExportar = async () => {
    setError('');
    setExportando(true);
    try {
      await exportarCuentaCorrientePDF(resumen, pagos, empresa);
    } catch (e: any) {
      setError(e?.message || 'No se pudo generar el PDF');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <UserRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{resumen.clienteNombre}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cuenta corriente
                {resumen.clienteId ? ` · ${resumen.clienteId}` : ''}
                {resumen.sinIdentificar ? ' · sin identificar' : ''}
              </p>
            </div>
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
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Facturado</div>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(resumen.totalFacturado)}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Cobrado</div>
              <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(resumen.totalCobrado)}
              </div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Saldo</div>
              <div className="font-mono font-bold text-rose-700 dark:text-rose-300">
                {formatCurrency(resumen.saldo)}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Antigüedad</div>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {resumen.antiguedadDias} días
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExportar}
              disabled={exportando || resumen.saldo <= 0}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{exportando ? 'Generando…' : 'Exportar extracto PDF'}</span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
              Ventas con saldo
            </div>
            {resumen.ventas.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Sin saldo pendiente.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="p-2.5 whitespace-nowrap">Fecha</th>
                      <th className="p-2.5">Comprobante</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-right">Cobrado</th>
                      <th className="p-2.5 text-right">Saldo</th>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5 text-center">Pagos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {resumen.ventas.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {formatDate(s.fecha)}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                          {s.numeroFactura || s.id}
                        </td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(s.montoTotal)}</td>
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

          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
              Pagos recibidos ({pagos.length})
            </div>
            {pagos.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Sin pagos registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                {pagos.slice(0, 20).map(({ pago, venta }) => (
                  <li key={`${venta.id}-${pago.id}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatDate(pago.fecha)} · {pago.medio} · {venta.numeroFactura || venta.id}
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(pago.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CuentaCorrienteModal;
