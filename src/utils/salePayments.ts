import { PaymentMethod, PaymentStatus, Sale, SalePayment } from '../types';

/** Redondeo monetario a 2 decimales para evitar arrastre de coma flotante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * ¿La venta es anterior al módulo de pagos?
 * Se distingue por la AUSENCIA del campo (`undefined`), no por un array vacío:
 * así las ventas históricas se consideran cobradas sin migrar ningún dato.
 */
export function esVentaHistorica(sale: Sale): boolean {
  return sale.pagos === undefined;
}

export function getPagos(sale: Sale): SalePayment[] {
  return sale.pagos ?? [];
}

/** Total cobrado según el libro de pagos. */
export function getTotalCobrado(sale: Sale): number {
  if (esVentaHistorica(sale)) return round2(sale.montoTotal);
  return round2(getPagos(sale).reduce((acc, p) => acc + (Number(p.monto) || 0), 0));
}

/** Saldo pendiente. Nunca negativo. */
export function getSaldo(sale: Sale): number {
  if (esVentaHistorica(sale)) return 0;
  const saldo = round2((Number(sale.montoTotal) || 0) - getTotalCobrado(sale));
  return saldo > 0 ? saldo : 0;
}

/** Estado derivado: pagado si no hay saldo, pendiente si no se cobró nada. */
export function getEstadoPago(sale: Sale): PaymentStatus {
  if (esVentaHistorica(sale)) return 'pagado';
  const saldo = getSaldo(sale);
  if (saldo <= 0) return 'pagado';
  const cobrado = getTotalCobrado(sale);
  return cobrado <= 0 ? 'pendiente' : 'parcial';
}

export const ESTADO_PAGO_LABEL: Record<PaymentStatus, string> = {
  pagado: 'Pagado',
  parcial: 'Pago parcial',
  pendiente: 'Pendiente de pago',
};

export interface PaymentValidationResult {
  ok: boolean;
  error?: string;
}

/** Valida un monto de pago contra el saldo actual de la venta. */
export function validarPago(monto: number, saldo: number): PaymentValidationResult {
  if (!Number.isFinite(monto)) {
    return { ok: false, error: 'Ingresá un monto válido' };
  }
  if (monto <= 0) {
    return { ok: false, error: 'El monto debe ser mayor a cero' };
  }
  if (round2(monto) > round2(saldo)) {
    return {
      ok: false,
      error: `El monto supera el saldo pendiente (${saldo.toLocaleString('es-AR')})`,
    };
  }
  return { ok: true };
}

function isoToday(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function generatePaymentId(existing: SalePayment[] = []): string {
  const nums = existing.map((p) => parseInt(p.id.replace(/^PG-/, ''), 10)).filter((n) => !Number.isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `PG-${String(next).padStart(4, '0')}`;
}

export interface NuevoPagoInput {
  monto: number;
  medio: PaymentMethod;
  nota?: string;
  fecha?: string;
  registradoPor?: string;
}

/** Construye un pago normalizado (sin tocar la venta). */
export function crearPago(input: NuevoPagoInput, existing: SalePayment[] = []): SalePayment {
  return {
    id: generatePaymentId(existing),
    fecha: input.fecha || isoToday(),
    monto: round2(input.monto),
    medio: input.medio,
    nota: input.nota?.trim() || undefined,
    registradoEn: new Date().toISOString(),
    registradoPor: input.registradoPor,
  };
}

/** Devuelve la venta con el pago agregado. No valida contra el saldo. */
export function agregarPago(sale: Sale, pago: SalePayment): Sale {
  return { ...sale, pagos: [...getPagos(sale), pago] };
}

/** Devuelve la venta sin el pago indicado. */
export function quitarPago(sale: Sale, pagoId: string): Sale {
  return { ...sale, pagos: getPagos(sale).filter((p) => p.id !== pagoId) };
}
