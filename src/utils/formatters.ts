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
  const parts = cleaned.split(/[\/\.-]/);
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
