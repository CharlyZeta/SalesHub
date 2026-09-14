import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { handleApiRequest, pruneBackups, API_DEFAULTS } from '../../api-handlers.js';

/** Doble mínimo de req/res de Node para ejercitar los handlers. */
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
    headers: {} as Record<string, string>,
    body: '',
    writeHead(status: number, headers: Record<string, string> = {}) {
      this.statusCode = status;
      this.headers = headers;
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

/** Ejecuta una petición completa (incluye lectura de body). */
async function call(req: any, options: any) {
  const res = createRes();
  const handled = await handleApiRequest(req, res, options);
  return { handled, res };
}

const RETENTION_OFF = { maxFiles: 0, minAgeDays: 0 };

describe('api-handlers: enrutado', () => {
  it('ignora las rutas que no son de API (deja seguir al servidor estático)', async () => {
    const { handled } = await call(createReq({ url: '/index.html' }), {});
    expect(handled).toBe(false);
  });

  it('responde 404 JSON en rutas /api desconocidas', async () => {
    const { handled, res } = await call(createReq({ url: '/api/no-existe' }), {});
    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Ruta no encontrada');
  });

  it('acepta querystring en la ruta (solo evalúa el pathname)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saleshub-api-'));
    try {
      const { res } = await call(createReq({ url: '/api/backup/list?x=1' }), { backupsDir: dir });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('api-handlers: backups en disco', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saleshub-api-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('guarda un backup, lo lista y lo devuelve al restaurarlo', async () => {
    const state = { sales: [{ id: 'V-1' }], note: 'prueba' };
    const req = createReq({
      method: 'POST',
      url: '/api/backup',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    });
    const res = createRes();
    const promise = handleApiRequest(req, res, { backupsDir: dir, retention: RETENTION_OFF });
    req.emitBody();
    await promise;

    expect(res.statusCode).toBe(200);
    const saved = res.json();
    expect(saved.success).toBe(true);
    expect(saved.filename).toMatch(/^backup-\d{4}-\d{2}-\d{2}-[\d-]+\.json$/);

    const listReq = createReq({ url: '/api/backup/list' });
    const listRes = createRes();
    const listPromise = handleApiRequest(listReq, listRes, { backupsDir: dir });
    listReq.emitBody();
    await listPromise;
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()[0].filename).toBe(saved.filename);

    const restoreReq = createReq({
      method: 'POST',
      url: '/api/backup/restore',
      body: JSON.stringify({ filename: saved.filename }),
    });
    const restoreRes = createRes();
    const restorePromise = handleApiRequest(restoreReq, restoreRes, { backupsDir: dir });
    restoreReq.emitBody();
    await restorePromise;
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json()).toEqual(state);
  });

  it('rechaza JSON inválido y cuerpo vacío con 400', async () => {
    const badRes = createRes();
    const badReq = createReq({ method: 'POST', url: '/api/backup', body: '{roto' });
    const p1 = handleApiRequest(badReq, badRes, { backupsDir: dir });
    badReq.emitBody();
    await p1;
    expect(badRes.statusCode).toBe(400);

    const emptyRes = createRes();
    const emptyReq = createReq({ method: 'POST', url: '/api/backup' });
    const p2 = handleApiRequest(emptyReq, emptyRes, { backupsDir: dir });
    emptyReq.emitBody();
    await p2;
    expect(emptyRes.statusCode).toBe(400);
  });

  it('bloquea path traversal en /api/backup/restore', async () => {
    const res = createRes();
    const req = createReq({
      method: 'POST',
      url: '/api/backup/restore',
      body: JSON.stringify({ filename: '..\\..\\server.js' }),
    });
    const promise = handleApiRequest(req, res, { backupsDir: dir });
    req.emitBody();
    await promise;
    expect(res.statusCode).toBe(404);
  });

  it('devuelve 400 si falta el nombre de archivo al restaurar', async () => {
    const res = createRes();
    const req = createReq({ method: 'POST', url: '/api/backup/restore', body: JSON.stringify({}) });
    const promise = handleApiRequest(req, res, { backupsDir: dir });
    req.emitBody();
    await promise;
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Nombre de archivo inválido');
  });
});

describe('api-handlers: retención de backups (rotación)', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saleshub-retention-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** Crea N backups con antigüedad controlada (días hacia atrás). */
  function seedBackups(count: number, ageDays: number) {
    const old = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);
    for (let i = 0; i < count; i++) {
      const name = `backup-2020-01-${String(i + 1).padStart(2, '0')}-00-00-0${i % 10}.json`;
      const file = path.join(dir, name);
      fs.writeFileSync(file, '{}', 'utf-8');
      fs.utimesSync(file, old, old);
    }
  }

  it('no borra nada cuando la retención está desactivada (maxFiles=0)', () => {
    seedBackups(5, 30);
    const removed = pruneBackups(dir, { maxFiles: 0, minAgeDays: 0 });
    expect(removed).toEqual([]);
    expect(fs.readdirSync(dir).length).toBe(5);
  });

  it('conserva las N más recientes y elimina las antiguas', () => {
    seedBackups(5, 30);
    const removed = pruneBackups(dir, { maxFiles: 2, minAgeDays: 0 });
    expect(removed.length).toBe(3);
    expect(fs.readdirSync(dir).length).toBe(2);
  });

  it('respeta el piso de antigüedad: nunca borra copias recientes', () => {
    seedBackups(5, 0); // todas recién creadas
    const removed = pruneBackups(dir, { maxFiles: 1, minAgeDays: 7 });
    expect(removed).toEqual([]);
    expect(fs.readdirSync(dir).length).toBe(5);
  });

  it('aplica la retención al guardar y reporta los archivos podados', async () => {
    seedBackups(3, 30);
    const req = createReq({ method: 'POST', url: '/api/backup', body: JSON.stringify({ ok: true }) });
    const res = createRes();
    const promise = handleApiRequest(req, res, {
      backupsDir: dir,
      retention: { maxFiles: 2, minAgeDays: 0 },
    });
    req.emitBody();
    await promise;

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.pruned)).toBe(true);
    // 3 antiguos + 1 nuevo = 4 -> se conservan 2
    expect(fs.readdirSync(dir).length).toBe(2);
  });

  it('expone la política por defecto (30 archivos / 7 días)', () => {
    expect(API_DEFAULTS.retention.maxFiles).toBe(30);
    expect(API_DEFAULTS.retention.minAgeDays).toBe(7);
  });
});

describe('api-handlers: tracking Andreani', () => {
  it('exige el header x-andreani-hash en el endpoint bulk', async () => {
    const res = createRes();
    const req = createReq({
      method: 'POST',
      url: '/api/tracking/andreani/bulk',
      body: JSON.stringify({ trackingNumbers: ['ABC123'] }),
    });
    const promise = handleApiRequest(req, res, {});
    req.emitBody();
    await promise;
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Falta HASH_ANDREANI');
  });

  it('exige el header x-andreani-hash en el tracking individual', async () => {
    const { res } = await call(createReq({ url: '/api/tracking/andreani/ABC123' }), {});
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Falta HASH_ANDREANI');
  });

  it('devuelve 404 si se pide el listado bulk por GET', async () => {
    const { res } = await call(createReq({ url: '/api/tracking/andreani/bulk' }), {});
    expect(res.statusCode).toBe(404);
  });

  it('responde lista vacía cuando no se envían números de seguimiento', async () => {
    const res = createRes();
    const req = createReq({
      method: 'POST',
      url: '/api/tracking/andreani/bulk',
      headers: { 'x-andreani-hash': 'hash-de-prueba' },
      body: JSON.stringify({ trackingNumbers: [] }),
    });
    const promise = handleApiRequest(req, res, {});
    req.emitBody();
    await promise;
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});
