import { describe, it, expect } from 'vitest';
import { calculateBudgetItemSubtotal, calculateBudgetTotals } from '../hooks/useBudgetCalculation';

describe('useBudgetCalculation & calculateBudgetItemSubtotal', () => {
  it('calcula correctamente el subtotal de un renglón con y sin descuento', () => {
    // 2 unidades a $1000 sin descuento = $2000
    expect(calculateBudgetItemSubtotal(2, 1000, 0)).toBe(2000);

    // 2 unidades a $1000 con 10% descuento = $1800
    expect(calculateBudgetItemSubtotal(2, 1000, 10)).toBe(1800);

    // 5 unidades a $250 con 20% descuento = $1000
    expect(calculateBudgetItemSubtotal(5, 250, 20)).toBe(1000);

    // Valores atípicos
    expect(calculateBudgetItemSubtotal(0, 500, 10)).toBe(0);
  });

  it('calcula totales acumulados de items y percepciones', () => {
    const items = [
      { id: '1', descripcion: 'Producto A', cantidad: 2, precioUnitario: 1000, descuentoPorcentaje: 10, subtotal: 1800 },
      { id: '2', descripcion: 'Producto B', cantidad: 1, precioUnitario: 500, descuentoPorcentaje: 0, subtotal: 500 },
    ];

    const result = calculateBudgetTotals(items, 150);

    expect(result.rawSubtotal).toBe(2500); // 2000 + 500
    expect(result.descuentoTotal).toBe(200); // 200 de descuento en prod A
    expect(result.subtotalNeto).toBe(2300); // 1800 + 500
    expect(result.importeTotalCalculado).toBe(2450); // 2300 + 150
    expect(result.totalEnLetras.toLowerCase()).toContain('dos mil cuatrocientos cincuenta');
  });
});
