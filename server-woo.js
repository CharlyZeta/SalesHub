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

/** Normaliza nombres y apellidos a formato Capitalizado / Title Case. */
function normalizePersonName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      if (!word) return '';
      if (word.includes('-')) {
        return word
          .split('-')
          .map((sub) => (sub ? sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase() : ''))
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Cliente de WooCommerce → forma que consume la app (`Customer`). */
function mapCustomer(item) {
  const billing = item.billing || {};
  const rawNombre = billing.first_name || item.first_name || 'Cliente';
  const rawApellido = billing.last_name || item.last_name || 'WooCommerce';
  const nombre = normalizePersonName(rawNombre);
  const apellido = normalizePersonName(rawApellido);
  const meta = Array.isArray(item.meta_data) ? item.meta_data : [];

  const docKeys = [
    'billing_dni', '_billing_dni',
    'billing_cuit', '_billing_cuit',
    'billing_cuit_dni', '_billing_cuit_dni',
    'billing_cuit_cuil', '_billing_cuit_cuil',
    'dni', 'cuit', 'cuil',
    'billing_doc', '_billing_doc', 'doc',
    'documento', '_documento', 'billing_documento', '_billing_documento',
    'billing_cedula', 'cedula',
    'billing_identification_number', '_billing_identification_number',
    'identification_number', 'numero_documento', 'nro_documento', 'num_documento',
    'billing_nro_doc', '_billing_nro_doc'
  ];

  let dniCuit = '';
  const docMeta = meta.find((m) => m && m.key && docKeys.includes(String(m.key).trim().toLowerCase()));
  if (docMeta && docMeta.value) {
    dniCuit = String(docMeta.value).trim();
  }

  // Heurística alternativa: si no vino en meta_data, revisar si el DNI/CUIT vino en billing.company
  if (!dniCuit && billing.company) {
    const comp = String(billing.company).trim();
    if (/^(DNI|CUIT|CUIL)?\s*[\d.-]{7,13}$/i.test(comp)) {
      dniCuit = comp.replace(/^(DNI|CUIT|CUIL)\s*/i, '').trim();
    }
  }

  const phoneMeta = meta.find((m) => 
    m && m.key && ['billing_phone', 'phone', 'telefono', 'celular', 'billing_cellphone'].includes(String(m.key).trim().toLowerCase())
  );

  const razonSocial = billing.company && billing.company.trim() !== dniCuit
    ? billing.company.trim()
    : `${nombre} ${apellido}`.trim();

  return {
    id: `woo-cust-${item.id}`,
    clienteId: `WC-${item.id}`,
    nombre,
    apellido,
    razonSocialNombre: razonSocial,
    dniCuit,
    telefono: billing.phone || (phoneMeta?.value ? String(phoneMeta.value).trim() : ''),
    email: item.email || billing.email || `cliente${item.id}@tienda.com`,
    direccion: billing.address_1 || '',
    localidad: billing.city || '',
    provincia: billing.state || '',
    codigoPostal: billing.postcode ? String(billing.postcode).trim() : '',
    canalHabitual: 'WooCommerce',
    origen: 'WooCommerce',
  };
}

/** Normaliza una clave de comparación (SKU o nombre). */
function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * Combina el catálogo local con el descargado de WooCommerce **sin perder datos**
 * (Fix D / W5). Reglas:
 *  - Producto de WooCommerce: si coincide por SKU (o nombre) con uno existente, se
 *    actualizan precio/stock/nombre **conservando el `id` local**; si no existe, se agrega.
 *  - Producto manual/local: se conserva siempre, incluso si ya no está en la tienda.
 *
 * @returns {{ merged: any[], wooCount: number, localKept: number, updated: number, added: number }}
 */
export function mergeCatalog(localProducts = [], wooProducts = []) {
  const bySku = new Map();
  const byName = new Map();
  const index = (product) => {
    if (product.sku) bySku.set(normalizeKey(product.sku), product);
    if (product.nombre) byName.set(normalizeKey(product.nombre), product);
  };

  const merged = [];
  for (const local of Array.isArray(localProducts) ? localProducts : []) {
    const copy = { ...local };
    merged.push(copy);
    index(copy);
  }

  let updated = 0;
  let added = 0;

  for (const woo of Array.isArray(wooProducts) ? wooProducts : []) {
    const existing = (woo.sku && bySku.get(normalizeKey(woo.sku))) || byName.get(normalizeKey(woo.nombre));
    if (existing) {
      existing.precio = woo.precio;
      existing.stock = woo.stock;
      existing.nombre = woo.nombre || existing.nombre;
      if (woo.categoria) existing.categoria = woo.categoria;
      if (woo.imagenUrl) existing.imagenUrl = woo.imagenUrl;
      existing.estadoWoo = woo.estadoWoo || existing.estadoWoo;
      updated++;
    } else {
      const product = { ...woo };
      merged.push(product);
      index(product);
      added++;
    }
  }

  const wooCountRaw = (Array.isArray(wooProducts) ? wooProducts : []).length;
  // Locales conservados: cuántos de los productos locales siguen presentes en el resultado.
  const localKept = (Array.isArray(localProducts) ? localProducts : []).length;
  return { merged, wooCount: wooCountRaw, localKept, updated, added };
}

/**
 * Combina clientes locales con los de la tienda conservando el historial de compras
 * (`totalCompras`, `cantidadPedidos`, `ultimaCompra`) y agregando solo los nuevos.
 */
export function mergeCustomers(localCustomers = [], wooCustomers = []) {
  const byId = new Map();
  const byEmail = new Map();
  const index = (customer) => {
    if (customer.clienteId) byId.set(normalizeKey(customer.clienteId), customer);
    if (customer.email) byEmail.set(normalizeKey(customer.email), customer);
  };

  const merged = [];
  for (const local of Array.isArray(localCustomers) ? localCustomers : []) {
    const copy = { ...local };
    merged.push(copy);
    index(copy);
  }

  let added = 0;
  let updated = 0;

  for (const woo of Array.isArray(wooCustomers) ? wooCustomers : []) {
    const existing = (woo.clienteId && byId.get(normalizeKey(woo.clienteId))) || byEmail.get(normalizeKey(woo.email));
    if (existing) {
      existing.nombre = woo.nombre || existing.nombre;
      existing.apellido = woo.apellido || existing.apellido;
      existing.telefono = woo.telefono || existing.telefono;
      existing.direccion = woo.direccion || existing.direccion;
      existing.localidad = woo.localidad || existing.localidad;
      existing.provincia = woo.provincia || existing.provincia;
      updated++;
    } else {
      const customer = { ...woo };
      merged.push(customer);
      index(customer);
      added++;
    }
  }

  return { merged, added, updated };
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
   * Ejecuta una sincronización completa y guarda el snapshot en disco.
   *
   * Fix D / W5: si la app envía su catálogo/clientes locales (`localData`), el snapshot
   * guarda **las listas combinadas** — así una sincronización nunca borra productos
   * manuales ni el historial de compras de los clientes. Sin datos locales, el snapshot
   * contiene solo lo descargado de la tienda.
   *
   * @param {{ reason?: string, localData?: { products?: any[], customers?: any[] } }} [options]
   * @returns {Promise<{ ok: boolean, fetchedAt?: string, products?: number, customers?: number, error?: string, counts?: any }>}
   */
  async function runSync(options = {}) {
    const { reason = 'manual', localData = {} } = options;
    if (running) return { ok: false, error: 'Ya hay una sincronización en curso' };
    const config = readConfig();
    if (!config?.url) return { ok: false, error: 'WooCommerce no está configurado en el servidor' };
    if (!config.consumerKey || !config.consumerSecret) return { ok: false, error: 'Faltan las credenciales de WooCommerce' };

    running = true;
    try {
      log.info?.(`[woo] Sincronizando catálogo y clientes (${reason})...`);
      const wooProducts = await fetchPaged(config, 'products', mapProduct);
      const wooCustomers = await fetchPaged(config, 'customers', mapCustomer);

      const catalog = mergeCatalog(localData.products, wooProducts);
      const directory = mergeCustomers(localData.customers, wooCustomers);

      const fetchedAt = new Date().toISOString();
      const snapshot = {
        fetchedAt,
        products: catalog.merged,
        customers: directory.merged,
        wooCounts: { products: catalog.wooCount, customers: wooCustomers.length },
        merge: {
          productsAdded: catalog.added,
          productsUpdated: catalog.updated,
          productsLocalKept: catalog.localKept,
          customersAdded: directory.added,
          customersUpdated: directory.updated,
        },
      };
      writeJson(snapshotPath, snapshot);

      writeState({
        lastSync: fetchedAt,
        lastError: null,
        lastCounts: { products: catalog.merged.length, customers: directory.merged.length },
        lastReason: reason,
        failures: 0,
      });
      log.info?.(
        `[woo] Sincronización OK: ${catalog.wooCount} productos de la tienda ` +
          `(+${catalog.added} nuevos, ${catalog.updated} actualizados, ${catalog.localKept} locales conservados) · ` +
          `${wooCustomers.length} clientes de la tienda (+${directory.added} nuevos)`
      );
      return {
        ok: true,
        fetchedAt,
        products: catalog.merged.length,
        customers: directory.merged.length,
        counts: { products: catalog.wooCount, customers: wooCustomers.length },
        merge: snapshot.merge,
      };
    } catch (err) {
      const message = err?.message || String(err);
      writeState({
        lastError: message,
        lastAttempt: new Date().toISOString(),
        failures: (readState().failures || 0) + 1,
      });
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

    // Si viene fallando, se reintenta con backoff (1, 2, 4, ... 30 min) en lugar de
    // golpear el endpoint roto en cada tick.
    const failures = state.failures || 0;
    if (failures > 0) {
      const backoffMs = Math.min(60_000 * 2 ** (failures - 1), 30 * 60_000);
      const lastAttempt = state.lastAttempt ? new Date(state.lastAttempt).getTime() : 0;
      if (now - lastAttempt < backoffMs) {
        return { ran: false, reason: `backoff activo (${Math.round(backoffMs / 60000)} min)` };
      }
    } else if (now - last < intervalMs) {
      return { ran: false, reason: 'todavía no corresponde' };
    }

    const result = await runSync({ reason: 'programada' });
    return { ran: true, ...result };
  }

  return { getStatus, setConfig, clearConfig, getSnapshot, runSync, runSyncIfDue };
}

export default createWooService;
