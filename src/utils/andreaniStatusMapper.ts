import { ShippingStatus } from '../types';

/**
 * Estados logísticos oficiales de Andreani según el plugin andreani-shipping:
 * - 'Pendiente de ingreso' (Listo para enviar / pending_entry)
 * - 'En camino' (in_transit)
 * - 'Listo para retirar' (ready_pickup en sucursal)
 * - 'Entregado' (delivered)
 * - 'No entregado' (not_delivered)
 */

export const ANDREANI_CANONICAL_STATUSES = [
  'Pendiente de ingreso',
  'En camino',
  'Listo para retirar',
  'Entregado',
  'No entregado',
  'Pendiente',
  'Enviado',
  'No Requiere'
] as const;

export interface AndreaniStatusConfig {
  label: string;
  hint: string;
  badgeClass: string;
  iconType: 'clock' | 'truck' | 'store' | 'check' | 'alert' | 'none';
}

/**
 * Mapea el TrackingStatus logístico de Andreani al estado visual canónico del sistema.
 * Basado fielmente en Andreani_Shipments_List::map_tracking_status()
 */
export function mapAndreaniTrackingStatus(rawStatus?: string | null): ShippingStatus {
  if (!rawStatus || !rawStatus.trim()) {
    return 'Pendiente de ingreso';
  }

  const clean = rawStatus
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .trim();

  // 1. No entregado / Visita fallida / Siniestro (debe evaluarse antes que 'entregado')
  if (
    clean === 'no entregado' ||
    clean === 'not_delivered' ||
    clean.includes('no entregad') ||
    clean.includes('fallida') ||
    clean.includes('domicilio cerrado') ||
    clean.includes('reclamado') ||
    clean.includes('siniestro') ||
    clean.includes('devuelto') ||
    clean.includes('problema') ||
    clean.includes('rechazado')
  ) {
    return 'No entregado';
  }

  // 2. Entregado (Terminal)
  if (
    clean === 'entregado' ||
    clean === 'entregada' ||
    clean === 'delivered' ||
    clean === 'recibido' ||
    clean === 'finalizado' ||
    clean.includes('entregado') ||
    clean.includes('entregada')
  ) {
    return 'Entregado';
  }

  // 3. Listo para retirar en sucursal (Ready Pickup)
  if (
    clean === 'listo para retirar' ||
    clean === 'ready_pickup' ||
    clean.includes('retirar') ||
    clean.includes('sucursal') ||
    clean.includes('disposicion') ||
    clean.includes('custodia')
  ) {
    return 'Listo para retirar';
  }

  // 4. En camino / En tránsito (In Transit)
  if (
    clean === 'en camino' ||
    clean === 'in_transit' ||
    clean.includes('camino') ||
    clean.includes('transito') ||
    clean.includes('distribucion') ||
    clean.includes('viaje') ||
    clean.includes('despachado') ||
    clean === 'enviado'
  ) {
    return 'En camino';
  }

  // 5. Listo para enviar / Pendiente de ingreso (Pending Entry)
  if (
    clean === 'listo para enviar' ||
    clean === 'pending_entry' ||
    clean === 'empaquetado' ||
    clean === 'packaged' ||
    clean === 'created' ||
    clean.includes('listo para enviar') ||
    clean.includes('ingreso') ||
    clean === 'pendiente'
  ) {
    return 'Pendiente de ingreso';
  }

  // Si no coincide con ninguno, capitalizar respetando el texto original
  return rawStatus.trim();
}

/**
 * Determina si el estado logístico es terminal y ya no requiere polling periódico.
 */
export function isTerminalStatus(status?: string | null): boolean {
  if (!status) return false;
  const clean = status.toLowerCase().trim();
  return (
    clean === 'entregado' ||
    clean === 'entregada' ||
    clean === 'delivered' ||
    clean === 'recibido' ||
    clean === 'no requiere'
  );
}

/**
 * Devuelve la configuración visual (etiquetas, colores, hints) para un estado dado.
 */
export function getAndreaniStatusConfig(status?: string | null): AndreaniStatusConfig {
  const canonical = mapAndreaniTrackingStatus(status);

  switch (canonical) {
    case 'Entregado':
      return {
        label: 'Entregado',
        hint: 'Entregado al destinatario.',
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        iconType: 'check'
      };

    case 'Listo para retirar':
      return {
        label: 'Listo para retirar',
        hint: 'Disponible para retirar en la sucursal de destino de Andreani.',
        badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        iconType: 'store'
      };

    case 'En camino':
    case 'Enviado':
      return {
        label: 'En camino',
        hint: 'Despachado y en camino al destino.',
        badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        iconType: 'truck'
      };

    case 'No entregado':
      return {
        label: 'No entregado',
        hint: 'No se pudo entregar. Andreani puede reintentar la visita.',
        badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        iconType: 'alert'
      };

    case 'Pendiente de ingreso':
    case 'Pendiente':
      return {
        label: 'Pendiente de ingreso',
        hint: 'El envío se generó y está pendiente de ingreso a la red de Andreani.',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        iconType: 'clock'
      };

    case 'No Requiere':
      return {
        label: 'No Requiere',
        hint: 'Esta venta no requiere gestión de envío físico.',
        badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        iconType: 'none'
      };

    default:
      return {
        label: canonical,
        hint: `Estado de envío: ${canonical}`,
        badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        iconType: 'clock'
      };
  }
}
