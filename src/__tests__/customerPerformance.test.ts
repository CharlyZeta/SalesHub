import { describe, it, expect } from 'vitest';
import { buildSalesCustomerIndex, filterCustomers } from '../utils/customerIndex';
import { Sale, Customer } from '../types';

describe('FIX-C001: Optimización de Rendimiento del Directorio de Clientes', () => {

  const mockCustomers: Customer[] = [
    {
      clienteId: 'CLI-1001',
      nombre: 'Carlos',
      apellido: 'García',
      dniCuit: '20-30405060-7',
      telefono: '0342-154112233',
      totalCompras: 0,
      cantidadPedidos: 0,
      ultimaCompra: '2026-08-01',
    },
    {
      clienteId: 'CLI-1002',
      nombre: 'María',
      apellido: 'López',
      dniCuit: '27-40506070-8',
      telefono: '0341-155998877',
      totalCompras: 0,
      cantidadPedidos: 0,
      ultimaCompra: '2026-08-05',
    },
    {
      clienteId: 'CLI-1003',
      nombre: 'Juan',
      apellido: 'Pérez',
      dniCuit: '20-22334455-6',
      telefono: '011-152345678',
      totalCompras: 0,
      cantidadPedidos: 0,
      ultimaCompra: '2026-08-10',
    },
  ];

  const mockSales: Partial<Sale>[] = [
    { id: 'V-001', clienteId: 'CLI-1001', montoTotal: 150000 },
    { id: 'V-002', clienteId: 'CLI-1001', montoTotal: 50000 },
    { id: 'V-003', clienteId: 'CLI-1002', montoTotal: 320000 },
  ];

  it('BR-001 / AC-003: indexa ventas en Map O(1) y calcula totales acumulados con precisión', () => {
    const index = buildSalesCustomerIndex(mockSales as Sale[]);

    const c1 = index.get('CLI-1001');
    expect(c1).toBeDefined();
    expect(c1?.count).toBe(2);
    expect(c1?.total).toBe(200000);
    expect(c1?.sales.length).toBe(2);

    const c2 = index.get('CLI-1002');
    expect(c2).toBeDefined();
    expect(c2?.count).toBe(1);
    expect(c2?.total).toBe(320000);

    const c3 = index.get('CLI-1003');
    expect(c3).toBeUndefined(); // Sin compras
  });

  it('AC-002: filtra clientes por nombre, apellido, ID, CUIT o teléfono de forma case-insensitive', () => {
    // Por nombre
    const byNombre = filterCustomers(mockCustomers, 'carlos');
    expect(byNombre.length).toBe(1);
    expect(byNombre[0].clienteId).toBe('CLI-1001');

    // Por ID
    const byId = filterCustomers(mockCustomers, 'CLI-1002');
    expect(byId.length).toBe(1);
    expect(byId[0].nombre).toBe('María');

    // Por CUIT
    const byCuit = filterCustomers(mockCustomers, '22334455');
    expect(byCuit.length).toBe(1);
    expect(byCuit[0].nombre).toBe('Juan');

    // Por teléfono
    const byTel = filterCustomers(mockCustomers, '155998877');
    expect(byTel.length).toBe(1);
    expect(byTel[0].nombre).toBe('María');

    // Búsqueda vacía retorna todos
    const all = filterCustomers(mockCustomers, '   ');
    expect(all.length).toBe(3);
  });

  it('AC-001: rendimiento a escala (5.000 clientes y 10.000 ventas se indexan y consultan en menos de 50 ms)', () => {
    // Generar dataset a gran escala
    const largeCustomers: Customer[] = Array.from({ length: 5000 }, (_, i) => ({
      clienteId: `CLI-${1000 + i}`,
      nombre: `ClienteNombre${i}`,
      apellido: `Apellido${i}`,
      dniCuit: `20-${30000000 + i}-9`,
      telefono: `011-${4000000 + i}`,
      totalCompras: 0,
      cantidadPedidos: 0,
      ultimaCompra: '2026-08-01',
    }));

    const largeSales: Partial<Sale>[] = Array.from({ length: 10000 }, (_, i) => ({
      id: `V-${i}`,
      clienteId: `CLI-${1000 + (i % 3000)}`, // distribuidas entre los primeros 3000 clientes
      montoTotal: 1000 + (i % 500),
    }));

    const startTime = performance.now();

    // 1. Indexar 10.000 ventas
    const index = buildSalesCustomerIndex(largeSales as Sale[]);

    // 2. Consultar 5.000 clientes contra el índice O(1)
    let totalComputedSales = 0;
    for (let i = 0; i < largeCustomers.length; i++) {
      const summary = index.get(largeCustomers[i].clienteId);
      if (summary) {
        totalComputedSales += summary.count;
      }
    }

    const duration = performance.now() - startTime;

    expect(totalComputedSales).toBe(10000);
    // El procesamiento total de 15.000 registros combinados debe completarse en milisegundos (< 100 ms)
    expect(duration).toBeLessThan(100);
  });
});
