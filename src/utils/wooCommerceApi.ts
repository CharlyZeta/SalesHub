import { CatalogProduct, Customer, WooCommerceConfig } from '../types';
import { addSystemLog } from './logger';
import { normalizePersonName } from './formatters';

/**
 * Fix D / W5: el catálogo de demostración está **desactivado por defecto**. Ante un fallo
 * de la API ya no se devuelven datos ficticios como si fueran reales (eso podía reemplazar
 * el catálogo de la tienda). Solo se activa explícitamente con `VITE_WOO_DEMO=true`,
 * pensado para demos sin conexión.
 */
const DEMO_DATA_ENABLED: boolean = import.meta.env?.VITE_WOO_DEMO === 'true';

/** Productos ficticios para demos offline (requiere VITE_WOO_DEMO=true). */
function getDemoCatalog(): CatalogProduct[] {
  const base = (id: string, sku: string, nombre: string, precio: number, stock: number, categoria: string, imagenUrl: string, estadoWoo = 'publish'): CatalogProduct => ({
    id,
    sku,
    nombre: `${nombre} (demo)`,
    precio,
    stock,
    categoria,
    origen: 'WooCommerce',
    imagenUrl,
    estadoWoo,
  });

  return [
    base('woo-prod-demo-1', 'WOO-DEMO-1', 'Heladera Comercial Doble Puerta Inox', 1850000, 4, 'Comercial', 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=150&auto=format&fit=crop&q=80'),
    base('woo-prod-demo-2', 'WOO-DEMO-2', 'Freezer Horizontal 500L', 920000, 0, 'Comercial', 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=150&auto=format&fit=crop&q=80'),
    base('woo-prod-demo-3', 'WOO-DEMO-3', 'Cocina Industrial 6 Hornallas + Horno', 1450000, 3, 'Equipamiento', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&auto=format&fit=crop&q=80'),
    base('woo-prod-demo-4', 'WOO-DEMO-4', 'Balanza Electrónica Digital 30kg', 280000, 12, 'Accesorios', 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=150&auto=format&fit=crop&q=80'),
    base('woo-prod-demo-5', 'WOO-DEMO-5', 'Cortadora de Fiambre Hoja 300mm', 680000, 2, 'Maquinaria', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=80', 'draft'),
  ];
}

/** Clientes ficticios para demos offline (requiere VITE_WOO_DEMO=true). */
function getDemoCustomers(): Customer[] {
  return [
    {
      id: 'woo-cust-demo-1',
      clienteId: 'WC-DEMO-1',
      nombre: 'Gastronomía',
      apellido: 'Rosario',
      razonSocialNombre: 'Gastronomía Rosario S.A. (demo)',
      dniCuit: '30-71122334-8',
      telefono: '0341-4221100',
      email: 'demo.ventas@gastronomiarosario.com',
      direccion: 'Av. Pellegrini 1450',
      localidad: 'Rosario',
      provincia: 'Santa Fe',
      canalHabitual: 'WooCommerce',
      origen: 'WooCommerce',
    },
    {
      id: 'woo-cust-demo-2',
      clienteId: 'WC-DEMO-2',
      nombre: 'Panadería',
      apellido: 'La Estación',
      razonSocialNombre: 'Panadería La Estación (demo)',
      dniCuit: '20-28990112-4',
      telefono: '0342-4558822',
      email: 'demo.estacion@panaderia.com',
      direccion: 'Bv. Gálvez 1820',
      localidad: 'Santa Fe',
      provincia: 'Santa Fe',
      canalHabitual: 'WooCommerce',
      origen: 'WooCommerce',
    },
  ];
}

export interface WooProductDTO {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price?: string;
  stock_quantity?: number;
  stock_status?: string;
  status?: string; // 'publish', 'draft', 'private', 'pending', etc.
  catalog_visibility?: string;
  categories?: Array<{ id: number; name: string }>;
  images?: Array<{ id?: number; src: string; name?: string }>;
}

export interface WooCustomerDTO {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    phone?: string;
    email?: string;
  };
  meta_data?: Array<{
    id?: number;
    key: string;
    value: any;
  }>;
}

export const buildWooApiUrl = (baseUrl: string, endpoint: string, ck?: string, cs?: string): string => {
  let cleaned = baseUrl.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  cleaned = cleaned.replace(/\/+$/, '');

  const url = new URL(`${cleaned}/wp-json/wc/v3/${endpoint.replace(/^\/+/, '')}`);
  if (ck && cs) {
    url.searchParams.append('consumer_key', ck.trim());
    url.searchParams.append('consumer_secret', cs.trim());
  }
  return url.toString();
};

export const transformWooProduct = (item: WooProductDTO): CatalogProduct => {
  const imageUrl = item.images && item.images.length > 0 ? item.images[0].src : undefined;

  return {
    id: `woo-prod-${item.id}`,
    sku: item.sku || `WOO-${item.id}`,
    nombre: item.name || 'Producto WooCommerce',
    precio: parseFloat(item.price || item.regular_price || '0') || 0,
    stock: item.stock_quantity ?? (item.stock_status === 'outofstock' ? 0 : 10),
    categoria: item.categories && item.categories.length > 0 ? item.categories[0].name : 'E-commerce',
    origen: 'WooCommerce',
    imagenUrl: imageUrl,
    estadoWoo: item.status || 'publish'
  };
};

export const transformWooCustomer = (item: WooCustomerDTO): Customer => {
  const billing = item.billing || {};
  const rawNombre = billing.first_name || item.first_name || 'Cliente';
  const rawApellido = billing.last_name || item.last_name || 'WooCommerce';
  const nombre = normalizePersonName(rawNombre);
  const apellido = normalizePersonName(rawApellido);

  // Extract DNI/CUIT from WooCommerce meta_data fields if present
  let dniCuit = '';
  const dniKeys = [
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

  if (item.meta_data && Array.isArray(item.meta_data)) {
    const docMeta = item.meta_data.find(m => 
      m && m.key && dniKeys.includes(String(m.key).trim().toLowerCase())
    );
    if (docMeta && docMeta.value) {
      dniCuit = String(docMeta.value).trim();
    }
  }

  // Heurística alternativa: si no vino en meta_data, revisar si el DNI/CUIT vino en billing.company
  if (!dniCuit && billing.company) {
    const comp = String(billing.company).trim();
    if (/^(DNI|CUIT|CUIL)?\s*[\d.-]{7,13}$/i.test(comp)) {
      dniCuit = comp.replace(/^(DNI|CUIT|CUIL)\s*/i, '').trim();
    }
  }

  const razonSocial = billing.company && billing.company.trim() !== dniCuit
    ? billing.company.trim()
    : `${nombre} ${apellido}`.trim();

  // Extract phone number from WooCommerce meta_data fields if billing.phone is empty
  let telefono = billing.phone || '';
  if (!telefono && item.meta_data && Array.isArray(item.meta_data)) {
    const phoneMeta = item.meta_data.find(m => 
      m && m.key && ['billing_phone', 'phone', 'telefono', 'celular', 'billing_cellphone'].includes(String(m.key).trim().toLowerCase())
    );
    if (phoneMeta && phoneMeta.value) {
      telefono = String(phoneMeta.value).trim();
    }
  }

  return {
    id: `woo-cust-${item.id}`,
    clienteId: `WC-${item.id}`,
    nombre: nombre,
    apellido: apellido,
    razonSocialNombre: razonSocial,
    dniCuit: dniCuit,
    telefono: telefono,
    email: item.email || billing.email || `cliente${item.id}@tienda.com`,
    direccion: billing.address_1 || '',
    localidad: billing.city || '',
    provincia: billing.state || '',
    codigoPostal: billing.postcode ? String(billing.postcode).trim() : '',
    canalHabitual: 'WooCommerce',
    origen: 'WooCommerce'
  };
};

export const fetchWithCorsProxy = async (targetUrl: string): Promise<Response> => {
  // Security: third-party CORS proxies (corsproxy.io, allorigins.win) are NOT
  // used because the WooCommerce consumer_key/consumer_secret travel as URL
  // query params and would be exposed to those third parties. The API is only
  // reachable via direct fetch. If the browser blocks it (CORS), the caller
  // must route through a same-origin reverse proxy (Nginx) — see README.
  try {
    const response = await fetch(targetUrl, { headers: { Accept: 'application/json' } });
    if (response.ok) return response;
    // If response was received but not OK (e.g., 401, 403, 404), return it so caller can read status
    if (response.status >= 400 && response.status < 500) return response;
  } catch (_err) {
    addSystemLog('WARN', 'WooCommerce', 'Bloqueo de red/CORS en fetch directo. Configura un proxy reverso same-origin (Nginx) para sincronizar desde el navegador.');
  }

  // Final fallback: attempt direct fetch to return/throw exact error
  return await fetch(targetUrl, { headers: { Accept: 'application/json' } });
};

export const fetchWooCommerceProducts = async (config: WooCommerceConfig): Promise<CatalogProduct[]> => {
  addSystemLog('API', 'WooCommerce', `Iniciando consulta paginada TOTAL de productos desde ${config.url}`);
  
  if (!config.url || config.url.trim() === '') {
    addSystemLog('WARN', 'WooCommerce', 'Consulta cancelada: URL de WooCommerce vacía');
    throw new Error('URL de WooCommerce requerida');
  }

  let allProducts: CatalogProduct[] = [];
  let page = 1;
  let perPage = 100;
  let hasMore = true;
  let useStatusAny = true; // Try with status=any first

  try {
    while (hasMore && page <= 50) { // Limit to 50 pages (5000 products) max safety
      let endpoint = useStatusAny 
        ? `products?status=any&per_page=${perPage}&page=${page}`
        : `products?per_page=${perPage}&page=${page}`;
      
      let endpointUrl = buildWooApiUrl(config.url, endpoint, config.consumerKey, config.consumerSecret);
      let response = await fetchWithCorsProxy(endpointUrl);

      // If HTTP 400/403 occurs on page 1, retry with cleaner query params
      if (!response.ok && page === 1 && (response.status === 400 || response.status === 403)) {
        if (useStatusAny) {
          addSystemLog('WARN', 'WooCommerce', `Respuesta HTTP ${response.status} con 'status=any'. Reintentando sin filtro de status...`);
          useStatusAny = false;
          endpoint = `products?per_page=${perPage}&page=${page}`;
          endpointUrl = buildWooApiUrl(config.url, endpoint, config.consumerKey, config.consumerSecret);
          response = await fetchWithCorsProxy(endpointUrl);
        }

        // If still 400 with per_page=100, try smaller per_page=50
        if (!response.ok && response.status === 400) {
          addSystemLog('WARN', 'WooCommerce', `Respuesta HTTP 400 con per_page=100. Reintentando con per_page=50...`);
          perPage = 50;
          endpoint = `products?per_page=${perPage}&page=${page}`;
          endpointUrl = buildWooApiUrl(config.url, endpoint, config.consumerKey, config.consumerSecret);
          response = await fetchWithCorsProxy(endpointUrl);
        }
      }

      if (!response.ok) {
        if (page === 1) {
          let errorDetail = `HTTP ${response.status}`;
          try {
            const errJson = await response.clone().json();
            if (errJson && errJson.message) {
              errorDetail += `: ${errJson.message.replace(/<[^>]*>?/gm, '')}`;
            }
          } catch (_) {
            // ignore non-JSON body
          }

          if (response.status === 401) {
            throw new Error(`Error HTTP 401: Claves API (Consumer Key / Consumer Secret) no autorizadas. (${errorDetail})`);
          } else if (response.status === 404) {
            throw new Error('Error HTTP 404: Ruta de WooCommerce no encontrada. Verifica la URL de tu tienda');
          } else if (response.status === 400) {
            throw new Error(`Error HTTP 400 Bad Request: La API de WooCommerce rechazó la consulta. (${errorDetail})`);
          } else {
            throw new Error(`Error en API WooCommerce: ${errorDetail}`);
          }
        } else {
          // Beyond last page
          break;
        }
      }

      const data: WooProductDTO[] = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
        break;
      }

      const transformed = data.map(transformWooProduct);
      allProducts = [...allProducts, ...transformed];

      const totalPagesHeader = (response.headers && typeof response.headers.get === 'function')
        ? (response.headers.get('x-wp-totalpages') || response.headers.get('X-WP-TotalPages'))
        : null;
      if (totalPagesHeader) {
        const totalPages = parseInt(totalPagesHeader, 10);
        if (page >= totalPages) {
          hasMore = false;
        }
      }

      if (data.length < perPage) {
        hasMore = false;
      }

      page++;
    }

    addSystemLog('SYNC', 'WooCommerce', `Sincronizados ${allProducts.length} productos en total (${page - 1} páginas de catálogo) desde WooCommerce`, { count: allProducts.length });
    return allProducts;
  } catch (error: any) {
    addSystemLog('ERROR', 'WooCommerce', `Fallo en consulta de productos reales: ${error.message}`);

    // Fix D / W5: el catálogo de demostración YA NO se devuelve como si la sincronización
    // hubiera sido exitosa. Antes, un fallo de red con una URL "demo"/"ejemplo" o sin
    // credenciales devolvía productos ficticios y la app los tomaba como reales (llegando a
    // reemplazar el catálogo). Ahora el error se propaga y queda registrado.
    if (DEMO_DATA_ENABLED && (config.url.includes('ejemplo') || config.url.includes('demo') || !config.consumerKey)) {
      addSystemLog(
        'WARN',
        'WooCommerce',
        'Datos de demostración habilitados explícitamente (VITE_WOO_DEMO=true): se devuelve catálogo simulado. NO es una sincronización real.'
      );
      return getDemoCatalog();
    }

    throw error;
  }
};

export const fetchWooCommerceCustomers = async (config: WooCommerceConfig): Promise<Customer[]> => {
  addSystemLog('API', 'WooCommerce', `Iniciando consulta paginada de clientes desde ${config.url}`);

  if (!config.url || config.url.trim() === '') {
    addSystemLog('WARN', 'WooCommerce', 'Consulta cancelada: URL de WooCommerce vacía');
    throw new Error('URL de WooCommerce requerida');
  }

  let allCustomers: Customer[] = [];
  let page = 1;
  let perPage = 100;
  let hasMore = true;

  try {
    while (hasMore && page <= 50) {
      let endpoint = `customers?per_page=${perPage}&page=${page}`;
      let endpointUrl = buildWooApiUrl(config.url, endpoint, config.consumerKey, config.consumerSecret);

      let response = await fetchWithCorsProxy(endpointUrl);

      // Retry with per_page=50 if 400 on page 1
      if (!response.ok && page === 1 && response.status === 400) {
        addSystemLog('WARN', 'WooCommerce', `Respuesta HTTP 400 en clientes con per_page=100. Reintentando con per_page=50...`);
        perPage = 50;
        endpoint = `customers?per_page=${perPage}&page=${page}`;
        endpointUrl = buildWooApiUrl(config.url, endpoint, config.consumerKey, config.consumerSecret);
        response = await fetchWithCorsProxy(endpointUrl);
      }

      if (!response.ok) {
        if (page === 1) {
          let errorDetail = `HTTP ${response.status}`;
          try {
            const errJson = await response.clone().json();
            if (errJson && errJson.message) {
              errorDetail += `: ${errJson.message.replace(/<[^>]*>?/gm, '')}`;
            }
          } catch (_) {
            // ignore non-JSON body
          }

          if (response.status === 401) {
            throw new Error(`Error HTTP 401: Claves API (Consumer Key / Consumer Secret) no autorizadas. (${errorDetail})`);
          } else if (response.status === 404) {
            throw new Error('Error HTTP 404: Ruta de WooCommerce no encontrada. Verifica la URL de tu tienda');
          } else if (response.status === 400) {
            throw new Error(`Error HTTP 400 Bad Request: La API de WooCommerce rechazó la consulta. (${errorDetail})`);
          } else {
            throw new Error(`Error en API WooCommerce: ${errorDetail}`);
          }
        } else {
          break;
        }
      }

      const data: WooCustomerDTO[] = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
        break;
      }

      const transformed = data.map(transformWooCustomer);
      allCustomers = [...allCustomers, ...transformed];

      const totalPagesHeader = (response.headers && typeof response.headers.get === 'function')
        ? (response.headers.get('x-wp-totalpages') || response.headers.get('X-WP-TotalPages'))
        : null;
      if (totalPagesHeader) {
        const totalPages = parseInt(totalPagesHeader, 10);
        if (page >= totalPages) {
          hasMore = false;
        }
      }

      if (data.length < perPage) {
        hasMore = false;
      }

      page++;
    }

    addSystemLog('SYNC', 'WooCommerce', `Sincronizados ${allCustomers.length} clientes en total desde la API de WooCommerce`, { count: allCustomers.length });
    return allCustomers;
  } catch (error: any) {
    addSystemLog('ERROR', 'WooCommerce', `Fallo en consulta de clientes reales: ${error.message}`);

    // Fix D / W5: igual que con el catálogo, los clientes de demostración solo se devuelven
    // si el modo demo está habilitado explícitamente; si no, el error se propaga.
    if (DEMO_DATA_ENABLED && (config.url.includes('ejemplo') || config.url.includes('demo') || !config.consumerKey)) {
      addSystemLog(
        'WARN',
        'WooCommerce',
        'Datos de demostración habilitados explícitamente (VITE_WOO_DEMO=true): se devuelven clientes simulados. NO es una sincronización real.'
      );
      return getDemoCustomers();
    }

    throw error;
  }
};
