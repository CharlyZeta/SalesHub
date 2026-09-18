/**
 * SalesHub - Servicio de sincronización de WooCommerce del lado del servidor.
 *
 * ¿Por qué existe? La sincronización programada vivía en el navegador, así que solo
 * corría con la aplicación abierta. Acá corre en el proceso del servidor (`server.js`),
 * lo que permite:
 *   - sincronizar con la app cerrada (programación real),
 *   - evitar CORS (la API de WooCommerce se consulta desde Node, no desde el navegador),
 *   - dejar un snapshot en disco que la app importa al abrirse.
 *
 * Persistencia (todo dentro de `dataDir`, que está en .gitignore):
 *   - `woo-config.json`   → URL + credenciales + política de sincronización
 *   - `woo-state.json`    → último resultado (fecha, error, conteos)
 *   - `woo-snapshot.json` → último catálogo/clientes descargados
 *
 * Nada de esto se expone con las credenciales: la API pública solo informa booleanos
 * (`hasCredentials`) y datos de estado.
 */
import fs from 'node:fs';
import path from 'node:path';

const CONFIG_FILE = 'woo-config.json';
const STATE_FILE = 'woo-state.json';
const SNAPSHOT_FILE = 'woo-snapshot.json';

/** Límite de seguridad de páginas a recorrer (100 productos por página). */
const MAX_PAGES = 50;

function readJson(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

/** Construye la URL de la API de WooCommerce con credenciales. */
function buildApiUrl(config, endpoint, params = {}) {
  let base = (config.url || '').trim();
  if (!base) throw new Error('URL de WooCommerce no configurada');
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/+$/, '');

  const url = new URL(`${base}/wp-json/wc/v3/${endpoint.replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, String(value));
  }
  if (config.consumerKey) url.searchParams.append('consumer_key', config.consumerKey);
  if (config.consumerSecret) url.searchParams.append('consumer_secret', config.consumerSecret);
  return url.toString();
}

/** Producto de WooCommerce → forma que consume la app (`CatalogProduct`). */
function mapProduct(item) {
  const categories = item.categories || [];
  const images = item.images || [];
  return {
    id: `woo-prod-${item.id}`,
    sku: item.sku || `WOO-${item.id}`,
    nombre: item.name || 'Producto WooCommerce',
    precio: Number.parseFloat(item.price || item.regular_price || '0') || 0,
    stock: item.stock_quantity ?? (item.stock_status === 'outofstock' ? 0 : 10),
    categoria: categories.length > 0 ? categories[0].name : 'E-commerce',
    origen: 'WooCommerce',
    imagenUrl: images.length > 0 ? images[0].src : undefined,
    estadoWoo: item.status || 'publish',
  };
}

/** Cliente de WooCommerce → forma que consume la app (`Customer`). */
function mapCustomer(item) {
  const billing = item.billing || {};
  const nombre = billing.first_name || item.first_name || 'Cliente';
  const apellido = billing.last_name || item.last_name || 'WooCommerce';
  const meta = Array.isArray(item.meta_data) ? item.meta_data : [];

  const docKeys = ['billing_dni', 'billing_cuit', 'dni', 'cuit', 'billing_cuit_dni', 'billing_doc', 'doc', 'documento'];
  const docMeta = meta.find((m) => docKeys.includes(String(m.key || '').toLowerCase()));
  const phoneMeta = meta.find((m) => ['billing_phone', 'phone', 'telefono', 'celular'].includes(String(m.key || '').toLowerCase()));

  return {
    id: `woo-cust-${item.id}`,
    clienteId: `WC-${item.id}`,
    nombre,
    apellido,
    razonSocialNombre: billing.company || `${nombre} ${apellido}`.trim(),
    dniCuit: docMeta?.value ? String(docMeta.value).trim() : '',
    telefono: billing.phone || (phoneMeta?.value ? String(phoneMeta.value).trim() : ''),
    email: item.email || billing.email || `cliente${item.id}@tienda.com`,
    direccion: billing.address_1 || '',
    localidad: billing.city || '',
    provincia: billing.state || '',
    canalHabitual: 'WooCommerce',
    origen: 'WooCommerce',
  };
}

export function createWooService(options = {}) {
  const dataDir = options.dataDir;
  const log = options.log || console;
  if (!dataDir) throw new Error('createWooService requiere dataDir');

  const configPath = path.join(dataDir, CONFIG_FILE);
  const statePath = path.join(dataDir, STATE_FILE);
  const snapshotPath = path.join(dataDir, SNAPSHOT_FILE);

  let running = false;

  const readConfig = () => readJson(configPath);
  const readState = () => readJson(statePath) || {};
  const writeState = (state) => writeJson(statePath, { ...readState(), ...state });

  /** Config pública: nunca expone las credenciales. */
  function getStatus() {
    const config = readConfig();
    const state = readState();
    const intervalHours = config?.intervalHours || 1;
    const lastSync = state.lastSync || null;
    const nextRunAt = lastSync ? new Date(new Date(lastSync).getTime() + intervalHours * 3600_000).toISOString() : null;

    return {
      configured: Boolean(config?.url),
      hasCredentials: Boolean(config?.consumerKey && config?.consumerSecret),
      autoSync: Boolean(config?.autoSync),
      intervalHours,
      url: config?.url || '',
      lastSync,
      nextRunAt,
      lastError: state.lastError || null,
      lastCounts: state.lastCounts || null,
      running,
      hasSnapshot: fs.existsSync(snapshotPath),
    };
  }

  /** Guarda la configuración enviada por la app. Devuelve el estado público. */
  function setConfig(input = {}) {
    const current = readConfig() || {};
    const next = {
      url: typeof input.url === 'string' ? input.url.trim() : current.url || '',
      consumerKey: typeof input.consumerKey === 'string' && input.consumerKey ? input.consumerKey : current.consumerKey || '',
      consumerSecret:
        typeof input.consumerSecret === 'string' && input.consumerSecret ? input.consumerSecret : current.consumerSecret || '',
      autoSync: input.autoSync === undefined ? Boolean(current.autoSync) : Boolean(input.autoSync),
      intervalHours: Number(input.intervalHours) > 0 ? Number(input.intervalHours) : current.intervalHours || 1,
    };
    writeJson(configPath, next);
    log.info?.('[woo] Configuración del servidor actualizada (URL + credenciales + programación)');
    return getStatus();
  }

  function clearConfig() {
    try {
      fs.rmSync(configPath, { force: true });
    } catch {
      /* ignore */
    }
    return getStatus();
  }

  function getSnapshot() {
    return readJson(snapshotPath);
  }

  async function fetchPaged(config, endpoint, mapper) {
    const items = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = buildApiUrl(config, endpoint, { per_page: 100, page, status: 'any' });
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 400) {
        // Reintento sin el filtro status=any (algunos hosts lo rechazan)
        const retryUrl = buildApiUrl(config, endpoint, { per_page: 100, page });
        const retry = await fetch(retryUrl, { headers: { Accept: 'application/json' } });
        if (!retry.ok) throw new Error(`WooCommerce ${endpoint} → HTTP ${retry.status}`);
        const data = await retry.json();
        if (!Array.isArray(data) || data.length === 0) break;
        items.push(...data.map(mapper));
        if (data.length < 100) break;
        continue;
      }
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.message) detail += `: ${String(body.message).replace(/<[^>]*>?/gm, '')}`;
        } catch {
          /* respuesta no JSON */
        }
        throw new Error(`WooCommerce ${endpoint} → ${detail}`);
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      items.push(...data.map(mapper));
      if (data.length < 100) break;
    }
    return items;
  }

  /**
   * Ejecuta una sincronización completa y deja el snapshot en disco.
   * @returns {Promise<{ ok: boolean, fetchedAt?: string, products?: number, customers?: number, error?: string }>}
   */
  async function runSync(reason = 'manual') {
    if (running) return { ok: false, error: 'Ya hay una sincronización en curso' };
    const config = readConfig();
    if (!config?.url) return { ok: false, error: 'WooCommerce no está configurado en el servidor' };
    if (!config.consumerKey || !config.consumerSecret) return { ok: false, error: 'Faltan las credenciales de WooCommerce' };

    running = true;
    try {
      log.info?.(`[woo] Sincronizando catálogo y clientes (${reason})...`);
      const products = await fetchPaged(config, 'products', mapProduct);
      const customers = await fetchPaged(config, 'customers', mapCustomer);

      const fetchedAt = new Date().toISOString();
      const snapshot = { fetchedAt, products, customers };
      writeJson(snapshotPath, snapshot);

      writeState({
        lastSync: fetchedAt,
        lastError: null,
        lastCounts: { products: products.length, customers: customers.length },
        lastReason: reason,
      });
      log.info?.(`[woo] Sincronización OK: ${products.length} productos, ${customers.length} clientes`);
      return { ok: true, fetchedAt, products: products.length, customers: customers.length };
    } catch (err) {
      const message = err?.message || String(err);
      writeState({ lastError: message, lastAttempt: new Date().toISOString() });
      log.warn?.(`[woo] Sincronización fallida: ${message}`);
      return { ok: false, error: message };
    } finally {
      running = false;
    }
  }

  /** Sincroniza solo si la programación lo pide (usado por el temporizador del servidor). */
  async function runSyncIfDue(now = Date.now()) {
    const config = readConfig();
    if (!config?.autoSync || !config.url) return { ran: false, reason: 'deshabilitado' };
    const state = readState();
    const intervalMs = (config.intervalHours || 1) * 3600_000;
    const last = state.lastSync ? new Date(state.lastSync).getTime() : 0;
    if (now - last < intervalMs) return { ran: false, reason: 'todavía no corresponde' };
    const result = await runSync('programada');
    return { ran: true, ...result };
  }

  return { getStatus, setConfig, clearConfig, getSnapshot, runSync, runSyncIfDue };
}

export default createWooService;
