import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { handleApiRequest } from '../../api-handlers.js';

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
