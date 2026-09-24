import { useMemo } from 'react';
import { BudgetItem } from '../types';
import { numberToWordsSpanish } from '../utils/numberToWords';

export interface BudgetCalculationResult {
  rawSubtotal: number;
  descuentoTotal: number;
  subtotalNeto: number;
  importeTotalCalculado: number;
  totalEnLetras: string;
}

/**
 * Calcula el subtotal de un renglón aplicando descuento porcentual
 */
export function calculateBudgetItemSubtotal(
  cantidad: number,
  precioUnitario: number,
  descuentoPorcentaje: number = 0
): number {
  const cant = Number(cantidad) || 0;
  const pu = Number(precioUnitario) || 0;
  const desc = Number(descuentoPorcentaje) || 0;
  const base = cant * pu;
  return base - (base * (desc / 100));
}

/**
 * Función pura para calcular todos los totales acumulados de un presupuesto
 */
export function calculateBudgetTotals(items: BudgetItem[], percepciones: number = 0): BudgetCalculationResult {
  const rawSubtotal = items.reduce(
    (acc, item) => acc + (Number(item.cantidad || 0) * Number(item.precioUnitario || 0)),
    0
  );

  const descuentoTotal = items.reduce((acc, item) => {
    const base = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
    return acc + (base * (Number(item.descuentoPorcentaje || 0) / 100));
  }, 0);

  const subtotalNeto = items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
  const importeTotalCalculado = subtotalNeto + Number(percepciones || 0);
  const totalEnLetras = numberToWordsSpanish(importeTotalCalculado);

  return {
    rawSubtotal,
    descuentoTotal,
    subtotalNeto,
    importeTotalCalculado,
    totalEnLetras
  };
}

/**
 * Hook reactivo para cálculo de presupuestos
 */
export function useBudgetCalculation(items: BudgetItem[], percepciones: number = 0): BudgetCalculationResult {
  return useMemo(() => calculateBudgetTotals(items, percepciones), [items, percepciones]);
}
