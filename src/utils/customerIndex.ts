import { Sale, Customer } from '../types';

export interface CustomerSalesSummary {
  count: number;
  total: number;
  sales: Sale[];
}

/**
 * Pre-indexa las ventas por `clienteId` en un Map O(1).
 * Convierte un escaneo de O(N*M) en un índice O(M) de consulta instantánea.
 */
export function buildSalesCustomerIndex(sales: Sale[]): Map<string, CustomerSalesSummary> {
  const map = new Map<string, CustomerSalesSummary>();
  if (!Array.isArray(sales)) return map;

  for (let i = 0; i < sales.length; i++) {
    const s = sales[i];
    if (!s || !s.clienteId) continue;

    let entry = map.get(s.clienteId);
    if (!entry) {
      entry = { count: 0, total: 0, sales: [] };
      map.set(s.clienteId, entry);
    }
    entry.count += 1;
    entry.total += typeof s.montoTotal === 'number' ? s.montoTotal : 0;
    entry.sales.push(s);
  }

  return map;
}

/**
 * Filtra clientes de forma no bloqueante y segura ante campos nulos.
 */
export function filterCustomers(customers: Customer[], rawQuery: string): Customer[] {
  if (!Array.isArray(customers)) return [];
  const q = rawQuery.toLowerCase().trim();
  if (!q) return customers;

  return customers.filter((c) => {
    if (!c) return false;
    return (
      (c.nombre && c.nombre.toLowerCase().includes(q)) ||
      (c.apellido && c.apellido.toLowerCase().includes(q)) ||
      (c.clienteId && c.clienteId.toLowerCase().includes(q)) ||
      (c.dniCuit && c.dniCuit.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.toLowerCase().includes(q))
    );
  });
}
