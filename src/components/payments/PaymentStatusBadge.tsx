import React from 'react';
import { CheckCircle2, CircleDollarSign, Clock3 } from 'lucide-react';
import { PaymentStatus } from '../../types';
import { ESTADO_PAGO_LABEL } from '../../utils/salePayments';
import { formatCurrency } from '../../utils/formatters';

/**
 * Píldora de estado de pago (BR-PAY-008).
 *
 * Debe llamar la atención SIN quemar la vista: fondo tenue, borde suave y texto
 * 700. Nunca se pinta la fila entera. El saldo, cuando existe, va al lado en
 * tipografía más chica y apagada.
 */
export const PaymentStatusBadge: React.FC<{ status: PaymentStatus; saldo?: number }> = ({ status, saldo }) => {
  const styles: Record<PaymentStatus, string> = {
    pagado:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    parcial:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    pendiente: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  };

  const icons: Record<PaymentStatus, React.ReactNode> = {
    pagado: <CheckCircle2 className="w-3 h-3" />,
    parcial: <CircleDollarSign className="w-3 h-3" />,
    pendiente: <Clock3 className="w-3 h-3" />,
  };

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${styles[status]}`}
      >
        {icons[status]}
        <span>{ESTADO_PAGO_LABEL[status]}</span>
      </span>
      {status !== 'pagado' && typeof saldo === 'number' && saldo > 0 && (
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{formatCurrency(saldo)}</span>
      )}
    </span>
  );
};
