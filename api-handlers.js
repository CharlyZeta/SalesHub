/**
 * SalesHub - API surface compartida.
 *
 * Contiene los handlers HTTP de la capa de servicios (backups en disco y
 * tracking de envíos Andreani). Se monta en DOS contextos distintos para
 * no duplicar lógica:
 *
 *   1. Producción : `server.js` (servidor Node standalone que sirve `dist/`).
 *   2. Desarrollo : middleware del dev server de Vite (`vite.config.ts`).
 *
 * Contrato: `handleApiRequest(req, res, options)` devuelve una Promise<boolean>.
 *   - `true`  -> la petición pertenecía a `/api/*` y el handler ya escribió la
 *                respuesta (incluye el 404 de rutas /api desconocidas).
 *   - `false` -> la petición NO es de API; el llamador debe continuar
 *                (next() en Vite o servir estáticos en server.js).
 */

import fs from 'node:fs';
import path from 'node:path';
import { createWooService } from './server-woo.js';

// ---------------------------------------------------------------------------
// Configuración por contexto (inyectada por cada host)
// ---------------------------------------------------------------------------

export const API_DEFAULTS = {
  /** Directorio donde se persisten los backups JSON. */
  backupsDir: 'backups',
  /** Archivo donde se registran los errores de Andreani. */
  logFile: 'andreani_error.log',
  /** Directorio de datos del servidor (config/estado/snapshot de WooCommerce). */
  dataDir: 'data',
  /** Política de retención de backups en disco. */
  retention: {
    /** Máximo de copias a conservar (0 = retención desactivada). */
    maxFiles: Number(process.env.BACKUP_MAX_FILES ?? 30),
    /** Nunca borrar copias más nuevas que esta cantidad de días. */
    minAgeDays: Number(process.env.BACKUP_MIN_AGE_DAYS ?? 7),
  },
};

// ---------------------------------------------------------------------------
// Utilidades de respuesta
// ---------------------------------------------------------------------------

function sendJson(res, status, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(data);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        err.isBadJson = true;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Andreani: autenticación, normalización y cliente
// ---------------------------------------------------------------------------

const andreaniTokenCache = new Map();

/**
 * Obtiene (y cachea por 55 minutos) el token de acceso a la API de Andreani.
 * El hash es el mismo `HASH_ANDREANI` provisto por Andreani en el header.
 */
async function getAndreaniToken(hash) {
  const now = Date.now();
  const cached = andreaniTokenCache.get(hash);
  if (cached && cached.expires > now) {
    return cached.token;
  }

  const res = await fetch('https://woocommerce-api-acom.andreani.com/api/v1/Login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': hash,
    },
  });

  if (!res.ok) {
    throw new Error(`Andreani authentication failed: ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  let token;
  if (contentType.includes('application/json')) {
    const data = await res.json();
    token =
      data.response?.accessToken ||
      data.token ||
      data.sessionToken ||
      data.XAuthToken ||
      data.key ||
      String(Object.values(data)[0] || '');
  } else {
    token = (await res.text()).trim();
  }

  andreaniTokenCache.set(hash, {
    token,
    expires: now + 55 * 60 * 1000, // Cache for 55 minutes
  });
  return token;
}

function normalizeAndreaniShipment(data) {
  const trackingNumber = data.trackingNumber || data.numeroSeguimiento || '';
  const trackingStatus = data.trackingStatus || data.status || data.estado || '';
  const status = data.status || '';
  const deliveryMode = data.deliveryMode || '';
  const salesOrderNumber = data.salesOrderNumber || '';
  const pedidoId = data.pedidoId || '';
  const events = data.events || data.eventos || [];
  const updatedAt = data.trackingUpdatedAt || data.updatedAt || new Date().toISOString();

  return {
    tracking_number: trackingNumber,
    tracking_status: trackingStatus,
    status: trackingStatus || status || 'Pendiente de ingreso',
    delivery_mode: deliveryMode,
    sales_order_number: salesOrderNumber,
    pedido_id: pedidoId,
    events,
    updated_at: updatedAt,
  };
}

function normalizeAndreaniBulk(data) {
  const shipments = Array.isArray(data) ? data : data.shipments || data.data || [];
  return shipments.map((s) => normalizeAndreaniShipment(s));
}

function logAndreaniError(logFile, err) {
  try {
    fs.appendFileSync(
      logFile,
      `${new Date().toISOString()} - [ERROR] ${err.message}\n${err.stack || ''}\n\n`
    );
  } catch (writeErr) {
    console.error('Failed to write to Andreani error log', writeErr);
  }
}

async function fetchWithAuth(urlStr, hash) {
  let activeToken = await getAndreaniToken(hash);
  let trackingRes = await fetch(urlStr, {
    method: 'GET',
    headers: {
      'X-Auth-Token': activeToken,
    },
  });

  if (trackingRes.status === 401) {
    andreaniTokenCache.delete(hash);
    activeToken = await getAndreaniToken(hash);
    trackingRes = await fetch(urlStr, {
      method: 'GET',
      headers: {
        'X-Auth-Token': activeToken,
      },
    });
  }
  return trackingRes;
}

// ---------------------------------------------------------------------------
// Handlers de backups en disco
// ---------------------------------------------------------------------------

/**
 * Rotación de backups: conserva las `maxFiles` copias más recientes y elimina las
 * más antiguas, respetando un piso de antigüedad (`minAgeDays`) para no borrar
 * nunca respaldos recientes. `maxFiles <= 0` desactiva la rotación.
 *
 * @returns {string[]} nombres de archivo eliminados
 */
function pruneBackups(backupsDir, retention) {
  const { maxFiles, minAgeDays } = retention || API_DEFAULTS.retention;
  const removed = [];
  if (!maxFiles || maxFiles <= 0 || !fs.existsSync(backupsDir)) {
    return removed;
  }

  try {
    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .map((filename) => {
        const filePath = path.join(backupsDir, filename);
        return { filename, filePath, mtime: fs.statSync(filePath).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime); // más recientes primero

    const minAgeMs = Math.max(0, minAgeDays) * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const file of files.slice(maxFiles)) {
      if (now - file.mtime < minAgeMs) continue; // piso de antigüedad
      fs.unlinkSync(file.filePath);
      removed.push(file.filename);
    }
  } catch (err) {
    // La rotación nunca debe romper el guardado de la copia.
    console.warn('[backups] No se pudo aplicar la retención:', err.message);
  }

  return removed;
}

export { pruneBackups };

async function handleBackupList(req, res, backupsDir) {
  try {
    if (!fs.existsSync(backupsDir)) {
      sendJson(res, 200, []);
      return;
    }
    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .map((filename) => {
        const filePath = path.join(backupsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          date: stats.mtime.toISOString(),
          size: stats.size,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    sendJson(res, 200, files);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

async function handleBackupSave(req, res, backupsDir, retention) {
  try {
    const data = await readJsonBody(req);
    if (!data) {
      sendJson(res, 400, { error: 'Cuerpo de petición vacío o JSON inválido' });
      return;
    }

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `backup-${dateStr}-${timeStr}.json`;
    fs.writeFileSync(path.join(backupsDir, filename), JSON.stringify(data, null, 2), 'utf-8');

    // Rotación: conserva las N copias más recientes y nunca borra las recientes.
    const pruned = pruneBackups(backupsDir, retention);

    sendJson(res, 200, { success: true, filename, timestamp: new Date().toISOString(), pruned });
  } catch (err) {
    sendJson(res, err && err.isBadJson ? 400 : 500, { error: err.message });
  }
}

async function handleBackupRestore(req, res, backupsDir) {
  try {
    const parsed = await readJsonBody(req);
    const filename = parsed && typeof parsed.filename === 'string' ? parsed.filename : '';
    if (!filename) {
      sendJson(res, 400, { error: 'Nombre de archivo inválido' });
      return;
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(backupsDir, safeFilename);
    if (fs.existsSync(filePath) && safeFilename.startsWith('backup-') && safeFilename.endsWith('.json')) {
      const data = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(data);
    } else {
      sendJson(res, 404, { error: 'Archivo no encontrado' });
    }
  } catch (err) {
    sendJson(res, err && err.isBadJson ? 400 : 500, { error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Handlers de tracking Andreani
// ---------------------------------------------------------------------------

async function handleAndreaniBulk(req, res, logFile) {
  const hash = req.headers['x-andreani-hash'] || '';
  if (!hash) {
    sendJson(res, 400, { error: 'Falta HASH_ANDREANI' });
    return;
  }

  try {
    const parsed = await readJsonBody(req);
    const trackingNumbers = parsed && Array.isArray(parsed.trackingNumbers) ? parsed.trackingNumbers : [];
    if (trackingNumbers.length === 0) {
      sendJson(res, 200, []);
      return;
    }

    // Consulta en paralelo usando el endpoint de búsqueda por número de guía
    const fetchPromises = trackingNumbers.map(async (num) => {
      try {
        const searchRes = await fetchWithAuth(
          `https://woocommerce-api-acom.andreani.com/api/v1/Shipments?search=${encodeURIComponent(String(num).trim())}&page=1&pageSize=1`,
          hash
        );
        if (!searchRes.ok) {
          return null;
        }
        const data = await searchRes.json();
        const items = data.response?.items || data.items || [];
        return items[0] || null;
      } catch {
        return null;
      }
    });

    const rawShipments = (await Promise.all(fetchPromises)).filter(Boolean);
    sendJson(res, 200, normalizeAndreaniBulk(rawShipments));
  } catch (err) {
    if (!err || !err.isBadJson) {
      logAndreaniError(logFile, err);
    }
    sendJson(res, err && err.isBadJson ? 400 : 500, { error: err.message });
  }
}

async function handleAndreaniSingle(req, res, trackingNumber, logFile) {
  const hash = req.headers['x-andreani-hash'] || '';
  if (!hash) {
    sendJson(res, 400, { error: 'Falta HASH_ANDREANI' });
    return;
  }

  try {
    const searchRes = await fetchWithAuth(
      `https://woocommerce-api-acom.andreani.com/api/v1/Shipments?search=${encodeURIComponent(trackingNumber.trim())}&page=1&pageSize=1`,
      hash
    );
    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      throw new Error(`Andreani tracking failed with status ${searchRes.status}: ${errBody}`);
    }
    const data = await searchRes.json();
    const items = data.response?.items || data.items || [];
    const shipment = items[0];
    if (!shipment) {
      sendJson(res, 404, { error: 'Guía no encontrada en Andreani' });
      return;
    }
    sendJson(res, 200, normalizeAndreaniShipment(shipment));
  } catch (err) {
    logAndreaniError(logFile, err);
    sendJson(res, 500, { error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Sincronización de WooCommerce del lado del servidor (Fix E / W2)
// ---------------------------------------------------------------------------

/** Instancias por dataDir (dev y producción usan el mismo directorio `data/`). */
const wooServices = new Map();

function getWooService(dataDir) {
  const key = path.resolve(dataDir);
  if (!wooServices.has(key)) {
    wooServices.set(key, createWooService({ dataDir: key }));
  }
  return wooServices.get(key);
}

/** GET /api/woo/status → estado público (sin credenciales) */
async function handleWooStatus(req, res, dataDir) {
  sendJson(res, 200, getWooService(dataDir).getStatus());
}

/** GET /api/woo/snapshot → último catálogo/clientes descargados por el servidor */
async function handleWooSnapshot(req, res, dataDir) {
  sendJson(res, 200, { snapshot: getWooService(dataDir).getSnapshot() });
}

/** POST /api/woo/config → la app publica URL, credenciales y programación */
async function handleWooSetConfig(req, res, dataDir) {
  try {
    const body = await readJsonBody(req);
    if (!body || typeof body !== 'object') {
      sendJson(res, 400, { error: 'Cuerpo de petición vacío o JSON inválido' });
      return;
    }
    if (body.url !== undefined && typeof body.url !== 'string') {
      sendJson(res, 400, { error: 'URL inválida' });
      return;
    }
    sendJson(res, 200, { success: true, status: getWooService(dataDir).setConfig(body) });
  } catch (err) {
    sendJson(res, err && err.isBadJson ? 400 : 500, { error: err.message });
  }
}

/** DELETE /api/woo/config → desactiva la sincronización del servidor */
async function handleWooClearConfig(req, res, dataDir) {
  sendJson(res, 200, { success: true, status: getWooService(dataDir).clearConfig() });
}

/** POST /api/woo/sync → fuerza una sincronización inmediata */
async function handleWooSyncNow(req, res, dataDir) {
  try {
    const result = await getWooService(dataDir).runSync('manual');
    sendJson(res, result.ok ? 200 : 500, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Router principal
// ---------------------------------------------------------------------------

/**
 * Atiende las rutas /api/* de SalesHub. Devuelve true si la petición era de API
 * (en ese caso ya escribió una respuesta, incluidos los 404 de rutas desconocidas).
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{ backupsDir?: string, logFile?: string, dataDir?: string, retention?: { maxFiles?: number, minAgeDays?: number } }} [options]
 * @returns {Promise<boolean>}
 */
export async function handleApiRequest(req, res, options = {}) {
  const { backupsDir, logFile, retention, dataDir } = { ...API_DEFAULTS, ...options };
  const pathname = (req.url || '').split('?')[0];

  // Solo se responsabiliza por el espacio /api/*
  if (!pathname.startsWith('/api/')) {
    return false;
  }

  // --- Backups ---
  if (pathname === '/api/backup/list' && req.method === 'GET') {
    await handleBackupList(req, res, backupsDir);
    return true;
  }

  if (pathname.startsWith('/api/backup') && req.method === 'POST') {
    if (pathname === '/api/backup/restore') {
      await handleBackupRestore(req, res, backupsDir);
    } else {
      await handleBackupSave(req, res, backupsDir, retention);
    }
    return true;
  }

  // --- Tracking Andreani ---
  if (pathname === '/api/tracking/andreani/bulk' && req.method === 'POST') {
    await handleAndreaniBulk(req, res, logFile);
    return true;
  }

  if (pathname.startsWith('/api/tracking/andreani/') && req.method === 'GET') {
    const segments = pathname.split('/').filter(Boolean);
    const trackingNumber = segments[segments.length - 1] || '';
    if (trackingNumber && trackingNumber !== 'bulk') {
      await handleAndreaniSingle(req, res, trackingNumber, logFile);
    } else {
      sendJson(res, 404, { error: 'Ruta no encontrada' });
    }
    return true;
  }

  // --- Sincronización de WooCommerce (servidor) ---
  if (pathname === '/api/woo/status' && req.method === 'GET') {
    await handleWooStatus(req, res, dataDir);
    return true;
  }

  if (pathname === '/api/woo/snapshot' && req.method === 'GET') {
    await handleWooSnapshot(req, res, dataDir);
    return true;
  }

  if (pathname === '/api/woo/config' && req.method === 'POST') {
    await handleWooSetConfig(req, res, dataDir);
    return true;
  }

  if (pathname === '/api/woo/config' && req.method === 'DELETE') {
    await handleWooClearConfig(req, res, dataDir);
    return true;
  }

  if (pathname === '/api/woo/sync' && req.method === 'POST') {
    await handleWooSyncNow(req, res, dataDir);
    return true;
  }

  // Rutas /api/* desconocidas: responder 404 en vez de colgar la conexión.
  sendJson(res, 404, { error: 'Ruta no encontrada' });
  return true;
}
