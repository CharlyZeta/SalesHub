/**
 * SalesHub - Servidor de producción (Node.js standalone).
 *
 * Sirve el bundle estático de Vite (`dist/`) y monta la misma superficie de API
 * que el dev server (`/api/backup*` y `/api/tracking/andreani/*`), de modo que
 * backups en disco y tracking de envíos funcionen también en producción.
 *
 * La lógica de API vive en `api-handlers.js` y se comparte con el middleware de
 * desarrollo de Vite (ver `vite.config.ts`), evitando duplicación.
 *
 * Uso:
 *   npm run build   # genera dist/
 *   npm start       # node server.js  (default http://0.0.0.0:3000)
 *
 * Variables de entorno:
 *   PORT     Puerto de escucha (default 3000)
 *   HOST     Interfaz de escucha (default 0.0.0.0)
 *   DIST_DIR Carpeta del build estático (default ./dist)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './api-handlers.js';
import { createWooService } from './server-woo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = process.env.DIST_DIR
  ? path.resolve(__dirname, process.env.DIST_DIR)
  : path.join(__dirname, 'dist');

const BACKUPS_DIR = path.join(__dirname, 'backups');
const ANDREANI_LOG_FILE = path.join(__dirname, 'andreani_error.log');
/** Datos del servidor (config/estado/snapshot de WooCommerce). Excluido de git. */
const DATA_DIR = process.env.DATA_DIR ? path.resolve(__dirname, process.env.DATA_DIR) : path.join(__dirname, 'data');

/**
 * Servicio de sincronización de WooCommerce (W2/Fix E). Una única instancia compartida
 * por las rutas de la API y por el temporizador de programación.
 */
const woo = createWooService({ dataDir: DATA_DIR });

/** Cada cuánto el servidor evalúa si corresponde sincronizar (por defecto 60 s). */
const WOO_TICK_MS = Number(process.env.WOO_TICK_MS || 60_000);
/** `WOO_SCHEDULER=off` desactiva la programación del servidor. */
const WOO_SCHEDULER_ENABLED = (process.env.WOO_SCHEDULER || 'on').toLowerCase() !== 'off';

// ---------------------------------------------------------------------------
// Servicio de archivos estáticos
// ---------------------------------------------------------------------------

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/** Resuelve y valida (anti path traversal) la ruta física dentro de dist/. */
function resolveStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);
  if (!filePath.startsWith(DIST_DIR + path.sep) && filePath !== DIST_DIR) {
    return null; // intento de escape del directorio raíz
  }
  return filePath;
}

function serveStatic(req, res) {
  const { pathname } = new URL(req.url || '/', 'http://localhost');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  let filePath = resolveStaticPath(pathname === '/' ? '/index.html' : pathname);

  // Fallback SPA: rutas sin extensión (navegación directa del cliente React)
  const hasExtension = path.extname(pathname).length > 0;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (hasExtension) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

// ---------------------------------------------------------------------------
// Servidor HTTP
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  try {
    const handled = await handleApiRequest(req, res, {
      backupsDir: BACKUPS_DIR,
      logFile: ANDREANI_LOG_FILE,
      dataDir: DATA_DIR,
      woo,
    });
    if (!handled) {
      serveStatic(req, res);
    }
  } catch (err) {
    console.error('[server] Error no controlado:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[SalesHub] Servidor de producción escuchando en http://${HOST}:${PORT}`);
  console.log(`[SalesHub] Sirviendo build estático desde: ${DIST_DIR}`);
  console.log(`[SalesHub] Backups en disco: ${BACKUPS_DIR}`);
  console.log(`[SalesHub] Datos del servidor: ${DATA_DIR}`);

  // --- Programación de sincronización de WooCommerce (W2/Fix E) -------------
  // Corre en el servidor, así que sincroniza aunque la aplicación esté cerrada.
  if (!WOO_SCHEDULER_ENABLED) {
    console.log('[SalesHub] Sincronización programada de WooCommerce: DESACTIVADA (WOO_SCHEDULER=off)');
    return;
  }

  const tick = async () => {
    try {
      const status = woo.getStatus();
      if (!status.configured || !status.autoSync) return;
      const result = await woo.runSyncIfDue();
      if (result.ran) {
        if (result.ok) {
          console.log(`[SalesHub] Sync programada OK: ${result.products} productos, ${result.customers} clientes`);
        } else {
          console.warn(`[SalesHub] Sync programada con error: ${result.error}`);
        }
      }
    } catch (err) {
      console.warn('[SalesHub] Error en el temporizador de sincronización:', err.message);
    }
  };

  console.log(`[SalesHub] Sincronización programada de WooCommerce: activa (chequeo cada ${WOO_TICK_MS / 1000}s)`);
  setTimeout(tick, 5_000); // primer chequeo poco después de arrancar
  setInterval(tick, WOO_TICK_MS).unref?.();
});
