import { Sale } from '../types';
import { agregarPago, crearPago, getPagos, NuevoPagoInput, quitarPago } from '../utils/salePayments';
import { getActiveSessionUser } from '../services/userService';
import { addSystemLog } from '../utils/logger';
import { formatCurrency } from '../utils/formatters';

/**
 * Acciones del libro de pagos (FEAT-PAY-001) reutilizables por cualquier vista
 * que liste ventas: planilla y listado de cobros comparten la misma lógica y el
 * mismo registro de auditoría (BR-PAY-005).
 */
export function useSalePaymentActions(onUpdateInlineSale: (saleId: string, updatedFields: Partial<Sale>) => void) {
  const addPayment = (sale: Sale, input: NuevoPagoInput) => {
    const usuario = getActiveSessionUser()?.username ?? 'sistema';
    const pago = crearPago({ ...input, registradoPor: usuario }, getPagos(sale));
    const actualizada = agregarPago(sale, pago);
    onUpdateInlineSale(sale.id, { pagos: actualizada.pagos });
    addSystemLog(
      'INFO',
      'Pagos',
      `Pago registrado en venta ${sale.numeroFactura || sale.id}: ${formatCurrency(pago.monto)} (${pago.medio}) por ${usuario}`
    );
  };

  const removePayment = (sale: Sale, pagoId: string) => {
    const actualizada = quitarPago(sale, pagoId);
    onUpdateInlineSale(sale.id, { pagos: actualizada.pagos });
    addSystemLog('WARN', 'Pagos', `Pago eliminado de venta ${sale.numeroFactura || sale.id}: ${pagoId}`);
  };

  return { addPayment, removePayment };
}
