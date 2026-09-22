import { describe, it, expect } from 'vitest';
import { normalizePersonName, ARGENTINE_PROVINCES, DEFAULT_PROVINCE } from '../utils/formatters';
import { transformWooCustomer } from '../utils/wooCommerceApi';

describe('Normalización de Nombres de Clientes (FEAT-CUST-002)', () => {
  it('convierte nombres y apellidos de mayúsculas completas a Title Case', () => {
    expect(normalizePersonName('JUAN CARLOS PÉREZ')).toBe('Juan Carlos Pérez');
    expect(normalizePersonName('GONZALEZ')).toBe('Gonzalez');
  });

  it('convierte nombres en minúsculas y limpia espacios redundantes', () => {
    expect(normalizePersonName('   maría   de   los ángeles  ')).toBe('María De Los Ángeles');
    expect(normalizePersonName('roberto  carlos')).toBe('Roberto Carlos');
  });

  it('soporta nombres o apellidos compuestos con guión', () => {
    expect(normalizePersonName('gómez-tagle')).toBe('Gómez-Tagle');
    expect(normalizePersonName('MARÍA-JOSÉ')).toBe('María-José');
  });

  it('devuelve cadena vacía de forma segura ante valores inválidos o vacíos', () => {
    expect(normalizePersonName('')).toBe('');
    expect(normalizePersonName('   ')).toBe('');
    expect(normalizePersonName(null as any)).toBe('');
    expect(normalizePersonName(undefined as any)).toBe('');
  });
});

describe('Catálogo de Provincias Argentinas y Default (FEAT-CUST-002)', () => {
  it('incluye las 24 jurisdicciones oficiales de la República Argentina', () => {
    expect(ARGENTINE_PROVINCES.length).toBe(24);
    expect(ARGENTINE_PROVINCES).toContain('Santa Fe');
    expect(ARGENTINE_PROVINCES).toContain('Buenos Aires');
    expect(ARGENTINE_PROVINCES).toContain('Córdoba');
    expect(ARGENTINE_PROVINCES).toContain('Ciudad Autónoma de Buenos Aires');
    expect(ARGENTINE_PROVINCES).toContain('Tierra del Fuego');
  });

  it('establece Santa Fe como provincia por defecto', () => {
    expect(DEFAULT_PROVINCE).toBe('Santa Fe');
  });
});

describe('Extracción de DNI, CP y Normalización en WooCommerce API (FEAT-CUST-002)', () => {
  it('extrae DNI desde meta_data con prefijo billing_dni y normaliza nombre/apellido', () => {
    const rawWooItem: any = {
      id: 450,
      first_name: 'CARLOS',
      last_name: 'RODRÍGUEZ',
      email: 'carlos@tienda.com',
      billing: {
        first_name: 'CARLOS',
        last_name: 'RODRÍGUEZ',
        address_1: 'San Martín 1234',
        city: 'Santa Fe',
        state: 'Santa Fe',
        postcode: '3000',
        phone: '3424112233'
      },
      meta_data: [
        { key: 'billing_dni', value: '32123456' }
      ]
    };

    const customer = transformWooCustomer(rawWooItem);
    expect(customer.nombre).toBe('Carlos');
    expect(customer.apellido).toBe('Rodríguez');
    expect(customer.dniCuit).toBe('32123456');
    expect(customer.codigoPostal).toBe('3000');
    expect(customer.localidad).toBe('Santa Fe');
  });

  it('extrae CUIT desde meta_data con clave _billing_cuit', () => {
    const rawWooItem: any = {
      id: 451,
      billing: {
        first_name: 'ana maría',
        last_name: 'lópez',
        postcode: 'S3000',
      },
      meta_data: [
        { key: '_billing_cuit', value: '27-35987654-4' }
      ]
    };

    const customer = transformWooCustomer(rawWooItem);
    expect(customer.nombre).toBe('Ana María');
    expect(customer.apellido).toBe('López');
    expect(customer.dniCuit).toBe('27-35987654-4');
    expect(customer.codigoPostal).toBe('S3000');
  });

  it('extrae DNI desde billing.company si viene numérico sin meta_data', () => {
    const rawWooItem: any = {
      id: 452,
      billing: {
        first_name: 'esteban',
        last_name: 'quaranta',
        company: '38.456.789',
        postcode: '2000'
      },
      meta_data: []
    };

    const customer = transformWooCustomer(rawWooItem);
    expect(customer.nombre).toBe('Esteban');
    expect(customer.apellido).toBe('Quaranta');
    expect(customer.dniCuit).toBe('38.456.789');
    expect(customer.codigoPostal).toBe('2000');
  });
});

describe('Desglose de datos de cliente para venta (FEAT-CUST-002)', () => {
  it('desglosa formato "Apellido, Nombre" si apellido viene vacío', () => {
    const rawNombre = 'Gómez, Marcelo Alejandro';
    const rawApellido = '';

    let normNombre = '';
    let normApellido = '';

    if (!rawApellido && rawNombre.includes(',')) {
      const parts = rawNombre.split(',').map((p) => p.trim());
      normApellido = normalizePersonName(parts[0]);
      normNombre = normalizePersonName(parts.slice(1).join(' '));
    }

    expect(normApellido).toBe('Gómez');
    expect(normNombre).toBe('Marcelo Alejandro');
  });

  it('desglosa nombre compuesto si apellido viene vacío', () => {
    const rawNombre = 'juan ignacio martinez';
    const rawApellido = '';

    let normNombre = '';
    let normApellido = '';

    if (!rawApellido && rawNombre.trim().split(/\s+/).length >= 2) {
      const parts = rawNombre.trim().split(/\s+/);
      normApellido = normalizePersonName(parts.pop());
      normNombre = normalizePersonName(parts.join(' '));
    }

    expect(normApellido).toBe('Martinez');
    expect(normNombre).toBe('Juan Ignacio');
  });
});
