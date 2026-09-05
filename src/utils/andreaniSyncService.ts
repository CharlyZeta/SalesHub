import { mapAndreaniTrackingStatus, isTerminalStatus } from './andreaniStatusMapper';
import { ShippingStatus } from '../types';

export interface AndreaniTrackResult {
  tracking_number: string;
  tracking_status: string;
  canonical_status: ShippingStatus;
  status: string;
  delivery_mode?: string;
  sales_order_number?: string;
  pedido_id?: string;
  events?: any[];
  updated_at: string;
}

interface CacheEntry {
  data: AndreaniTrackResult;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 1000; // 60 segundos (idéntico al plugin oficial)
const trackingCache = new Map<string, CacheEntry>();

/**
 * Consulta y sincroniza en lote números de seguimiento de Andreani.
 * Respeta una caché en memoria de 60s para no sobrecargar el servidor en re-renders.
 */
export async function fetchAndreaniTrackingsBulk(
  trackingNumbers: string[],
  andreaniHash: string,
  force = false
): Promise<AndreaniTrackResult[]> {
  if (!andreaniHash || !trackingNumbers || trackingNumbers.length === 0) {
    return [];
  }

  const now = Date.now();
  const cleanNumbers = Array.from(new Set(trackingNumbers.map(n => n.trim()))).filter(Boolean);

  const results: AndreaniTrackResult[] = [];
  const toFetch: string[] = [];

  for (const num of cleanNumbers) {
    const cached = trackingCache.get(num);
    if (!force && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      results.push(cached.data);
    } else {
      toFetch.push(num);
    }
  }

  if (toFetch.length === 0) {
    return results;
  }

  const response = await fetch('/api/tracking/andreani/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-andreani-hash': andreaniHash
    },
    body: JSON.stringify({ trackingNumbers: toFetch })
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errMsg = errData.error;
      }
    } catch (_) {}
    throw new Error(`Error en servidor Andreani: ${errMsg}`);
  }

  const rawData = await response.json();
  if (Array.isArray(rawData)) {
    for (const item of rawData) {
      if (!item.tracking_number) continue;
      
      const rawStatus = item.tracking_status || item.status || 'Pendiente de ingreso';
      const canonical = mapAndreaniTrackingStatus(rawStatus);

      const parsedResult: AndreaniTrackResult = {
        tracking_number: item.tracking_number.trim(),
        tracking_status: rawStatus,
        canonical_status: canonical,
        status: item.status || rawStatus,
        delivery_mode: item.delivery_mode,
        sales_order_number: item.sales_order_number,
        pedido_id: item.pedido_id,
        events: item.events || [],
        updated_at: item.updated_at || new Date().toISOString()
      };

      trackingCache.set(parsedResult.tracking_number, {
        data: parsedResult,
        timestamp: Date.now()
      });

      results.push(parsedResult);
    }
  }

  return results;
}

/**
 * Limpia la caché en memoria de seguimiento
 */
export function clearAndreaniTrackingCache() {
  trackingCache.clear();
}
