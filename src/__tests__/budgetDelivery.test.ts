import { describe, it, expect, vi } from 'vitest';
import { 
  formatWhatsAppPhone, 
  generateBudgetWhatsAppText, 
  generateBudgetEmailSubject, 
  generateBudgetEmailBody,
  openWhatsAppForBudget,
  openEmailForBudget
} from '../utils/budgetDelivery';
import { Budget } from '../types';

describe('Budget Delivery Utility (WhatsApp & Email)', () => {
  const sampleBudget: Budget = {
    id: 'PRE-100',
    numeroPresupuesto: 'P0001-00000312',
    puntoVenta: '0001',
    comprobanteNumero: '00000312',
    fechaEmision: '2026-07-27',
    esClienteAgendado: true,
    razonSocialNombre: 'Pizzería Don Juan',
    apellido: '',
    dniCuit: '30-71122334-9',
    domicilio: 'San Martín 2500',
    telefono: '0342-154883135',
    email: 'contacto@donjuan.com',
    codigoPostal: '3000',
    condicionFiscal: 'RESPONSABLE INSCRIPTO',
    condicionVenta: 'CONTADO',
    items: [
      { id: 'i1', descripcion: 'Horno Pizzero 12 Moldes', cantidad: 1, precioUnitario: 450000, descuentoPorcentaje: 0, subtotal: 450000 },
      { id: 'i2', descripcion: 'Bandejas Inoxidables', cantidad: 5, precioUnitario: 12000, descuentoPorcentaje: 10, subtotal: 54000 }
    ],
    subtotal: 510000,
    descuentoTotal: 6000,
    percepciones: 0,
    importeTotal: 504000,
    observaciones: 'Validez 10 días',
    estado: 'Pendiente',
    creadoEn: '2026-07-27T10:00:00Z'
  };

  it('formats Argentine phone numbers into WhatsApp wa.me international format', () => {
    expect(formatWhatsAppPhone('0342-154883135')).toBe('5493424883135');
    expect(formatWhatsAppPhone('3424883135')).toBe('5493424883135');
    expect(formatWhatsAppPhone('+54 9 342 4883135')).toBe('5493424883135');
    expect(formatWhatsAppPhone('543424883135')).toBe('5493424883135');
    expect(formatWhatsAppPhone('')).toBe('');
  });

  it('generates a formatted WhatsApp message containing budget items and totals', () => {
    const text = generateBudgetWhatsAppText(sampleBudget);
    expect(text).toContain('P0001-00000312');
    expect(text).toContain('Pizzería Don Juan');
    expect(text).toContain('Horno Pizzero 12 Moldes');
    expect(text).toContain('504.000');
    expect(text).toContain('Validez 10 días');
  });

  it('generates email subject and structured body text', () => {
    const subject = generateBudgetEmailSubject(sampleBudget);
    const body = generateBudgetEmailBody(sampleBudget);

    expect(subject).toBe('Presupuesto N° P0001-00000312 - DUAL S.R.L.');
    expect(body).toContain('Estimado/a Pizzería Don Juan');
    expect(body).toContain('Horno Pizzero 12 Moldes');
    expect(body).toContain('30-71122334-9');
    expect(body).toContain('dualdesantafe@hotmail.com');
  });

  it('opens WhatsApp URL via window.open', () => {
    (globalThis as any).window = {
      open: vi.fn(),
      location: { href: '' }
    };

    const res = openWhatsAppForBudget(sampleBudget, '3424883135');

    expect(res.success).toBe(true);
    expect(res.cleanPhone).toBe('5493424883135');
    expect((globalThis as any).window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/5493424883135?text='),
      '_blank'
    );

    delete (globalThis as any).window;
  });

  it('triggers mailto link for email delivery', () => {
    const res = openEmailForBudget(sampleBudget, 'cliente@test.com');
    expect(res.success).toBe(true);
    expect(res.recipientEmail).toBe('cliente@test.com');
    expect(res.mailtoUrl).toContain('mailto:cliente@test.com?subject=');
  });
});
