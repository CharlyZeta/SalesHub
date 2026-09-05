import { describe, it, expect } from 'vitest';
import {
  mapAndreaniTrackingStatus,
  isTerminalStatus,
  getAndreaniStatusConfig,
  ANDREANI_CANONICAL_STATUSES
} from '../utils/andreaniStatusMapper';

describe('Andreani Status Mapper (1:1 with Official Plugin)', () => {
  describe('mapAndreaniTrackingStatus', () => {
    it('maps "Listo para enviar", "created" and "empaquetado" to "Pendiente de ingreso"', () => {
      expect(mapAndreaniTrackingStatus('Listo para enviar')).toBe('Pendiente de ingreso');
      expect(mapAndreaniTrackingStatus('listo para enviar')).toBe('Pendiente de ingreso');
      expect(mapAndreaniTrackingStatus('pending_entry')).toBe('Pendiente de ingreso');
      expect(mapAndreaniTrackingStatus('empaquetado')).toBe('Pendiente de ingreso');
      expect(mapAndreaniTrackingStatus('created')).toBe('Pendiente de ingreso');
      expect(mapAndreaniTrackingStatus('Pendiente')).toBe('Pendiente de ingreso');
    });

    it('maps "En camino", "in_transit", "en distribución" to "En camino"', () => {
      expect(mapAndreaniTrackingStatus('En camino')).toBe('En camino');
      expect(mapAndreaniTrackingStatus('en camino')).toBe('En camino');
      expect(mapAndreaniTrackingStatus('EN CAMINO')).toBe('En camino');
      expect(mapAndreaniTrackingStatus('in_transit')).toBe('En camino');
      expect(mapAndreaniTrackingStatus('En tránsito')).toBe('En camino');
      expect(mapAndreaniTrackingStatus('En distribución')).toBe('En camino');
      expect(mapAndreaniTrackingStatus('Despachado')).toBe('En camino');
      expect(mapAndreaniTrackingStatus('Enviado')).toBe('En camino');
    });

    it('maps "Listo para retirar", "en sucursal", "ready_pickup" to "Listo para retirar"', () => {
      expect(mapAndreaniTrackingStatus('Listo para retirar')).toBe('Listo para retirar');
      expect(mapAndreaniTrackingStatus('listo para retirar')).toBe('Listo para retirar');
      expect(mapAndreaniTrackingStatus('ready_pickup')).toBe('Listo para retirar');
      expect(mapAndreaniTrackingStatus('En sucursal')).toBe('Listo para retirar');
      expect(mapAndreaniTrackingStatus('A disposición en sucursal')).toBe('Listo para retirar');
    });

    it('maps "Entregado", "delivered", "finalizado" to "Entregado"', () => {
      expect(mapAndreaniTrackingStatus('Entregado')).toBe('Entregado');
      expect(mapAndreaniTrackingStatus('entregada')).toBe('Entregado');
      expect(mapAndreaniTrackingStatus('ENTREGADO')).toBe('Entregado');
      expect(mapAndreaniTrackingStatus('delivered')).toBe('Entregado');
      expect(mapAndreaniTrackingStatus('Recibido')).toBe('Entregado');
    });

    it('maps "No entregado", "not_delivered", "visita fallida", "siniestro" to "No entregado"', () => {
      expect(mapAndreaniTrackingStatus('No entregado')).toBe('No entregado');
      expect(mapAndreaniTrackingStatus('not_delivered')).toBe('No entregado');
      expect(mapAndreaniTrackingStatus('Visita fallida')).toBe('No entregado');
      expect(mapAndreaniTrackingStatus('Domicilio cerrado')).toBe('No entregado');
      expect(mapAndreaniTrackingStatus('Devuelto')).toBe('No entregado');
      expect(mapAndreaniTrackingStatus('Siniestro')).toBe('No entregado');
    });

    it('handles empty or missing status safely', () => {
      expect(mapAndreaniTrackingStatus('')).toBe('Pendiente de ingreso');
      expect(mapAndreaniTrackingStatus(null)).toBe('Pendiente de ingreso');
      expect(mapAndreaniTrackingStatus(undefined)).toBe('Pendiente de ingreso');
    });
  });

  describe('isTerminalStatus', () => {
    it('correctly marks delivered and no-requiere as terminal', () => {
      expect(isTerminalStatus('Entregado')).toBe(true);
      expect(isTerminalStatus('entregado')).toBe(true);
      expect(isTerminalStatus('delivered')).toBe(true);
      expect(isTerminalStatus('No Requiere')).toBe(true);
    });

    it('correctly marks non-delivered statuses as non-terminal', () => {
      expect(isTerminalStatus('En camino')).toBe(false);
      expect(isTerminalStatus('Listo para retirar')).toBe(false);
      expect(isTerminalStatus('Pendiente de ingreso')).toBe(false);
      expect(isTerminalStatus('No entregado')).toBe(false);
      expect(isTerminalStatus('')).toBe(false);
    });
  });

  describe('getAndreaniStatusConfig', () => {
    it('returns appropriate icon and badge class for each status', () => {
      const deliveredConfig = getAndreaniStatusConfig('Entregado');
      expect(deliveredConfig.iconType).toBe('check');
      expect(deliveredConfig.badgeClass).toContain('emerald');

      const transitConfig = getAndreaniStatusConfig('En camino');
      expect(transitConfig.iconType).toBe('truck');
      expect(transitConfig.badgeClass).toContain('blue');

      const pickupConfig = getAndreaniStatusConfig('Listo para retirar');
      expect(pickupConfig.iconType).toBe('store');
      expect(pickupConfig.badgeClass).toContain('purple');

      const failedConfig = getAndreaniStatusConfig('No entregado');
      expect(failedConfig.iconType).toBe('alert');
      expect(failedConfig.badgeClass).toContain('rose');

      const pendingConfig = getAndreaniStatusConfig('Pendiente de ingreso');
      expect(pendingConfig.iconType).toBe('clock');
      expect(pendingConfig.badgeClass).toContain('amber');
    });
  });

  describe('ANDREANI_CANONICAL_STATUSES', () => {
    it('includes all essential statuses', () => {
      expect(ANDREANI_CANONICAL_STATUSES).toContain('Pendiente de ingreso');
      expect(ANDREANI_CANONICAL_STATUSES).toContain('En camino');
      expect(ANDREANI_CANONICAL_STATUSES).toContain('Listo para retirar');
      expect(ANDREANI_CANONICAL_STATUSES).toContain('Entregado');
      expect(ANDREANI_CANONICAL_STATUSES).toContain('No entregado');
    });
  });
});
