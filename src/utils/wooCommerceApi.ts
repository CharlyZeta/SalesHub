import { CatalogProduct, Customer, WooCommerceConfig } from '../types';
import { addSystemLog } from './logger';

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
  const nombre = billing.first_name || item.first_name || 'Cliente';
  const apellido = billing.last_name || item.last_name || 'WooCommerce';
  const razonSocial = billing.company || `${nombre} ${apellido}`.trim();
  const address = [billing.address_1, billing.city, billing.state].filter(Boolean).join(', ');

  return {
    id: `woo-cust-${item.id}`,
    clienteId: `WC-${item.id}`,
    nombre: nombre,
    apellido: apellido,
    razonSocialNombre: razonSocial,
    dniCuit: '',
    telefono: billing.phone || '',
    email: item.email || billing.email || `cliente${item.id}@tienda.com`,
    direccion: address || '',
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
  } catch (err) {
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

    // If credentials/URL are explicit test placeholders or user requested, provide fallback demo catalog
    if (config.url.includes('ejemplo') || config.url.includes('demo') || !config.consumerKey) {
      addSystemLog('WARN', 'WooCommerce', 'Usando catálogo de demostración simulado por configuración de prueba');
      return [
        { 
          id: 'woo-p-101', 
          sku: 'WOO-EXT-101', 
          nombre: 'Heladera Comercial Doble Puerta Inox (Demo)', 
          precio: 1850000, 
          stock: 4, 
          categoria: 'Comercial', 
          origen: 'WooCommerce',
          imagenUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=150&auto=format&fit=crop&q=80',
          estadoWoo: 'publish'
        },
        { 
          id: 'woo-p-102', 
          sku: 'WOO-EXT-102', 
          nombre: 'Freezer Horizontal 500L Anafes Pro (Demo)', 
          precio: 920000, 
          stock: 0, 
          categoria: 'Comercial', 
          origen: 'WooCommerce',
          imagenUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=150&auto=format&fit=crop&q=80',
          estadoWoo: 'publish'
        },
        { 
          id: 'woo-p-103', 
          sku: 'WOO-EXT-103', 
          nombre: 'Cocina Industrial 6 Hornallas + Horno (Demo)', 
          precio: 1450000, 
          stock: 3, 
          categoria: 'Equipamiento', 
          origen: 'WooCommerce',
          imagenUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&auto=format&fit=crop&q=80',
          estadoWoo: 'publish'
        },
        { 
          id: 'woo-p-104', 
          sku: 'WOO-EXT-104', 
          nombre: 'Balanza Electrónica Digital 30kg (Demo)', 
          precio: 280000, 
          stock: 12, 
          categoria: 'Accesorios', 
          origen: 'WooCommerce',
          imagenUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=150&auto=format&fit=crop&q=80',
          estadoWoo: 'publish'
        },
        { 
          id: 'woo-p-105', 
          sku: 'WOO-EXT-105', 
          nombre: 'Cortadora de Fiambre Hoja 300mm (Demo)', 
          precio: 680000, 
          stock: 2, 
          categoria: 'Maquinaria', 
          origen: 'WooCommerce',
          imagenUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=80',
          estadoWoo: 'draft'
        }
      ];
    }

    // Throw actual error to UI so user knows why sync failed
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

    if (config.url.includes('ejemplo') || config.url.includes('demo') || !config.consumerKey) {
      return [
        {
          id: 'woo-c-201',
          clienteId: 'WC-201',
          nombre: 'Gastronomía Rosario',
          apellido: 'Gómez',
          razonSocialNombre: 'Gastronomía Rosario S.A.',
          dniCuit: '30-71122334-8',
          telefono: '0341-4221100',
          email: 'ventas@gastronomiarosario.com',
          direccion: 'Av. Pellegrini 1450, Rosario, Santa Fe',
          canalHabitual: 'WooCommerce',
          origen: 'WooCommerce'
        },
        {
          id: 'woo-c-202',
          clienteId: 'WC-202',
          nombre: 'Panadería La Estación',
          apellido: 'Rodríguez',
          razonSocialNombre: 'Panadería La Estación',
          dniCuit: '20-28990112-4',
          telefono: '0342-4558822',
          email: 'estacion_panaderia@gmail.com',
          direccion: 'Bv. Gálvez 1820, Santa Fe',
          canalHabitual: 'WooCommerce',
          origen: 'WooCommerce'
        }
      ];
    }

    throw error;
  }
};
