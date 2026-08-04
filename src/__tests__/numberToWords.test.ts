import { describe, it, expect } from 'vitest';
import { numberToWordsSpanish } from '../utils/numberToWords';

describe('numberToWordsSpanish Utility', () => {
  it('converts zero to Spanish currency representation', () => {
    expect(numberToWordsSpanish(0)).toBe('cero con 00/100.-');
  });

  it('converts simple numbers (units, tens, hundreds)', () => {
    expect(numberToWordsSpanish(5)).toBe('cinco con 00/100.-');
    expect(numberToWordsSpanish(15)).toBe('quince con 00/100.-');
    expect(numberToWordsSpanish(25)).toBe('veinticinco con 00/100.-');
    expect(numberToWordsSpanish(42)).toBe('cuarenta y dos con 00/100.-');
    expect(numberToWordsSpanish(100)).toBe('cien con 00/100.-');
    expect(numberToWordsSpanish(150)).toBe('ciento cincuenta con 00/100.-');
    expect(numberToWordsSpanish(900)).toBe('novecientos con 00/100.-');
    expect(numberToWordsSpanish(950)).toBe('novecientos cincuenta con 00/100.-');
  });

  it('converts thousands and tens of thousands', () => {
    expect(numberToWordsSpanish(1000)).toBe('mil con 00/100.-');
    expect(numberToWordsSpanish(2500)).toBe('dos mil quinientos con 00/100.-');
    expect(numberToWordsSpanish(15000)).toBe('quince mil con 00/100.-');
  });

  it('converts millions and complex amounts with decimals', () => {
    expect(numberToWordsSpanish(1000000)).toBe('un millón con 00/100.-');
    expect(numberToWordsSpanish(2450800.50)).toBe('dos millones cuatrocientos cincuenta mil ochocientos con 50/100.-');
  });

  it('handles negative or NaN inputs', () => {
    expect(numberToWordsSpanish(NaN)).toBe('cero con 00/100.-');
    expect(numberToWordsSpanish(-500)).toBe('quinientos con 00/100.-');
  });
});
