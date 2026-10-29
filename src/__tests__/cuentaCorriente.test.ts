import { describe, it, expect } from 'vitest';
import { Sale, SalePayment } from '../types';
import { claveCliente, getClientesConDeuda, getCuentaCorriente, getPagosDelCliente } from '../utils/cuentaCorriente';

function pago(monto: number, id: string, fecha = '2026-09-20'): SalePayment {
  return { id, fecha, monto, medio: 'Efectivo', registradoEn: `${fecha}T10:00:00.000Z` };
}

function venta(overrides: Partial<Sale>): Sale {
  return {
    id: 'V-000',
    fecha: '2026-09-01',
    clienteId: 'CLI-1',
    clienteNombre: 'Ana',
    clienteApellido: 'Gómez',
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

const sales: Sale[] = [
  venta({ id: 'V-1', clienteId: 'CLI-1', montoTotal: 1000, pagos: [pago(400, 'PG-1')] }),
  venta({ id: 'V-2', clienteId: 'CLI-1', fecha: '2026-08-01', montoTotal: 600, pagos: [] }),
  venta({ id: 'V-3', clienteId: 'CLI-1', fecha: '2026-07-01', montoTotal: 500, pagos: [pago(500, 'PG-2')] }),
  // Otra cliente
  venta({ id: 'V-4', clienteId: 'CLI-2', clienteNombre: 'Bruno', clienteApellido: 'Díaz', pagos: [] }),
  // Venta vieja sin clienteId: se agrupa por nombre
  venta({ id: 'V-5', clienteId: '', clienteNombre: 'Carla', clienteApellido: 'Sosa', montoTotal: 300, pagos: [] }),
];

describe('cuentaCorriente — identidad del cliente (BR-PAY-018)', () => {
  it('usa el clienteId cuando existe', () => {
    expect(claveCliente(sales[0])).toBe('ID:CLI-1');
  });

  it('cae al nombre normalizado cuando no hay clienteId', () => {
    expect(claveCliente(sales[4])).toBe('NOMBRE:Carla Sosa');
  });

  it('lista solo clientes con deuda', () => {
    const claves = getClientesConDeuda(sales).map((c) => c.clave);
    expect(claves).toContain('ID:CLI-1');
    expect(claves).toContain('ID:CLI-2');
    expect(claves).toContain('NOMBRE:Carla Sosa');
    expect(claves).toHaveLength(3);
  });
});

describe('cuentaCorriente — totales derivados (BR-PAY-016)', () => {
  it('suma solo las ventas con saldo', () => {
    const cc = getCuentaCorriente(sales, 'ID:CLI-1')!;
    // V-1: 1000 con 400 cobrados (600 de saldo) · V-2: 600 sin cobros · V-3: pagada completa
    expect(cc.ventas.map((s) => s.id)).toEqual(['V-2', 'V-1']);
    expect(cc.totalFacturado).toBe(1600);
    expect(cc.totalCobrado).toBe(400);
    expect(cc.saldo).toBe(1200);
  });

  it('calcula la antigüedad desde la venta más vieja con saldo', () => {
    const cc = getCuentaCorriente(sales, 'ID:CLI-1')!;
    expect(cc.ventas[0].fecha).toBe('2026-08-01');
    expect(cc.antiguedadDias).toBeGreaterThanOrEqual(0);
  });

  it('marca sin identificar la venta agrupada por nombre', () => {
    const cc = getCuentaCorriente(sales, 'NOMBRE:Carla Sosa')!;
    expect(cc.sinIdentificar).toBe(true);
    expect(cc.saldo).toBe(300);
  });

  it('devuelve null para una clave inexistente', () => {
    expect(getCuentaCorriente(sales, 'ID:NO-EXISTE')).toBeNull();
  });
});

describe('cuentaCorriente — pagos recibidos', () => {
  it('devuelve los pagos del cliente del más nuevo al más viejo', () => {
    const pagos = getPagosDelCliente(sales, 'ID:CLI-1');
    expect(pagos).toHaveLength(2);
    expect(pagos.map((p) => p.pago.id)).toEqual(['PG-1', 'PG-2']);
  });
});
