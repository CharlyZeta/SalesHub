import { describe, it, expect, vi } from 'vitest';
import { formatCurrency, formatDate, parseDateToISO, getCurrentMonthISO, getMonthYearLabel, exportSalesToCSV, validateRequiredSaleFields } from '../utils/formatters';
import { Sale } from '../types';

describe('Formatters Utilities', () => {
  describe('validateRequiredSaleFields', () => {
    it('returns isValid: true when all 5 required fields (fecha, ncli, producto, precio, met. pago) are present', () => {
      const validSale: Partial<Sale> = {
        fecha: '2026-07-27',
        clienteId: 'CLI-500',
        productos: [{ id: 'p1', nombre: 'Cocina Industrial', cantidad: 1, precioUnitario: 500000, subtotal: 500000 }],
        montoTotal: 500000,
        metodoPago: 'Efectivo'
      };

      const result = validateRequiredSaleFields(validSale);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('returns isValid: false and lists missing fields when required fields are missing or invalid', () => {
      const incompleteSale: Partial<Sale> = {
        fecha: '',
        clienteId: '',
        productos: [],
        montoTotal: 0,
        metodoPago: ''
      };

      const result = validateRequiredSaleFields(incompleteSale);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['Fecha', 'NCLI', 'Producto', 'Precio', 'Met. Pago']);
    });
  });

  describe('formatCurrency', () => {
    it('formats numbers to Argentine Peso currency format', () => {
      const result = formatCurrency(1250000, true);
      expect(result).toContain('1.250.000');
    });

    it('handles 0 and NaN gracefully', () => {
      expect(formatCurrency(0)).toContain('0');
      expect(formatCurrency(NaN)).toBe('$ 0');
    });

    it('formats without decimals when showDecimals is false', () => {
      const result = formatCurrency(500, false);
      expect(result).not.toContain(',00');
    });
  });

  describe('formatDate', () => {
    it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(formatDate('2026-07-27')).toBe('27/07/2026');
    });

    it('returns original input or fallback for invalid inputs', () => {
      expect(formatDate('')).toBe('-');
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('parseDateToISO', () => {
    it('keeps YYYY-MM-DD intact', () => {
      expect(parseDateToISO('2026-12-15')).toBe('2026-12-15');
    });

    it('parses DD/MM/YYYY to YYYY-MM-DD', () => {
      expect(parseDateToISO('25/08/2026')).toBe('2026-08-25');
      expect(parseDateToISO('5/3/2026')).toBe('2026-03-05');
    });

    it('parses DD-MM-YYYY to YYYY-MM-DD', () => {
      expect(parseDateToISO('10-11-2026')).toBe('2026-11-10');
    });

    it('returns today ISO for empty input', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(parseDateToISO('')).toBe(today);
    });
  });

  describe('getCurrentMonthISO', () => {
    it('returns current year and month in YYYY-MM format', () => {
      const result = getCurrentMonthISO();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('getMonthYearLabel', () => {
    it('returns Spanish human readable month label for explicit month and default month', () => {
      expect(getMonthYearLabel('2026-07')).toBe('Julio 2026');
      expect(getMonthYearLabel('2026-12')).toBe('Diciembre 2026');
      expect(getMonthYearLabel()).toMatch(/\d{4}/);
    });
  });

  describe('exportSalesToCSV', () => {
    it('executes exportSalesToCSV with document mocked', () => {
      const mockSales: Sale[] = [
        {
          id: 'V-100',
          fecha: '2026-07-27',
          clienteId: 'CLI-1',
          clienteNombre: 'Juan',
          clienteApellido: 'Pérez',
          productos: [{ id: 'p1', nombre: 'Heladera', cantidad: 1, precioUnitario: 100, subtotal: 100 }],
          montoTotal: 100,
          numeroFactura: 'FC-1',
          metodoPago: 'Efectivo',
          canal: 'Local',
          metodoEnvio: 'Retiro',
          numeroSeguimiento: 'TRK-1',
          estadoEnvio: 'Entregado',
          notas: 'Test note',
          creadoEn: '2026-07-27T10:00:00Z'
        }
      ];

      const clickSpy = vi.fn();
      const mockElement = { setAttribute: vi.fn(), click: clickSpy };

      // Set global document mock
      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue(mockElement),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        }
      };

      exportSalesToCSV(mockSales, 'test.csv');
      expect(clickSpy).toHaveBeenCalled();

      delete (globalThis as any).document;
    });
  });
});
