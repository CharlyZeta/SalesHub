import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildWooApiUrl,
  transformWooProduct,
  transformWooCustomer,
  fetchWooCommerceProducts,
  fetchWooCommerceCustomers,
  WooProductDTO,
  WooCustomerDTO
} from '../utils/wooCommerceApi';

describe('WooCommerce API Utility', () => {

  it('builds valid WooCommerce REST API URLs with consumer credentials', () => {
    const url = buildWooApiUrl('http://mitienda.com', 'products', 'ck_123', 'cs_456');
    expect(url).toBe('http://mitienda.com/wp-json/wc/v3/products?consumer_key=ck_123&consumer_secret=cs_456');
  });

  it('transforms WooCommerce Product DTO to CatalogProduct', () => {
    const dto: WooProductDTO = {
      id: 99,
      name: 'Freezer Industrial',
      sku: 'WOO-99',
      price: '850000',
      stock_quantity: 5,
      categories: [{ id: 1, name: 'Refrigeración' }]
    };

    const transformed = transformWooProduct(dto);
    expect(transformed.id).toBe('woo-prod-99');
    expect(transformed.sku).toBe('WOO-99');
    expect(transformed.nombre).toBe('Freezer Industrial');
    expect(transformed.precio).toBe(850000);
    expect(transformed.stock).toBe(5);
    expect(transformed.categoria).toBe('Refrigeración');
    expect(transformed.origen).toBe('WooCommerce');
  });

  it('transforms WooCommerce Customer DTO to Customer', () => {
    const dto: WooCustomerDTO = {
      id: 105,
      email: 'marta@gastronomia.com',
      first_name: 'Marta',
      last_name: 'Pérez',
      billing: {
        first_name: 'Marta',
        last_name: 'Pérez',
        company: 'Resto San Martin',
        address_1: 'San Martin 500',
        city: 'Santa Fe',
        phone: '342-4000111'
      }
    };

    const transformed = transformWooCustomer(dto);
    expect(transformed.id).toBe('woo-cust-105');
    expect(transformed.clienteId).toBe('WC-105');
    expect(transformed.razonSocialNombre).toBe('Resto San Martin');
    expect(transformed.email).toBe('marta@gastronomia.com');
    expect(transformed.direccion).toContain('San Martin 500');
    expect(transformed.canalHabitual).toBe('WooCommerce');
    expect(transformed.dniCuit).toBe('');
  });

  it('transforms WooCommerce customer with minimal data without fabricating fields', () => {
    const dto: WooCustomerDTO = { id: 7, email: 'c7@shop.com', first_name: '', last_name: '' };

    const transformed = transformWooCustomer(dto);
    expect(transformed.dniCuit).toBe('');
    expect(transformed.telefono).toBe('');
    expect(transformed.direccion).toBe('');
  });

  it('extracts dniCuit and phone from metadata when billing fields are missing or empty', () => {
    const dto: WooCustomerDTO = {
      id: 106,
      email: 'juan@cuit.com',
      first_name: 'Juan',
      last_name: 'Gomez',
      billing: {
        phone: ''
      },
      meta_data: [
        { key: 'billing_dni', value: '20-38491029-4' },
        { key: 'billing_phone', value: '11-5491-8821' }
      ]
    };

    const transformed = transformWooCustomer(dto);
    expect(transformed.dniCuit).toBe('20-38491029-4');
    expect(transformed.telefono).toBe('11-5491-8821');
  });

  it('uses direct fetch only and never routes credentials through third-party CORS proxies', async () => {
    const mockProducts: WooProductDTO[] = [{ id: 1, name: 'Prod 1', sku: 'SKU1', price: '100' }];
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts
    } as any);

    const result = await fetchWooCommerceProducts({
      url: 'https://test-shop.com',
      consumerKey: 'ck_1',
      consumerSecret: 'cs_1',
      autoSync: false,
      conectado: true
    });

    expect(result.length).toBe(1);
    // Credentials must go to the WooCommerce origin, never to a third-party proxy host.
    const fetchedUrl = globalFetchSpy.mock.calls[0][0] as string;
    expect(fetchedUrl.startsWith('https://test-shop.com')).toBe(true);
    expect(fetchedUrl).not.toContain('corsproxy.io');
    expect(fetchedUrl).not.toContain('allorigins');
    globalFetchSpy.mockRestore();
  });

  it('returns fallback demo catalog when credentials are placeholders and fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await fetchWooCommerceProducts({
      url: 'https://ejemplo.tienda.com',
      consumerKey: '',
      consumerSecret: '',
      autoSync: false,
      conectado: false
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].origen).toBe('WooCommerce');
    (globalThis.fetch as any).mockRestore();
  });

  it('fetches products via WooCommerce API or fallback simulation', async () => {
    const config = {
      url: 'https://demo-tienda.com',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      autoSync: false,
      conectado: true
    };

    const products = await fetchWooCommerceProducts(config);
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].origen).toBe('WooCommerce');
  });

  it('throws error when URL is empty for products or customers', async () => {
    const emptyConfig = {
      url: '',
      consumerKey: '',
      consumerSecret: '',
      autoSync: false,
      conectado: false
    };

    await expect(fetchWooCommerceProducts(emptyConfig)).rejects.toThrow('URL de WooCommerce requerida');
    await expect(fetchWooCommerceCustomers(emptyConfig)).rejects.toThrow('URL de WooCommerce requerida');
  });

  it('handles HTTP successful fetch responses for WooCommerce products', async () => {
    const mockProducts: WooProductDTO[] = [
      { id: 1, name: 'Prod 1', sku: 'SKU1', price: '100', stock_quantity: 10 }
    ];

    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts
    } as any);

    const result = await fetchWooCommerceProducts({
      url: 'https://test-shop.com',
      consumerKey: 'ck_1',
      consumerSecret: 'cs_1',
      autoSync: false,
      conectado: true
    });

    expect(result.length).toBe(1);
    expect(result[0].sku).toBe('SKU1');
    globalFetchSpy.mockRestore();
  });

  it('handles HTTP successful fetch responses for WooCommerce customers', async () => {
    const mockCustomers: WooCustomerDTO[] = [
      { id: 1, email: 'c1@shop.com', first_name: 'Ana', last_name: 'Lopez' }
    ];

    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers
    } as any);

    const result = await fetchWooCommerceCustomers({
      url: 'https://test-shop.com',
      consumerKey: 'ck_1',
      consumerSecret: 'cs_1',
      autoSync: false,
      conectado: true
    });

    expect(result.length).toBe(1);
    expect(result[0].email).toBe('c1@shop.com');
    globalFetchSpy.mockRestore();
  });

});
