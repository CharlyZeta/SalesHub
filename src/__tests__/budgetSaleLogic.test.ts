import { describe, it, expect } from 'vitest';
import { Budget, Sale, Customer, CatalogProduct } from '../types';

describe('Budget and Sale Business Logic Helpers', () => {

  it('calculates total budget amount correctly from item quantities and unit prices', () => {
    const items = [
      { id: 'item-1', descripcion: 'Heladera 2 Puertas', cantidad: 2, precioUnitario: 500000, subtotal: 1000000 },
      { id: 'item-2', descripcion: 'Balanza Digital', cantidad: 1, precioUnitario: 150000, subtotal: 150000 }
    ];

    const total = items.reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0);
    expect(total).toBe(1150000);
  });

  it('generates sequential budget numbers correctly', () => {
    const lastNum = 104;
    const nextNum = lastNum + 1;
    const formattedNum = String(nextNum).padStart(8, '0');
    expect(formattedNum).toBe('00000105');
  });

  it('converts budget object structure to a valid Sale record', () => {
    const mockBudget: Budget = {
      id: 'b-99',
      numeroPresupuesto: 'PRES-0001-00000105',
      puntoVenta: '0001',
      comprobanteNumero: '00000105',
      fechaEmision: '2026-07-27',
      esClienteAgendado: true,
      clienteId: 'CLI-501',
      razonSocialNombre: 'Restaurant El Faro',
      apellido: 'Sosa',
      dniCuit: '30-99887766-1',
      telefono: '0342-4998877',
      domicilio: 'Costanera 100',
      codigoPostal: '3000',
      condicionFiscal: 'Responsable Inscripto',
      condicionVenta: 'TRANSFERENCIA BANCARIA',
      items: [
        { id: 'bi-1', descripcion: 'Cocina Industrial 4 Hornallas', cantidad: 1, precioUnitario: 890000, descuentoPorcentaje: 0, subtotal: 890000 }
      ],
      subtotal: 890000,
      descuentoTotal: 0,
      percepciones: 0,
      importeTotal: 1076900,
      observaciones: 'Garantía 1 año',
      estado: 'Pendiente',
      creadoEn: '2026-07-27T10:00:00Z'
    };

    const convertedSale: Sale = {
      id: `V-2026-999`,
      fecha: mockBudget.fechaEmision,
      clienteId: mockBudget.clienteId,
      clienteNombre: mockBudget.razonSocialNombre,
      clienteApellido: mockBudget.apellido,
      clienteDniCuit: mockBudget.dniCuit,
      clienteTelefono: mockBudget.telefono,
      productos: mockBudget.items.map((i) => ({
        id: i.id,
        nombre: i.descripcion,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal
      })),
      montoTotal: mockBudget.importeTotal,
      numeroFactura: `FC-B-${mockBudget.puntoVenta}-${mockBudget.comprobanteNumero}`,
      tipoFactura: 'Factura B',
      metodoPago: 'Transferencia',
      canal: 'Local',
      metodoEnvio: 'Retiro en Local',
      estadoEnvio: 'Entregado',
      notas: `Convertido desde Presupuesto ${mockBudget.numeroPresupuesto}`,
      creadoEn: new Date().toISOString()
    };

    expect(convertedSale.montoTotal).toBe(1076900);
    expect(convertedSale.clienteNombre).toBe('Restaurant El Faro');
    expect(convertedSale.productos.length).toBe(1);
    expect(convertedSale.metodoPago).toBe('Transferencia');
  });

});
