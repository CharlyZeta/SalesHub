import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCurrentMonthKey,
  getGoogleMapsUsageInfo,
  checkGoogleMapsQuota,
  recordGoogleMapsRequest,
  resetGoogleMapsUsage,
  checkStoredGoogleMapsQuota,
  incrementStoredGoogleMapsUsage
} from '../utils/googleMapsService';
import { AppConfig } from '../types';

describe('Google Maps Monthly Request Limiter & Usage (FEAT-GEO-003)', () => {
  const currentMonth = getCurrentMonthKey();
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
    vi.restoreAllMocks();
  });

  describe('getCurrentMonthKey', () => {
    it('debe devolver el mes en formato YYYY-MM', () => {
      const fixedDate = new Date(2026, 9, 7); // Octubre 2026
      expect(getCurrentMonthKey(fixedDate)).toBe('2026-10');
    });

    it('debe formatear con ceros a la izquierda para meses menores a 10', () => {
      const janDate = new Date(2026, 0, 15); // Enero 2026
      expect(getCurrentMonthKey(janDate)).toBe('2026-01');
    });
  });

  describe('getGoogleMapsUsageInfo', () => {
    it('utiliza límite por defecto de 2500 si no está configurado', () => {
      const info = getGoogleMapsUsageInfo({});
      expect(info.limit).toBe(2500);
      expect(info.isUnlimited).toBe(false);
      expect(info.count).toBe(0);
      expect(info.remaining).toBe(2500);
      expect(info.percentageUsed).toBe(0);
      expect(info.isLimitExceeded).toBe(false);
    });

    it('reconoce el modo ilimitado cuando el límite es 0', () => {
      const info = getGoogleMapsUsageInfo({
        googleMapsMonthlyLimit: 0,
        googleMapsUsage: { month: currentMonth, count: 540 }
      });
      expect(info.limit).toBe(0);
      expect(info.isUnlimited).toBe(true);
      expect(info.count).toBe(540);
      expect(info.remaining).toBe(Infinity);
      expect(info.isLimitExceeded).toBe(false);
    });

    it('calcula métricas de consumo y porcentaje correctamente', () => {
      const info = getGoogleMapsUsageInfo({
        googleMapsMonthlyLimit: 1000,
        googleMapsUsage: { month: currentMonth, count: 750 }
      });
      expect(info.count).toBe(750);
      expect(info.limit).toBe(1000);
      expect(info.remaining).toBe(250);
      expect(info.percentageUsed).toBe(75);
      expect(info.isLimitExceeded).toBe(false);
    });

    it('detecta cuando el límite mensual ha sido alcanzado o superado', () => {
      const infoExact = getGoogleMapsUsageInfo({
        googleMapsMonthlyLimit: 500,
        googleMapsUsage: { month: currentMonth, count: 500 }
      });
      expect(infoExact.isLimitExceeded).toBe(true);
      expect(infoExact.remaining).toBe(0);
      expect(infoExact.percentageUsed).toBe(100);

      const infoExceeded = getGoogleMapsUsageInfo({
        googleMapsMonthlyLimit: 500,
        googleMapsUsage: { month: currentMonth, count: 520 }
      });
      expect(infoExceeded.isLimitExceeded).toBe(true);
      expect(infoExceeded.remaining).toBe(0);
    });

    it('reinicia el conteo si el registro de uso corresponde a un mes anterior (cambio de mes automático)', () => {
      const info = getGoogleMapsUsageInfo({
        googleMapsMonthlyLimit: 2500,
        googleMapsUsage: { month: '2025-01', count: 2490 }
      });
      expect(info.currentMonth).toBe(currentMonth);
      expect(info.count).toBe(0);
      expect(info.remaining).toBe(2500);
      expect(info.isLimitExceeded).toBe(false);
    });
  });

  describe('checkGoogleMapsQuota', () => {
    it('permite solicitudes cuando el conteo es menor al límite', () => {
      const res = checkGoogleMapsQuota({
        googleMapsMonthlyLimit: 100,
        googleMapsUsage: { month: currentMonth, count: 40 }
      });
      expect(res.allowed).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('bloquea solicitudes cuando el límite ha sido alcanzado', () => {
      const res = checkGoogleMapsQuota({
        googleMapsMonthlyLimit: 100,
        googleMapsUsage: { month: currentMonth, count: 100 }
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('límite mensual');
    });

    it('siempre permite solicitudes en modo ilimitado (límite = 0)', () => {
      const res = checkGoogleMapsQuota({
        googleMapsMonthlyLimit: 0,
        googleMapsUsage: { month: currentMonth, count: 999999 }
      });
      expect(res.allowed).toBe(true);
    });
  });

  describe('recordGoogleMapsRequest y resetGoogleMapsUsage', () => {
    it('incrementa el contador del mes actual y registra timestamp', () => {
      const initialConfig: AppConfig = {
        canales: [],
        metodosPago: [],
        ultimoNumeroPresupuesto: 1,
        puntoVentaPresupuesto: '0001',
        googleMapsMonthlyLimit: 500,
        googleMapsUsage: { month: currentMonth, count: 10 }
      };

      const { updatedConfig, usage } = recordGoogleMapsRequest(initialConfig);
      expect(updatedConfig.googleMapsUsage?.count).toBe(11);
      expect(updatedConfig.googleMapsUsage?.month).toBe(currentMonth);
      expect(updatedConfig.googleMapsUsage?.lastRequestTimestamp).toBeDefined();
      expect(usage.count).toBe(11);
      expect(usage.remaining).toBe(489);
    });

    it('inicia en 1 si el mes previo era diferente', () => {
      const initialConfig: AppConfig = {
        canales: [],
        metodosPago: [],
        ultimoNumeroPresupuesto: 1,
        puntoVentaPresupuesto: '0001',
        googleMapsMonthlyLimit: 500,
        googleMapsUsage: { month: '2024-05', count: 450 }
      };

      const { updatedConfig, usage } = recordGoogleMapsRequest(initialConfig);
      expect(updatedConfig.googleMapsUsage?.count).toBe(1);
      expect(updatedConfig.googleMapsUsage?.month).toBe(currentMonth);
      expect(usage.count).toBe(1);
    });

    it('resetGoogleMapsUsage reinicia el contador a 0', () => {
      const config: AppConfig = {
        canales: [],
        metodosPago: [],
        ultimoNumeroPresupuesto: 1,
        puntoVentaPresupuesto: '0001',
        googleMapsMonthlyLimit: 500,
        googleMapsUsage: { month: currentMonth, count: 490 }
      };

      const resetConfig = resetGoogleMapsUsage(config);
      expect(resetConfig.googleMapsUsage?.count).toBe(0);
      expect(resetConfig.googleMapsUsage?.month).toBe(currentMonth);
      expect(resetConfig.googleMapsUsage?.lastRequestTimestamp).toBeUndefined();
    });
  });

  describe('Persistencia y Helpers con localStorage', () => {
    it('checkStoredGoogleMapsQuota e incrementStoredGoogleMapsUsage interactúan correctamente con localStorage', () => {
      localStorage.setItem('app_config_v1', JSON.stringify({
        googleMapsMonthlyLimit: 3,
        googleMapsUsage: { month: currentMonth, count: 1 }
      }));

      const check1 = checkStoredGoogleMapsQuota();
      expect(check1.allowed).toBe(true);
      expect(check1.usage.count).toBe(1);

      const usage2 = incrementStoredGoogleMapsUsage();
      expect(usage2.count).toBe(2);

      const usage3 = incrementStoredGoogleMapsUsage();
      expect(usage3.count).toBe(3);
      expect(usage3.isLimitExceeded).toBe(true);

      const checkExceeded = checkStoredGoogleMapsQuota();
      expect(checkExceeded.allowed).toBe(false);
    });
  });
});
