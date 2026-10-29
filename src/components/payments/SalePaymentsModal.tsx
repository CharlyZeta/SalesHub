import React, { useMemo, useState } from 'react';
import { X, Wallet, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Sale } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getEstadoPago, getPagos, getSaldo, getTotalCobrado, validarPago } from '../../utils/salePayments';
import { PaymentStatusBadge } from './PaymentStatusBadge';

export interface NuevoPagoForm {
  monto: number;
  medio: string;
  nota?: string;
}

export interface SalePaymentsModalProps {
  sale: Sale;
  onClose: () => void;
  onAdd: (input: NuevoPagoForm) => void;
  onRemove: (pagoId: string) => void;
  readOnly?: boolean;
}

const MEDIOS_SUGERIDOS = ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Mercado Pago', 'Cuenta corriente'];

/**
 * Libro de pagos de una venta (FEAT-PAY-001): registra entregas parciales y
 * muestra el historial. El saldo y el estado se derivan, nunca se editan a mano.
 */
export const SalePaymentsModal: React.FC<SalePaymentsModalProps> = ({ sale, onClose, onAdd, onRemove, readOnly }) => {
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState('Efectivo');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  const pagos = getPagos(sale);
  const saldo = getSaldo(sale);
  const cobrado = getTotalCobrado(sale);
  const estado = getEstadoPago(sale);

  const montoNum = useMemo(() => Number(monto.replace(',', '.')), [monto]);
  const validacion = useMemo(() => validarPago(montoNum, saldo), [montoNum, saldo]);

  const handleRegistrar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const chequeo = validarPago(montoNum, saldo);
    if (!chequeo.ok) {
      setError(chequeo.error || 'Monto inválido');
      return;
    }
    onAdd({
      monto: montoNum,
      medio: medio.trim() || 'Efectivo',
      nota: nota.trim() || undefined,
    });
    setMonto('');
    setNota('');
  };

  const puedeCobrar = !readOnly && saldo > 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Pagos de la venta</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {sale.clienteNombre} · {sale.numeroFactura || sale.id}
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
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</div>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatCurrency(sale.montoTotal)}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Cobrado</div>
              <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(cobrado)}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Saldo</div>
              <div className="font-mono font-bold text-rose-700 dark:text-rose-300">{formatCurrency(saldo)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <PaymentStatusBadge status={estado} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{pagos.length} pago(s) registrado(s)</span>
          </div>

          {puedeCobrar && (
            <form
              onSubmit={handleRegistrar}
              className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 space-y-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Monto a cobrar</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ''))}
                    placeholder={`Máx. ${formatCurrency(saldo)}`}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Medio</label>
                  <input
                    type="text"
                    list="medios-pago-sugeridos"
                    value={medio}
                    onChange={(e) => setMedio(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="medios-pago-sugeridos">
                    {MEDIOS_SUGERIDOS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="ej: entrega parcial en local"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {(error || (monto && !validacion.ok)) && (
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error || validacion.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!monto || !validacion.ok}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-3 py-1.5 rounded flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Registrar pago</span>
              </button>
            </form>
          )}

          {!readOnly && saldo <= 0 && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Venta pagada por completo: no admite nuevos pagos.
            </p>
          )}

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Historial</div>
            {pagos.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">Sin pagos registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                {[...pagos]
                  .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
                  .map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 px-2.5 py-2">
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(p.monto)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {formatDate(p.fecha)} · {p.medio}
                          {p.registradoPor ? ` · ${p.registradoPor}` : ''}
                          {p.nota ? ` · ${p.nota}` : ''}
                        </div>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => onRemove(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Eliminar pago"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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

export default SalePaymentsModal;
