import { describe, it, expect } from 'vitest';
import { Sale, SalePayment } from '../types';
import {
  cumpleFiltroEstadoPago,
  filtrarCobros,
  getResumenCobros,
  getVentasPendientes,
} from '../utils/cobrosPendientes';

function pago(monto: number, id: string): SalePayment {
  return { id, fecha: '2026-09-15', monto, medio: 'Efectivo', registradoEn: '2026-09-15T10:00:00.000Z' };
}

function venta(overrides: Partial<Sale>): Sale {
  return {
    id: 'V-000',
    fecha: '2026-09-01',
    clienteId: 'CLI-1',
    clienteNombre: 'Cliente',
    productos: [],
    montoTotal: 1000,
    numeroFactura: 'FC-1',
    metodoPago: 'Efectivo',
    canal: 'Local',
    metodoEnvio: 'Retiro en Local',
    estadoEnvio: 'No Requiere',
    creadoEn: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

const ventas: Sale[] = [
  // Pendiente de septiembre
  venta({ id: 'V-1', fecha: '2026-09-10', clienteId: 'CLI-1', montoTotal: 1000, pagos: [] }),
  // Parcial de julio
  venta({ id: 'V-2', fecha: '2026-07-05', clienteId: 'CLI-2', montoTotal: 500, pagos: [pago(200, 'PG-1')] }),
  // Pagada de agosto (no debe aparecer)
  venta({ id: 'V-3', fecha: '2026-08-20', clienteId: 'CLI-1', montoTotal: 300, pagos: [pago(300, 'PG-2')] }),
  // Histórica sin campo pagos (pagada, no aparece)
  venta({ id: 'V-4', fecha: '2026-06-01', clienteId: 'CLI-3', montoTotal: 900 }),
];

describe('cobrosPendientes — barrido cross-mes (BR-PAY-009, BR-PAY-010)', () => {
  it('incluye pendientes de todos los meses, sin filtrar por mes actual', () => {
    const pendientes = getVentasPendientes(ventas);
    expect(pendientes.map((s) => s.id)).toEqual(['V-2', 'V-1']);
  });

  it('excluye ventas pagadas y ventas históricas', () => {
    const ids = getVentasPendientes(ventas).map((s) => s.id);
    expect(ids).not.toContain('V-3');
    expect(ids).not.toContain('V-4');
  });

  it('ordena de la más vieja a la más nueva', () => {
    const fechas = getVentasPendientes(ventas).map((s) => s.fecha);
    expect(fechas).toEqual([...fechas].sort());
  });
});

describe('cobrosPendientes — resumen (BR-PAY-011)', () => {
  it('suma facturado, cobrado y adeudado del conjunto pendiente', () => {
    const r = getResumenCobros(ventas);
    expect(r.cantidad).toBe(2);
    expect(r.totalFacturado).toBe(1500);
    expect(r.totalCobrado).toBe(200);
    expect(r.totalAdeudado).toBe(1300);
    expect(r.clientesConDeuda).toBe(2);
  });
});

describe('cobrosPendientes — filtros', () => {
  it('busca por cliente y por comprobante', () => {
    expect(filtrarCobros(ventas, 'CLI-2').map((s) => s.id)).toEqual(['V-2']);
    expect(filtrarCobros(ventas, 'FC-1').length).toBe(2);
  });

  it('aplica rango de fechas opcional', () => {
    expect(filtrarCobros(ventas, '', '2026-08-01').map((s) => s.id)).toEqual(['V-1']);
    expect(filtrarCobros(ventas, '', undefined, '2026-08-01').map((s) => s.id)).toEqual(['V-2']);
  });

  it('sin filtros devuelve todos los pendientes', () => {
    expect(filtrarCobros(ventas, '').length).toBe(2);
  });
});

describe('cumpleFiltroEstadoPago — filtro de la planilla (AC-001)', () => {
  it('acepta todo con TODOS o vacío', () => {
    expect(cumpleFiltroEstadoPago(ventas[0], 'TODOS')).toBe(true);
    expect(cumpleFiltroEstadoPago(ventas[0], '')).toBe(true);
  });

  it('distingue pendiente, parcial y pagado', () => {
    expect(cumpleFiltroEstadoPago(ventas[0], 'pendiente')).toBe(true);
    expect(cumpleFiltroEstadoPago(ventas[0], 'parcial')).toBe(false);
    expect(cumpleFiltroEstadoPago(ventas[1], 'parcial')).toBe(true);
    expect(cumpleFiltroEstadoPago(ventas[2], 'pagado')).toBe(true);
  });
});
