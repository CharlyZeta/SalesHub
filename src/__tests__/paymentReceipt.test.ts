import { describe, it, expect } from 'vitest';
import { Sale, SalePayment } from '../types';
import { ESTADO_PAGO_LABEL, getEstadoPago } from '../utils/salePayments';
import { SIN_DATO, armarReciboPago, numeroRecibo } from '../utils/paymentReceipt';

function pago(monto: number, id: string, fecha = '2026-09-10'): SalePayment {
  return { id, fecha, monto, medio: 'Efectivo', registradoEn: `${fecha}T10:00:00.000Z` };
}

function venta(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 'V-001',
    fecha: '2026-09-01',
    clienteId: 'CLI-1001',
    clienteNombre: 'Juan',
    clienteApellido: 'Pérez',
    clienteDniCuit: '20123456789',
    clienteTelefono: '11 5555-1234',
    clienteDireccion: 'Av. Siempre Viva 742',
    clienteLocalidad: 'Quilmes',
    clienteProvincia: 'Buenos Aires',
    productos: [
      { id: 'P1', nombre: 'Teclado', cantidad: 2, precioUnitario: 25000, subtotal: 50000 },
      { id: 'P2', nombre: 'Mouse', cantidad: 1, precioUnitario: 50000, subtotal: 50000 },
    ],
    montoTotal: 100000,
    numeroFactura: 'FC-B-0001-00000042',
    metodoPago: 'Efectivo',
    canal: 'Local',
    metodoEnvio: 'Retiro en Local',
    estadoEnvio: 'No Requiere',
    creadoEn: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('FEAT-PAY-004 · paymentReceipt', () => {
  it('MF-1 flujo de emisión: arma el recibo de la venta con cliente, productos y totales', () => {
    const r = armarReciboPago(venta({ pagos: [] }), undefined, '2026-11-05');
    expect(r.numero).toBe('REC-V-001');
    expect(r.tipo).toBe('venta');
    expect(r.fechaEmision).toBe('2026-11-05');
    expect(r.cliente.nombre).toBe('Juan Pérez');
    expect(r.cliente.documento).toBe('20123456789');
    expect(r.productos).toHaveLength(2);
    expect(r.productos[0].nombre).toBe('Teclado');
    expect(r.total).toBe(100000);
    expect(r.comprobante).toBe('FC-B-0001-00000042');
  });

  it('AF-01 venta histórica sin campo pagos: se emite como pagada con leyenda', () => {
    const r = armarReciboPago(venta(), undefined, '2026-11-05');
    expect(r.ventaHistorica).toBe(true);
    expect(r.condicion.label).toBe('Pagado');
    expect(r.pagado).toBe(100000);
    expect(r.saldo).toBe(0);
  });

  it('AF-02 venta sin pagos: pendiente, pagado 0 y saldo igual al total', () => {
    const r = armarReciboPago(venta({ pagos: [] }), undefined, '2026-11-05');
    expect(r.condicion.label).toBe('Pendiente de pago');
    expect(r.pagado).toBe(0);
    expect(r.saldo).toBe(100000);
  });

  it('AF-04 emisión en sólo lectura: se puede armar sin permisos de escritura ni efectos', () => {
    const v = venta({ pagos: [pago(40000, 'PG-0001')] });
    const antes = JSON.stringify(v);
    const r = armarReciboPago(v, 'PG-0001', '2026-11-05');
    expect(r.tipo).toBe('pago');
    expect(JSON.stringify(v)).toBe(antes);
  });

  it('BR-001 no muta la venta ni el libro de pagos', () => {
    const v = venta({ pagos: [pago(40000, 'PG-0001'), pago(20000, 'PG-0002')] });
    const antes = JSON.parse(JSON.stringify(v));
    armarReciboPago(v, 'PG-0002', '2026-11-05');
    armarReciboPago(v, undefined, '2026-11-05');
    expect(v).toEqual(antes);
  });

  it('BR-002 pagado y saldo: suma de pagos, redondeo a 2 decimales y nunca negativo', () => {
    const v = venta({
      montoTotal: 100,
      pagos: [pago(33.33, 'PG-0001'), pago(33.33, 'PG-0002'), pago(33.33, 'PG-0003')],
    });
    const r = armarReciboPago(v, undefined, '2026-11-05');
    expect(r.pagado).toBe(99.99);
    expect(r.saldo).toBe(0.01);

    const sobrecobrada = armarReciboPago(venta({ montoTotal: 100, pagos: [pago(150, 'PG-0001')] }));
    expect(sobrecobrada.saldo).toBe(0);
  });

  it('BR-003 condición de pago: coincide con getEstadoPago en los tres estados', () => {
    const casos: Array<[Sale, string]> = [
      [venta({ pagos: [] }), ESTADO_PAGO_LABEL.pendiente],
      [venta({ pagos: [pago(40000, 'PG-0001')] }), ESTADO_PAGO_LABEL.parcial],
      [venta({ pagos: [pago(100000, 'PG-0001')] }), ESTADO_PAGO_LABEL.pagado],
    ];
    casos.forEach(([v, esperado]) => {
      const r = armarReciboPago(v, undefined, '2026-11-05');
      expect(r.condicion.label).toBe(esperado);
      expect(r.condicion.estado).toBe(getEstadoPago(v));
    });
  });

  it('BR-004 parcialidad: indica el importe de ese pago y su posición en el libro', () => {
    const v = venta({
      pagos: [pago(30000, 'PG-0001'), pago(25000, 'PG-0002'), pago(10000, 'PG-0003')],
    });
    const r = armarReciboPago(v, 'PG-0002', '2026-11-05');
    expect(r.parcialidad).toEqual({
      indice: 2,
      totalPagos: 3,
      importe: 25000,
      medio: 'Efectivo',
      nota: undefined,
      fecha: '2026-09-10',
    });
    expect(r.pagado).toBe(65000);
    expect(r.saldo).toBe(35000);
  });

  it('BR-005 número determinístico: recibo de venta y de pago', () => {
    const v = venta({ pagos: [pago(40000, 'PG-0001')] });
    expect(numeroRecibo(v)).toBe('REC-V-001');
    expect(numeroRecibo(v, v.pagos![0])).toBe('REC-V-001-PG-0001');
    expect(armarReciboPago(v, 'PG-0001').numero).toBe(armarReciboPago(v, 'PG-0001').numero);
  });

  it('BR-006 datos faltantes: usa el marcador explícito y no bloquea la emisión', () => {
    const r = armarReciboPago(
      venta({
        pagos: [],
        clienteDniCuit: '',
        clienteTelefono: '   ',
        clienteDireccion: undefined,
        clienteLocalidad: undefined,
        clienteProvincia: undefined,
        productos: [],
      }),
      undefined,
      '2026-11-05'
    );
    expect(r.cliente.documento).toBe(SIN_DATO);
    expect(r.cliente.telefono).toBe(SIN_DATO);
    expect(r.cliente.direccion).toBe(SIN_DATO);
    expect(r.cliente.localidadProvincia).toBe(SIN_DATO);
    expect(r.productos).toHaveLength(0);
    expect(r.numero).toBe('REC-V-001');
  });

  it('BR-007 sin datos sensibles: el recibo no arrastra hashes, tokens ni credenciales', () => {
    const v = venta({ pagos: [pago(40000, 'PG-0001')] });
    const serializado = JSON.stringify(armarReciboPago(v, 'PG-0001', '2026-11-05')).toLowerCase();
    ['passwordhash', 'pinhash', 'token', 'secret', 'credential'].forEach((prohibido) => {
      expect(serializado).not.toContain(prohibido);
    });
  });

  it('AC-001 recibo de un pago parcial: condición, importe propio, pagado y saldo', () => {
    const r = armarReciboPago(venta({ pagos: [pago(40000, 'PG-0001')] }), 'PG-0001', '2026-11-05');
    expect(r.condicion.label).toBe('Pago parcial');
    expect(r.parcialidad?.importe).toBe(40000);
    expect(r.pagado).toBe(40000);
    expect(r.saldo).toBe(60000);
  });

  it('AC-002 venta pagada: condición Pagado y saldo cero', () => {
    const r = armarReciboPago(venta({ pagos: [pago(100000, 'PG-0001')] }), undefined, '2026-11-05');
    expect(r.condicion.label).toBe('Pagado');
    expect(r.saldo).toBe(0);
  });

  it('AC-003 venta sin pagos: pendiente con saldo igual al total', () => {
    const r = armarReciboPago(venta({ pagos: [] }), undefined, '2026-11-05');
    expect(r.condicion.label).toBe('Pendiente de pago');
    expect(r.pagado).toBe(0);
    expect(r.saldo).toBe(100000);
  });

  it('AC-004 venta histórica: figura como pagada con la marca de venta anterior al módulo', () => {
    const r = armarReciboPago(venta(), 'PG-inexistente', '2026-11-05');
    expect(r.ventaHistorica).toBe(true);
    expect(r.condicion.label).toBe('Pagado');
    expect(r.pagado).toBe(100000);
    expect(r.saldo).toBe(0);
    // un pago inexistente cae al recibo de la venta, sin parcialidad
    expect(r.tipo).toBe('venta');
    expect(r.parcialidad).toBeUndefined();
  });

  it('AC-005 pago N de M: el segundo de tres pagos se identifica como 2 de 3', () => {
    const v = venta({
      pagos: [pago(30000, 'PG-0001'), pago(25000, 'PG-0002'), pago(10000, 'PG-0003')],
    });
    const r = armarReciboPago(v, 'PG-0002', '2026-11-05');
    expect(r.parcialidad?.indice).toBe(2);
    expect(r.parcialidad?.totalPagos).toBe(3);
  });

  it('AC-008 determinismo: dos emisiones con los mismos datos son idénticas', () => {
    const v = venta({ pagos: [pago(40000, 'PG-0001')] });
    const a = armarReciboPago(v, 'PG-0001', '2026-11-05');
    const b = armarReciboPago(v, 'PG-0001', '2026-11-05');
    expect(a).toEqual(b);
  });
});
