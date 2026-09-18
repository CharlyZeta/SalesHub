import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { handleApiRequest } from '../../api-handlers.js';
import { createWooService, mergeCatalog, mergeCustomers } from '../../server-woo.js';

/**
 * Sincronización de WooCommerce del lado del servidor (Fix E / W2).
 * Se simula `fetch` para no tocar la red: se verifica el flujo completo
 * (configurar → sincronizar → snapshot → estado) y el manejo de errores.
 */

function createReq({ method = 'GET', url = '/', headers = {}, body }: any = {}): any {
  const listeners: Record<string, ((arg?: any) => void)[]> = {};
  return {
    method,
    url,
    headers,
    on(event: string, cb: (arg?: any) => void) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
      return this;
    },
    emitBody() {
      if (body !== undefined) (listeners['data'] || []).forEach((cb) => cb(Buffer.from(body)));
      (listeners['end'] || []).forEach((cb) => cb());
    },
  };
}

function createRes(): any {
  return {
    statusCode: 0,
    body: '',
    writeHead(status: number) {
      this.statusCode = status;
      return this;
    },
    end(chunk?: string) {
      if (chunk) this.body += chunk;
    },
    json() {
      return this.body ? JSON.parse(this.body) : null;
    },
  };
}

async function call(req: any, options: any = {}) {
  const res = createRes();
  const promise = handleApiRequest(req, res, options);
  req.emitBody();
  await promise;
  return res;
}

/** Respuesta simulada de la API de WooCommerce. */
function wooResponse(items: any[]) {
  return {
    ok: true,
    status: 200,
    json: async () => items,
  };
}

describe('API WooCommerce del servidor (Fix E)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saleshub-woo-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('reporta el estado inicial como no configurado', async () => {
    const res = await call(createReq({ url: '/api/woo/status' }), { dataDir });
    expect(res.statusCode).toBe(200);
    const status = res.json();
    expect(status.configured).toBe(false);
    expect(status.hasCredentials).toBe(false);
    expect(status.autoSync).toBe(false);
    expect(status.hasSnapshot).toBe(false);
  });

  it('guarda la configuración sin exponer las credenciales', async () => {
    const res = await call(
      createReq({
        method: 'POST',
        url: '/api/woo/config',
        body: JSON.stringify({
          url: 'https://tienda-de-prueba.com',
          consumerKey: 'ck_secreta',
          consumerSecret: 'cs_secreta',
          autoSync: true,
          intervalHours: 4,
        }),
      }),
      { dataDir }
    );

    expect(res.statusCode).toBe(200);
    const status = res.json().status;
    expect(status.configured).toBe(true);
    expect(status.hasCredentials).toBe(true);
    expect(status.autoSync).toBe(true);
    expect(status.intervalHours).toBe(4);
    // Nunca deben viajar las claves en la respuesta
    expect(JSON.stringify(res.json())).not.toContain('ck_secreta');
    expect(JSON.stringify(res.json())).not.toContain('cs_secreta');

    // La configuración queda persistida en disco (dataDir) con permisos restrictivos
    const onDisk = JSON.parse(fs.readFileSync(path.join(dataDir, 'woo-config.json'), 'utf-8'));
    expect(onDisk.consumerKey).toBe('ck_secreta');
  });

  it('sincroniza productos y clientes y publica el snapshot', async () => {
    await call(
      createReq({
        method: 'POST',
        url: '/api/woo/config',
        body: JSON.stringify({ url: 'https://tienda.com', consumerKey: 'ck', consumerSecret: 'cs', autoSync: true }),
      }),
      { dataDir }
    );

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/products')) {
        return wooResponse([
          { id: 1, name: 'Heladera Showcase', sku: 'H1', price: '1500000', stock_quantity: 3, status: 'publish', categories: [{ name: 'Comercial' }] },
        ]);
      }
      return wooResponse([
        {
          id: 7,
          email: 'cliente@tienda.com',
          first_name: 'Ana',
          last_name: 'Pérez',
          billing: { first_name: 'Ana', last_name: 'Pérez', city: 'Santa Fe', state: 'Santa Fe', phone: '3425551234' },
          meta_data: [{ key: 'billing_dni', value: '27-30123456-4' }],
        },
      ]);
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(createReq({ method: 'POST', url: '/api/woo/sync', body: '{}' }), { dataDir });
    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result.ok).toBe(true);
    expect(result.products).toBe(1);
    expect(result.customers).toBe(1);

    const snapshotRes = await call(createReq({ url: '/api/woo/snapshot' }), { dataDir });
    const snapshot = snapshotRes.json().snapshot;
    expect(snapshot.products[0]).toMatchObject({ id: 'woo-prod-1', nombre: 'Heladera Showcase', precio: 1500000, stock: 3 });
    expect(snapshot.customers[0]).toMatchObject({ clienteId: 'WC-7', nombre: 'Ana', dniCuit: '27-30123456-4', localidad: 'Santa Fe' });
    expect(typeof snapshot.fetchedAt).toBe('string');

    const status = (await call(createReq({ url: '/api/woo/status' }), { dataDir })).json();
    expect(status.lastError).toBeNull();
    expect(status.lastCounts).toEqual({ products: 1, customers: 1 });
    expect(status.nextRunAt).toBeTruthy();
  });

  it('registra el error y no deja snapshot cuando la API falla', async () => {
    await call(
      createReq({
        method: 'POST',
        url: '/api/woo/config',
        body: JSON.stringify({ url: 'https://tienda.com', consumerKey: 'ck', consumerSecret: 'cs' }),
      }),
      { dataDir }
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Claves API no autorizadas' }),
      }))
    );

    const res = await call(createReq({ method: 'POST', url: '/api/woo/sync', body: '{}' }), { dataDir });
    expect(res.statusCode).toBe(500);
    expect(String(res.json().error)).toContain('401');

    const status = (await call(createReq({ url: '/api/woo/status' }), { dataDir })).json();
    expect(status.lastError).toContain('401');
    expect(status.hasSnapshot).toBe(false);
  });

  it('no sincroniza si faltan credenciales', async () => {
    await call(
      createReq({ method: 'POST', url: '/api/woo/config', body: JSON.stringify({ url: 'https://tienda.com', autoSync: true }) }),
      { dataDir }
    );
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call(createReq({ method: 'POST', url: '/api/woo/sync', body: '{}' }), { dataDir });
    expect(res.statusCode).toBe(500);
    expect(String(res.json().error)).toMatch(/credenciales/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('permite desactivar la sincronización del servidor', async () => {
    await call(
      createReq({
        method: 'POST',
        url: '/api/woo/config',
        body: JSON.stringify({ url: 'https://tienda.com', consumerKey: 'ck', consumerSecret: 'cs', autoSync: true }),
      }),
      { dataDir }
    );
    const res = await call(createReq({ method: 'DELETE', url: '/api/woo/config' }), { dataDir });
    expect(res.statusCode).toBe(200);
    expect(res.json().status.configured).toBe(false);
    expect(res.json().status.hasCredentials).toBe(false);
  });

  it('rechaza configuración con JSON inválido', async () => {
    const res = await call(createReq({ method: 'POST', url: '/api/woo/config', body: '{roto' }), { dataDir });
    expect(res.statusCode).toBe(400);
  });
});

describe('Merge de catálogo y clientes (Fix D / W5)', () => {
  const localProducts = [
    { id: 'manual-1', sku: 'MAN-1', nombre: 'Producto Manual', precio: 1000, stock: 5, origen: 'Manual' },
    { id: 'woo-prod-10', sku: 'SKU-10', nombre: 'Producto de tienda', precio: 2000, stock: 2, origen: 'WooCommerce' },
  ];

  const wooProducts = [
    { id: 'woo-prod-10', sku: 'SKU-10', nombre: 'Producto de tienda', precio: 2500, stock: 7, origen: 'WooCommerce' },
    { id: 'woo-prod-11', sku: 'SKU-11', nombre: 'Producto nuevo', precio: 500, stock: 1, origen: 'WooCommerce' },
  ];

  it('conserva los productos locales y agrega los nuevos (sin borrar nada)', () => {
    const result = mergeCatalog(localProducts, wooProducts);

    expect(result.merged).toHaveLength(3); // 2 locales (uno actualizado) + 1 nuevo
    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.localKept).toBe(2); // los 2 productos locales siguen existiendo

    const manual = result.merged.find((p: any) => p.sku === 'MAN-1');
    expect(manual).toMatchObject({ nombre: 'Producto Manual', precio: 1000, origen: 'Manual' });

    const existing = result.merged.find((p: any) => p.sku === 'SKU-10');
    expect(existing).toMatchObject({ id: 'woo-prod-10', precio: 2500, stock: 7 });
  });

  it('actualiza por SKU aunque cambie el nombre y conserva el id local', () => {
    const result = mergeCatalog(
      [{ id: 'local-9', sku: 'SKU-9', nombre: 'Nombre viejo', precio: 100, stock: 1 }],
      [{ id: 'woo-prod-9', sku: 'SKU-9', nombre: 'Nombre nuevo', precio: 300, stock: 4 }]
    );
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]).toMatchObject({ id: 'local-9', nombre: 'Nombre nuevo', precio: 300, stock: 4 });
    expect(result.added).toBe(0);
  });

  it('preserva el historial de compras de los clientes locales', () => {
    const result = mergeCustomers(
      [{ clienteId: 'WC-5', nombre: 'Ana', email: 'ana@x.com', totalCompras: 500000, cantidadPedidos: 3, ultimaCompra: '2026-01-01' }],
      [{ clienteId: 'WC-5', nombre: 'Ana María', email: 'ana@x.com', telefono: '3425551234' }, { clienteId: 'WC-6', nombre: 'Luis' }]
    );

    expect(result.merged).toHaveLength(2);
    expect(result.added).toBe(1);
    const ana = result.merged.find((c: any) => c.clienteId === 'WC-5');
    expect(ana).toMatchObject({ totalCompras: 500000, cantidadPedidos: 3, telefono: '3425551234' });
  });
});

describe('Programación del servidor (runSyncIfDue)', () => {
  let dataDir: string;

  const configure = (service: any, extra: any = {}) =>
    service.setConfig({
      url: 'https://tienda.com',
      consumerKey: 'ck',
      consumerSecret: 'cs',
      autoSync: true,
      intervalHours: 1,
      ...extra,
    });

  /** Deja el estado con un lastSync dado (simula sincronizaciones previas). */
  const setLastSync = (iso: string) => {
    fs.writeFileSync(path.join(dataDir, 'woo-state.json'), JSON.stringify({ lastSync: iso }), 'utf-8');
  };

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saleshub-woo-sched-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('no sincroniza si la automatización está desactivada', async () => {
    const service = createWooService({ dataDir, log: { info() {}, warn() {} } });
    configure(service, { autoSync: false });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await service.runSyncIfDue();
    expect(result.ran).toBe(false);
    expect(result.reason).toBe('deshabilitado');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no sincroniza si todavía no venció el intervalo', async () => {
    const service = createWooService({ dataDir, log: { info() {}, warn() {} } });
    configure(service);
    setLastSync(new Date().toISOString()); // recién sincronizado

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await service.runSyncIfDue();
    expect(result.ran).toBe(false);
    expect(result.reason).toBe('todavía no corresponde');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sincroniza cuando el intervalo ya venció y deja el snapshot', async () => {
    const service = createWooService({ dataDir, log: { info() {}, warn() {} } });
    configure(service);
    setLastSync(new Date(Date.now() - 5 * 3600_000).toISOString()); // hace 5 h (intervalo: 1 h)

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).includes('/products')
          ? wooResponse([{ id: 2, name: 'Freezer', sku: 'F1', price: '900000', stock_quantity: 1 }])
          : wooResponse([{ id: 9, email: 'c@tienda.com', first_name: 'Luis', last_name: 'Gómez' }])
      )
    );

    const result: any = await service.runSyncIfDue();
    expect(result.ran).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.products).toBe(1);
    expect(result.customers).toBe(1);

    const snapshot = service.getSnapshot();
    expect(snapshot.products).toHaveLength(1);
    expect(service.getStatus().lastError).toBeNull();
    expect(service.getStatus().nextRunAt).toBeTruthy();
  });

  it('aplica backoff tras un fallo en lugar de reintentar en cada tick', async () => {
    const service = createWooService({ dataDir, log: { info() {}, warn() {} } });
    configure(service);
    setLastSync(new Date(Date.now() - 5 * 3600_000).toISOString());

    const failingFetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'boom' }),
    }));
    vi.stubGlobal('fetch', failingFetch);

    const first: any = await service.runSyncIfDue();
    expect(first.ran).toBe(true);
    expect(first.ok).toBe(false);

    // Inmediatamente después: no debe volver a intentar
    const callsAfterFirst = failingFetch.mock.calls.length;
    const second = await service.runSyncIfDue();
    expect(second.ran).toBe(false);
    expect(String(second.reason)).toContain('backoff');
    expect(failingFetch.mock.calls.length).toBe(callsAfterFirst);

    // Cumplido el backoff (1 min para el primer fallo) sí reintenta
    const third = await service.runSyncIfDue(Date.now() + 61_000);
    expect(third.ran).toBe(true);
  });
});
