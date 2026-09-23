import { Sale } from '../types';

/**
 * Formats a number to Argentine Pesos / local currency ($ 1.250.000,00 or $ 1.250.000)
 */
export function formatCurrency(amount: number, showDecimals = true): string {
  if (isNaN(amount)) return '$ 0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format ISO YYYY-MM-DD date to DD/MM/YYYY for spreadsheet table display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/**
 * Parses user typed dates (DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY) into YYYY-MM-DD
 */
export function parseDateToISO(input: string): string {
  if (!input) return new Date().toISOString().split('T')[0];
  const cleaned = input.trim();
  
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
  const parts = cleaned.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      // DD MM YYYY -> YYYY-MM-DD
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    if (parts[0].length === 4) {
      // YYYY MM DD -> YYYY-MM-DD
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses an amount string written in Argentine/Spanish or US format into a number.
 * Handles thousands separators (dot or comma) and decimal separators correctly:
 *   "1.250,00" -> 1250   |   "1250,00" -> 1250   |   "1250.00" -> 1250
 *   "1.250.000" -> 1250000   |   "-1.250,50" -> -1250.5   |   "$ 1.250" -> 1250
 */
export function parseAmountString(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;

  const s = value.trim().replace(/[^\d.,-]/g, '');
  if (!s) return 0;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  let normalized: string;
  if (hasComma) {
    // Comma is the decimal separator; dots are thousands separators
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (hasDot && /\.\d{1,2}$/.test(s) && s.split('.').length === 2) {
    // US format "1250.00" (single dot, <=2 decimals)
    normalized = s;
  } else {
    // Dots are thousands separators (e.g. "1.250.000" or "1.250")
    normalized = s.replace(/\./g, '');
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export interface RecordValidationResult {
  isValid: boolean;
  missingFields: string[];
}

/**
  * Checks mandatory required fields for each sale record:
  * 1. fecha
  * 2. ncli (clienteId)
  * 3. producto
  * 4. precio (montoTotal > 0)
  * 5. met. pago (metodoPago)
  */
export function validateRequiredSaleFields(sale: Partial<Sale>): RecordValidationResult {
  const missingFields: string[] = [];

  if (!sale.fecha || !sale.fecha.trim()) {
    missingFields.push('Fecha');
  }

  if (!sale.clienteId || !sale.clienteId.trim()) {
    missingFields.push('NCLI');
  }

  const hasValidProduct = Array.isArray(sale.productos) && sale.productos.some(p => p.nombre && p.nombre.trim() !== '');
  if (!hasValidProduct) {
    missingFields.push('Producto');
  }

  if (sale.montoTotal === undefined || sale.montoTotal === null || sale.montoTotal <= 0) {
    missingFields.push('Precio');
  }

  if (!sale.metodoPago || !sale.metodoPago.trim()) {
    missingFields.push('Met. Pago');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Gets current month YYYY-MM
 */
export function getCurrentMonthISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

/**
 * Generates a collision-resistant sequential sale ID (e.g. V-2026-00123)
 * using a monotonic counter seeded from existing IDs plus timestamp/microsec.
 */
export function generateSaleId(existingIds: string[] = []): string {
  const year = new Date().getFullYear();
  let maxSeq = 0;
  const seen = new Set(existingIds);
  const re = new RegExp(`^V-${year}-(\\d+)$`);
  for (const id of seen) {
    const m = re.exec(id);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  let seq = maxSeq + 1;
  // Collision-avoidance backstop: if somehow the sequential candidate is taken
  // (e.g. stale ids from another year in the same batch), bump until free.
  let candidate = `V-${year}-${String(seq).padStart(5, '0')}`;
  while (seen.has(candidate) && seq < 999999) {
    seq += 1;
    candidate = `V-${year}-${String(seq).padStart(5, '0')}`;
  }
  // Extremely unlikely fallback: mix in a unique suffix if counter exhausted
  if (seq >= 999999) {
    candidate = `V-${year}-${Date.now().toString(36).toUpperCase()}`;
  }
  return candidate;
}

/**
 * Gets human readable month name in Spanish (e.g. "Julio 2026")
 */
export function getMonthYearLabel(monthIso?: string): string {
  const [yearStr, monthStr] = (monthIso || getCurrentMonthISO()).split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const date = new Date(year, monthIndex, 1);
  const monthName = date.toLocaleString('es-ES', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

/**
 * Helper to export array of Sales to CSV download
 */
export function exportSalesToCSV(sales: Sale[], filename = 'ventas_exportadas.csv') {
  if (typeof document === 'undefined') return;

  const escapeCsv = (value: unknown): string => {
    let str = value === null || value === undefined ? '' : String(value);
    // Sanitize CSV formula injection for spreadsheet software (Excel, LibreOffice)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'ID Venta',
    'Fecha',
    'ID Cliente',
    'Nombre Cliente',
    'Apellido Cliente',
    'Productos',
    'Monto Total',
    'Nº Factura',
    'Método de Pago',
    'Canal',
    'Método de Envío',
    'Nº Seguimiento',
    'Estado Envío',
    'Notas'
  ];

  const rows = sales.map((sale) => {
    const productSummary = sale.productos
      .map((p) => `${p.nombre} (x${p.cantidad})`)
      .join('; ');

    return [
      sale.id,
      formatDate(sale.fecha),
      sale.clienteId || '',
      sale.clienteNombre || '',
      sale.clienteApellido || '',
      productSummary,
      sale.montoTotal,
      sale.numeroFactura || '',
      sale.metodoPago || '',
      sale.canal || '',
      sale.metodoEnvio || '',
      sale.numeroSeguimiento || '',
      sale.estadoEnvio || '',
      sale.notas || ''
    ].map(escapeCsv).join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Normaliza nombres y apellidos a formato Capitalizado / Title Case.
 * Convierte el primer carácter de cada palabra a mayúscula y el resto a minúscula.
 * Remueve espacios redundantes y soporta nombres compuestos o con guión.
 */
export function normalizePersonName(name?: string | null): string {
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

/**
 * Lista oficial de las 24 provincias / jurisdicciones de la República Argentina.
 */
export const ARGENTINE_PROVINCES: string[] = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán'
];

export const DEFAULT_PROVINCE = 'Santa Fe';

/**
 * Tabla de códigos de provincia y abreviaturas tradicionales en la República Argentina
 * (ISO 3166-2:AR / AFIP / Códigos de patentes provinciales).
 */
export const ARGENTINE_PROVINCE_CODES: Record<string, string> = {
  'A': 'Salta',
  'B': 'Buenos Aires',
  'C': 'Ciudad Autónoma de Buenos Aires',
  'D': 'San Luis',
  'E': 'Entre Ríos',
  'F': 'La Rioja',
  'G': 'Santiago del Estero',
  'H': 'Chaco',
  'J': 'San Juan',
  'K': 'Catamarca',
  'L': 'La Pampa',
  'M': 'Mendoza',
  'N': 'Misiones',
  'P': 'Formosa',
  'Q': 'Neuquén',
  'R': 'Río Negro',
  'S': 'Santa Fe',
  'T': 'Tucumán',
  'U': 'Chubut',
  'V': 'Tierra del Fuego',
  'W': 'Corrientes',
  'X': 'Córdoba',
  'Y': 'Jujuy',
  'Z': 'Santa Cruz',
  'CABA': 'Ciudad Autónoma de Buenos Aires',
  'CF': 'Ciudad Autónoma de Buenos Aires',
  'BA': 'Buenos Aires',
  'SF': 'Santa Fe',
  'CBA': 'Córdoba',
  'ER': 'Entre Ríos'
};

/**
 * Resuelve una provincia a su nombre oficial completo a partir de un código, abreviatura
 * o nombre con distinta capitalización/tildes.
 */
export function resolveArgentineProvince(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw.trim();
  if (!cleaned) return '';

  // 1. Coincidencia por código de letra o abreviatura (ej: 'S' -> 'Santa Fe')
  const codeMatch = ARGENTINE_PROVINCE_CODES[cleaned.toUpperCase()];
  if (codeMatch) return codeMatch;

  // 2. Coincidencia en listado oficial (insensible a mayúsculas y acentos)
  const found = ARGENTINE_PROVINCES.find(
    (p) => p.localeCompare(cleaned, undefined, { sensitivity: 'accent' }) === 0 ||
           p.toLowerCase() === cleaned.toLowerCase()
  );
  if (found) return found;

  return normalizePersonName(cleaned);
}

/**
 * Desglosa una dirección que puede venir concatenada con comas
 * (ej: "TTE. LOZA 6900, SANTA FE, S" o "San Martín 1234, Rosario")
 * en calle/altura, localidad y provincia normalizada.
 */
export function parseCombinedAddress(
  rawAddress?: string | null,
  rawCity?: string | null,
  rawState?: string | null
): { direccion: string; localidad: string; provincia: string } {
  const address = rawAddress ? String(rawAddress).trim() : '';
  const city = rawCity ? String(rawCity).trim() : '';
  const state = rawState ? String(rawState).trim() : '';

  if (!address) {
    return {
      direccion: '',
      localidad: normalizePersonName(city),
      provincia: resolveArgentineProvince(state)
    };
  }

  // Si contiene comas que separan calle, localidad y provincia
  if (address.includes(',')) {
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return {
        direccion: normalizePersonName(parts[0]),
        localidad: normalizePersonName(city || parts[1]),
        provincia: resolveArgentineProvince(state || parts[2])
      };
    }
    if (parts.length === 2) {
      // Si la segunda parte es código o nombre de provincia (ej: "San Martín 500, S")
      const maybeProvince = ARGENTINE_PROVINCE_CODES[parts[1].toUpperCase()] ||
        ARGENTINE_PROVINCES.find(p => p.toLowerCase() === parts[1].toLowerCase());
      if (maybeProvince) {
        return {
          direccion: normalizePersonName(parts[0]),
          localidad: normalizePersonName(city),
          provincia: maybeProvince
        };
      }
      return {
        direccion: normalizePersonName(parts[0]),
        localidad: normalizePersonName(city || parts[1]),
        provincia: resolveArgentineProvince(state)
      };
    }
  }

  return {
    direccion: normalizePersonName(address),
    localidad: normalizePersonName(city),
    provincia: resolveArgentineProvince(state)
  };
}

/**
 * Desglosa la identidad del cliente proveniente de WooCommerce.
 * Si detecta un número de cliente al inicio del apellido o nombre (ej: "325 Prai Nestor"
 * o "3861 Morales Sergio"), extrae el número con formato CLI-[NÚMERO] y separa el
 * Apellido ("Prai") y el Nombre ("Nestor").
 */
export function parseCustomerIdentityFromWoo(
  rawFirstName?: string | null,
  rawLastName?: string | null,
  fallbackClienteId?: string
): { clienteId: string; nombre: string; apellido: string } {
  const first = rawFirstName ? String(rawFirstName).trim() : '';
  const last = rawLastName ? String(rawLastName).trim() : '';

  let detectedNumber = '';
  let cleanLast = last;
  let cleanFirst = first;

  // 1. Detectar si el apellido comienza con número (ej: "325 Prai Nestor" o "3861 Morales")
  const numPrefixLast = cleanLast.match(/^(\d+)\s+(.+)$/);
  if (numPrefixLast) {
    detectedNumber = numPrefixLast[1];
    cleanLast = numPrefixLast[2].trim();
  } else {
    // 2. O si el nombre comienza con número (ej: "325 Prai" con apellido "Nestor")
    const numPrefixFirst = cleanFirst.match(/^(\d+)\s+(.+)$/);
    if (numPrefixFirst) {
      detectedNumber = numPrefixFirst[1];
      cleanFirst = numPrefixFirst[2].trim();
    }
  }

  // 3. Si el apellido contiene todo (apellido y nombre) y first está vacío:
  //    ej: "Prai Nestor" -> apellido: "Prai", nombre: "Nestor"
  if (!cleanFirst && cleanLast.includes(' ')) {
    const parts = cleanLast.split(/\s+/);
    cleanLast = parts[0];
    cleanFirst = parts.slice(1).join(' ');
  } else if (!cleanLast && cleanFirst.includes(' ')) {
    // Si last está vacío y first contiene todo:
    const parts = cleanFirst.split(/\s+/);
    cleanLast = parts[0];
    cleanFirst = parts.slice(1).join(' ');
  }

  const clienteId = detectedNumber
    ? `CLI-${detectedNumber}`
    : (fallbackClienteId || 'CLI-0000');

  return {
    clienteId,
    nombre: normalizePersonName(cleanFirst),
    apellido: normalizePersonName(cleanLast)
  };
}
