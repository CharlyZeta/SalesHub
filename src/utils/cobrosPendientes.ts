import { Sale } from '../types';
import { getEstadoPago, getSaldo, getTotalCobrado, round2 } from './salePayments';

export interface ResumenCobros {
  cantidad: number;
  totalFacturado: number;
  totalCobrado: number;
  totalAdeudado: number;
  clientesConDeuda: number;
}

/**
 * Selecciona las ventas con saldo pendiente. **Cross-mes por diseño**
 * (BR-PAY-009): no depende del mes seleccionado en el KPI ni de `showAllMonths`.
 */
export function getVentasPendientes(sales: Sale[]): Sale[] {
  return sales.filter((s) => getSaldo(s) > 0).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

export function getResumenCobros(sales: Sale[]): ResumenCobros {
  const pendientes = getVentasPendientes(sales);
  const clientes = new Set(pendientes.map((s) => s.clienteId || s.clienteNombre));
  return {
    cantidad: pendientes.length,
    totalFacturado: round2(pendientes.reduce((acc, s) => acc + (Number(s.montoTotal) || 0), 0)),
    totalCobrado: round2(pendientes.reduce((acc, s) => acc + getTotalCobrado(s), 0)),
    totalAdeudado: round2(pendientes.reduce((acc, s) => acc + getSaldo(s), 0)),
    clientesConDeuda: clientes.size,
  };
}

/** Filtro combinado para el listado: búsqueda libre + rango de fechas opcional. */
export function filtrarCobros(sales: Sale[], query: string, desde?: string, hasta?: string): Sale[] {
  const q = query.trim().toLowerCase();
  return getVentasPendientes(sales).filter((s) => {
    if (desde && s.fecha < desde) return false;
    if (hasta && s.fecha > hasta) return false;
    if (!q) return true;
    const productos = s.productos.map((p) => p.nombre.toLowerCase()).join(' ');
    return (
      s.clienteNombre.toLowerCase().includes(q) ||
      (s.clienteApellido || '').toLowerCase().includes(q) ||
      (s.clienteId || '').toLowerCase().includes(q) ||
      (s.numeroFactura || '').toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      productos.includes(q)
    );
  });
}

/** Filtro por estado de pago para la planilla (FEAT-PAY-002 / AC-001). */
export function cumpleFiltroEstadoPago(sale: Sale, estado: string): boolean {
  if (!estado || estado === 'TODOS') return true;
  return getEstadoPago(sale) === estado;
}
