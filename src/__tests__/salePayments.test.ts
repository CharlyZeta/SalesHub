import { describe, it, expect } from 'vitest';
import { Sale, SalePayment } from '../types';
import {
  agregarPago,
  crearPago,
  esVentaHistorica,
  getEstadoPago,
  getSaldo,
  getTotalCobrado,
  quitarPago,
  round2,
  validarPago,
} from '../utils/salePayments';

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 'V-001',
    fecha: '2026-10-01',
    clienteId: 'CLI-1001',
    clienteNombre: 'Juan Pérez',
    productos: [],
    montoTotal: 100000,
    numeroFactura: 'FC-B-0001-00000001',
    metodoPago: 'Efectivo',
    canal: 'Local',
    metodoEnvio: 'Retiro en Local',
    estadoEnvio: 'No Requiere',
    creadoEn: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

function makePago(monto: number, id = 'PG-0001'): SalePayment {
  return {
    id,
    fecha: '2026-10-02',
    monto,
    medio: 'Efectivo',
    registradoEn: '2026-10-02T10:00:00.000Z',
  };
}

describe('salePayments — retrocompatibilidad (BR-PAY-001)', () => {
  it('trata una venta sin campo pagos como histórica y pagada', () => {
    const sale = makeSale();
    expect(esVentaHistorica(sale)).toBe(true);
    expect(getEstadoPago(sale)).toBe('pagado');
    expect(getSaldo(sale)).toBe(0);
    expect(getTotalCobrado(sale)).toBe(100000);
  });

  it('trata una venta nueva con libro vacío como pendiente', () => {
    const sale = makeSale({ pagos: [] });
    expect(esVentaHistorica(sale)).toBe(false);
    expect(getEstadoPago(sale)).toBe('pendiente');
    expect(getSaldo(sale)).toBe(100000);
    expect(getTotalCobrado(sale)).toBe(0);
  });
});

describe('salePayments — estado derivado (BR-PAY-003, BR-PAY-004)', () => {
  it('con un pago parcial el estado es parcial y el saldo se reduce', () => {
    const sale = makeSale({ pagos: [makePago(40000)] });
    expect(getEstadoPago(sale)).toBe('parcial');
    expect(getSaldo(sale)).toBe(60000);
    expect(getTotalCobrado(sale)).toBe(40000);
  });

  it('al cubrir el total el estado pasa a pagado y el saldo a cero', () => {
    const sale = makeSale({ pagos: [makePago(40000, 'PG-0001'), makePago(60000, 'PG-0002')] });
    expect(getEstadoPago(sale)).toBe('pagado');
    expect(getSaldo(sale)).toBe(0);
    expect(getTotalCobrado(sale)).toBe(100000);
  });

  it('nunca devuelve saldo negativo aunque se cobre de más', () => {
    const sale = makeSale({ pagos: [makePago(150000)] });
    expect(getSaldo(sale)).toBe(0);
    expect(getEstadoPago(sale)).toBe('pagado');
  });

  it('mantiene precisión con centavos (sin deriva de coma flotante)', () => {
    const sale = makeSale({
      montoTotal: 100,
      pagos: [makePago(33.33, 'PG-0001'), makePago(33.33, 'PG-0002'), makePago(33.33, 'PG-0003')],
    });
    expect(getTotalCobrado(sale)).toBe(99.99);
    expect(getSaldo(sale)).toBe(0.01);
    expect(getEstadoPago(sale)).toBe('parcial');
  });
});

describe('salePayments — validación de pagos (BR-PAY-002)', () => {
  it('rechaza montos en cero o negativos', () => {
    expect(validarPago(0, 1000).ok).toBe(false);
    expect(validarPago(-50, 1000).ok).toBe(false);
  });

  it('rechaza un monto mayor al saldo', () => {
    const res = validarPago(70000, 60000);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('supera el saldo');
  });

  it('acepta el monto exacto del saldo', () => {
    expect(validarPago(60000, 60000).ok).toBe(true);
  });

  it('rechaza valores no numéricos', () => {
    expect(validarPago(Number.NaN, 1000).ok).toBe(false);
    expect(validarPago(Number.POSITIVE_INFINITY, 1000).ok).toBe(false);
  });
});

describe('salePayments — operaciones sobre el libro', () => {
  it('agregarPago no muta la venta original', () => {
    const sale = makeSale({ pagos: [] });
    const nueva = agregarPago(sale, makePago(10000));
    expect(sale.pagos).toHaveLength(0);
    expect(nueva.pagos).toHaveLength(1);
  });

  it('quitarPago recalcula el saldo y el estado', () => {
    const sale = makeSale({ pagos: [makePago(40000, 'PG-0001'), makePago(60000, 'PG-0002')] });
    expect(getEstadoPago(sale)).toBe('pagado');

    const sinUno = quitarPago(sale, 'PG-0002');
    expect(getEstadoPago(sinUno)).toBe('parcial');
    expect(getSaldo(sinUno)).toBe(60000);
  });

  it('crearPago genera IDs correlativos y redondea el monto', () => {
    const p1 = crearPago({ monto: 10.005, medio: 'Efectivo' }, []);
    expect(p1.id).toBe('PG-0001');
    expect(p1.monto).toBe(10.01);

    const p2 = crearPago({ monto: 500, medio: 'Transferencia' }, [p1]);
    expect(p2.id).toBe('PG-0002');
  });

  it('round2 redondea a dos decimales', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});
