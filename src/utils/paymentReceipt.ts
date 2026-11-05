import { PaymentStatus, Sale, SalePayment } from '../types';
import {
  ESTADO_PAGO_LABEL,
  esVentaHistorica,
  getEstadoPago,
  getPagos,
  getSaldo,
  getTotalCobrado,
  round2,
} from './salePayments';

/** Marcador explícito para datos que la venta no tiene (BR-006). */
export const SIN_DATO = '—';

export interface ReciboProducto {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface ReciboCliente {
  nombre: string;
  documento: string;
  telefono: string;
  direccion: string;
  localidadProvincia: string;
}

export interface ReciboParcialidad {
  /** Posición del pago dentro del libro (1-based). */
  indice: number;
  totalPagos: number;
  importe: number;
  medio: string;
  nota?: string;
  fecha: string;
}

export interface ReciboPago {
  numero: string;
  tipo: 'venta' | 'pago';
  fechaEmision: string;
  ventaId: string;
  comprobante: string;
  cliente: ReciboCliente;
  productos: ReciboProducto[];
  condicion: { estado: PaymentStatus; label: string };
  parcialidad?: ReciboParcialidad;
  total: number;
  pagado: number;
  saldo: number;
  /** Venta anterior al módulo de pagos: se emite como pagada (AF-01). */
  ventaHistorica: boolean;
}

const texto = (valor?: string | null): string => {
  const limpio = (valor ?? '').toString().trim();
  return limpio.length > 0 ? limpio : SIN_DATO;
};

/** Fecha de hoy en ISO corto, sin desplazamiento de zona. */
export function fechaHoyISO(): string {
  const ahora = new Date();
  const offsetMs = ahora.getTimezoneOffset() * 60 * 1000;
  return new Date(ahora.getTime() - offsetMs).toISOString().slice(0, 10);
}

/**
 * Número determinístico del recibo (BR-005 / AS-01 confirmado).
 * - Recibo de la venta: `REC-<ventaId>`
 * - Recibo de un pago:  `REC-<ventaId>-<pagoId>`
 * Se repite idéntico en pantalla, impresión y PDF.
 */
export function numeroRecibo(sale: Sale, pago?: SalePayment): string {
  return pago ? `REC-${sale.id}-${pago.id}` : `REC-${sale.id}`;
}

function mapearProductos(sale: Sale): ReciboProducto[] {
  return (sale.productos ?? []).map((p) => ({
    nombre: texto(p.nombre),
    cantidad: Number(p.cantidad) || 0,
    precioUnitario: round2(Number(p.precioUnitario) || 0),
    subtotal: round2(Number(p.subtotal) || 0),
  }));
}

function mapearCliente(sale: Sale): ReciboCliente {
  const localidad = texto(sale.clienteLocalidad);
  const provincia = texto(sale.clienteProvincia);
  const localidadProvincia =
    localidad === SIN_DATO && provincia === SIN_DATO
      ? SIN_DATO
      : [localidad, provincia].filter((v) => v !== SIN_DATO).join(', ');

  return {
    nombre: texto(`${sale.clienteNombre ?? ''} ${sale.clienteApellido ?? ''}`.trim()),
    documento: texto(sale.clienteDniCuit),
    telefono: texto(sale.clienteTelefono),
    direccion: texto(sale.clienteDireccion),
    localidadProvincia: localidadProvincia || SIN_DATO,
  };
}

/**
 * Arma el recibo de una venta o de uno de sus pagos (BR-001: no lee ni escribe
 * estado fuera de la venta recibida; devuelve un objeto nuevo).
 *
 * Si `pagoId` no existe en el libro, devuelve el recibo de la venta.
 */
export function armarReciboPago(sale: Sale, pagoId?: string, fechaEmision = fechaHoyISO()): ReciboPago {
  const pagos = getPagos(sale);
  const pago = pagoId ? pagos.find((p) => p.id === pagoId) : undefined;

  const ventaHistorica = esVentaHistorica(sale);
  const total = round2(Number(sale.montoTotal) || 0);
  const pagado = getTotalCobrado(sale);
  const saldo = getSaldo(sale);
  const estado = getEstadoPago(sale);

  const parcialidad: ReciboParcialidad | undefined = pago
    ? {
        indice: pagos.findIndex((p) => p.id === pago.id) + 1,
        totalPagos: pagos.length,
        importe: round2(Number(pago.monto) || 0),
        medio: texto(pago.medio),
        nota: pago.nota?.trim() || undefined,
        fecha: pago.fecha,
      }
    : undefined;

  return {
    numero: numeroRecibo(sale, pago),
    tipo: pago ? 'pago' : 'venta',
    fechaEmision,
    ventaId: sale.id,
    comprobante: texto(sale.numeroFactura),
    cliente: mapearCliente(sale),
    productos: mapearProductos(sale),
    condicion: { estado, label: ESTADO_PAGO_LABEL[estado] },
    parcialidad,
    total,
    pagado,
    saldo,
    ventaHistorica,
  };
}
