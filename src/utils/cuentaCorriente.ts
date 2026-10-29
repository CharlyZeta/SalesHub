import { Sale, SalePayment } from '../types';
import { normalizePersonName } from './formatters';
import { getPagos, getSaldo, getTotalCobrado, round2 } from './salePayments';

export interface CuentaCorrienteResumen {
  clave: string;
  clienteNombre: string;
  clienteId?: string;
  ventas: Sale[];
  totalFacturado: number;
  totalCobrado: number;
  saldo: number;
  /** Días desde la venta más vieja con saldo (BR-PAY-018). */
  antiguedadDias: number;
  /** true si la venta vieja no tenía `clienteId` y se agrupó por nombre. */
  sinIdentificar: boolean;
}

/**
 * Clave de agrupación del cliente (BR-PAY-018): `clienteId` cuando existe; si no,
 * el nombre normalizado para que una venta vieja no desaparezca del total.
 */
export function claveCliente(sale: Sale): string {
  const id = (sale.clienteId || '').trim();
  if (id) return `ID:${id}`;
  const nombre = normalizePersonName(`${sale.clienteNombre} ${sale.clienteApellido || ''}`.trim());
  return `NOMBRE:${nombre || 'sin-identificar'}`;
}

export function nombreClienteDeVenta(sale: Sale): string {
  return `${sale.clienteNombre} ${sale.clienteApellido || ''}`.trim() || 'Sin identificar';
}

function diasDesde(fechaISO: string): number {
  const hoy = new Date();
  const offsetMs = hoy.getTimezoneOffset() * 60 * 1000;
  const hoyISO = new Date(hoy.getTime() - offsetMs).toISOString().slice(0, 10);
  const ms = new Date(`${hoyISO}T00:00:00`).getTime() - new Date(`${fechaISO}T00:00:00`).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** Todas las claves de clientes que hoy tienen deuda. */
export function getClientesConDeuda(sales: Sale[]): { clave: string; nombre: string }[] {
  const map = new Map<string, string>();
  sales
    .filter((s) => getSaldo(s) > 0)
    .forEach((s) => {
      const clave = claveCliente(s);
      if (!map.has(clave)) map.set(clave, nombreClienteDeVenta(s));
    });
  return [...map.entries()]
    .map(([clave, nombre]) => ({ clave, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Cuenta corriente completa de un cliente: ventas con saldo + pagos recibidos. */
export function getCuentaCorriente(sales: Sale[], clave: string): CuentaCorrienteResumen | null {
  const delCliente = sales.filter((s) => claveCliente(s) === clave);
  if (delCliente.length === 0) return null;

  const ventas = delCliente
    .filter((s) => getSaldo(s) > 0)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));

  const conDeuda = ventas.length > 0 ? ventas : delCliente;
  const masVieja = conDeuda[0];
  const primeraVenta = delCliente.find((s) => s.id === masVieja.id) || masVieja;

  return {
    clave,
    clienteNombre: nombreClienteDeVenta(primeraVenta),
    clienteId: primeraVenta.clienteId?.trim() || undefined,
    ventas,
    totalFacturado: round2(conDeuda.reduce((acc, s) => acc + (Number(s.montoTotal) || 0), 0)),
    totalCobrado: round2(conDeuda.reduce((acc, s) => acc + getTotalCobrado(s), 0)),
    saldo: round2(conDeuda.reduce((acc, s) => acc + getSaldo(s), 0)),
    antiguedadDias: ventas.length > 0 ? diasDesde(ventas[0].fecha) : 0,
    sinIdentificar: !primeraVenta.clienteId?.trim(),
  };
}

export interface PagoConContexto {
  pago: SalePayment;
  venta: Sale;
}

/** Pagos recibidos del cliente, del más reciente al más viejo. */
export function getPagosDelCliente(sales: Sale[], clave: string): PagoConContexto[] {
  const out: PagoConContexto[] = [];
  sales
    .filter((s) => claveCliente(s) === clave)
    .forEach((s) => getPagos(s).forEach((pago) => out.push({ pago, venta: s })));
  return out.sort((a, b) => (a.pago.fecha < b.pago.fecha ? 1 : a.pago.fecha > b.pago.fecha ? -1 : 0));
}
