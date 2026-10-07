import { AppConfig, GoogleMapsUsage } from '../types';
import { addSystemLog } from './logger';

export interface GoogleMapsTestResult {
  success: boolean;
  status: 'OK' | 'REQUEST_DENIED' | 'OVER_QUERY_LIMIT' | 'ZERO_RESULTS' | 'INVALID_REQUEST' | 'ERROR' | 'EMPTY_KEY';
  message: string;
  details?: {
    formattedAddress?: string;
    lat?: number;
    lng?: number;
    googleErrorMessage?: string;
  };
}

export interface GoogleMapsUsageInfo {
  currentMonth: string; // 'YYYY-MM'
  count: number;
  limit: number;
  isUnlimited: boolean;
  remaining: number;
  percentageUsed: number;
  isLimitExceeded: boolean;
  lastRequestTimestamp?: string;
}

/**
 * Obtiene la clave de mes actual en formato 'YYYY-MM' en hora local.
 */
export function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calcula la información y métricas de consumo de la API de Google Maps Geocoding para el mes en curso.
 */
export function getGoogleMapsUsageInfo(config?: Partial<AppConfig>): GoogleMapsUsageInfo {
  const currentMonth = getCurrentMonthKey();
  const rawLimit = config?.googleMapsMonthlyLimit;
  // Por defecto 2500 si no está definido, o respetar 0 como ilimitado, o entero positivo
  const limit = typeof rawLimit === 'number' ? Math.max(0, Math.floor(rawLimit)) : 2500;
  const isUnlimited = limit === 0;

  const usageData = config?.googleMapsUsage;
  const isSameMonth = usageData?.month === currentMonth;
  const count = isSameMonth ? Math.max(0, usageData?.count || 0) : 0;
  const lastRequestTimestamp = isSameMonth ? usageData?.lastRequestTimestamp : undefined;

  const remaining = isUnlimited ? Infinity : Math.max(0, limit - count);
  const percentageUsed = isUnlimited ? 0 : limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const isLimitExceeded = !isUnlimited && count >= limit;

  return {
    currentMonth,
    count,
    limit,
    isUnlimited,
    remaining,
    percentageUsed,
    isLimitExceeded,
    lastRequestTimestamp
  };
}

/**
 * Verifica si está permitido realizar una nueva consulta a Google Maps según el límite mensual configurado.
 */
export function checkGoogleMapsQuota(config?: Partial<AppConfig>): {
  allowed: boolean;
  reason?: string;
  usage: GoogleMapsUsageInfo;
} {
  const usage = getGoogleMapsUsageInfo(config);

  if (usage.isLimitExceeded) {
    return {
      allowed: false,
      reason: `Se ha alcanzado el límite mensual de ${usage.limit.toLocaleString()} solicitudes configuradas para Google Maps (${usage.count}/${usage.limit}).`,
      usage
    };
  }

  return {
    allowed: true,
    usage
  };
}

/**
 * Registra una consulta a la API de Google Maps en la configuración, incrementando el contador del mes actual.
 */
export function recordGoogleMapsRequest(config: AppConfig): {
  updatedConfig: AppConfig;
  usage: GoogleMapsUsageInfo;
} {
  const currentMonth = getCurrentMonthKey();
  const isSameMonth = config.googleMapsUsage?.month === currentMonth;
  const currentCount = isSameMonth ? (config.googleMapsUsage?.count || 0) : 0;
  const newCount = currentCount + 1;

  const updatedUsage: GoogleMapsUsage = {
    month: currentMonth,
    count: newCount,
    lastRequestTimestamp: new Date().toISOString()
  };

  const updatedConfig: AppConfig = {
    ...config,
    googleMapsUsage: updatedUsage
  };

  const usage = getGoogleMapsUsageInfo(updatedConfig);
  return { updatedConfig, usage };
}

/**
 * Restablece a cero el contador de solicitudes de Google Maps para el mes en curso.
 */
export function resetGoogleMapsUsage(config: AppConfig): AppConfig {
  const currentMonth = getCurrentMonthKey();
  return {
    ...config,
    googleMapsUsage: {
      month: currentMonth,
      count: 0,
      lastRequestTimestamp: undefined
    }
  };
}

const CONFIG_KEY = 'app_config_v1';

export function getStoredAppConfig(): Partial<AppConfig> {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch {
    // fallback
  }
  return {};
}

export function saveStoredAppConfig(config: Partial<AppConfig>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
  } catch {
    // fallback
  }
}

/**
 * Incrementa el contador de peticiones del mes actual en localStorage y devuelve la información actualizada de uso.
 */
export function incrementStoredGoogleMapsUsage(): GoogleMapsUsageInfo {
  const cfg = getStoredAppConfig();
  const currentMonth = getCurrentMonthKey();
  const isSameMonth = cfg.googleMapsUsage?.month === currentMonth;
  const currentCount = isSameMonth ? (cfg.googleMapsUsage?.count || 0) : 0;
  const newCount = currentCount + 1;

  const updatedUsage: GoogleMapsUsage = {
    month: currentMonth,
    count: newCount,
    lastRequestTimestamp: new Date().toISOString()
  };

  const updatedConfig: Partial<AppConfig> = {
    ...cfg,
    googleMapsUsage: updatedUsage
  };

  saveStoredAppConfig(updatedConfig);
  return getGoogleMapsUsageInfo(updatedConfig);
}

/**
 * Chequea si el uso actual almacenado en localStorage permite realizar peticiones.
 */
export function checkStoredGoogleMapsQuota(): {
  allowed: boolean;
  reason?: string;
  usage: GoogleMapsUsageInfo;
} {
  const cfg = getStoredAppConfig();
  return checkGoogleMapsQuota(cfg);
}

/**
 * Prueba en vivo la validez de una clave de API de Google Maps realizando una geocodificación
 * de prueba para una dirección canónica fija.
 */
export async function testGoogleMapsApiKey(
  apiKey: string,
  onRecordUsage?: () => void
): Promise<GoogleMapsTestResult> {
  const trimmedKey = (apiKey || '').trim();

  if (!trimmedKey) {
    return {
      success: false,
      status: 'EMPTY_KEY',
      message: 'Por favor, ingresa una clave de API antes de realizar la prueba.'
    };
  }

  addSystemLog('API', 'Maps', 'Iniciando prueba de conexión con Google Geocoding API...');

  try {
    const testAddress = encodeURIComponent('Obelisco, Buenos Aires, Argentina');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${testAddress}&key=${trimmedKey}`;

    const res = await fetch(url);
    onRecordUsage?.();

    if (res.status === 429) {
      addSystemLog('ERROR', 'Maps', 'Prueba de clave API fallida: Error 429 (Cuota excedida)');
      return {
        success: false,
        status: 'OVER_QUERY_LIMIT',
        message: 'Límite de cuota alcanzado: Verifica que tengas una cuenta de facturación vinculada en Google Cloud.'
      };
    }

    const data = await res.json();

    if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
      const firstResult = data.results[0];
      const lat = firstResult.geometry?.location?.lat;
      const lng = firstResult.geometry?.location?.lng;
      const formattedAddress = firstResult.formatted_address;

      addSystemLog('INFO', 'Maps', 'Prueba de clave API de Google Maps exitosa (Geocoding API OK)', {
        lat,
        lng,
        formattedAddress
      });

      return {
        success: true,
        status: 'OK',
        message: '¡Clave válida! Conexión con Google Maps Geocoding API exitosa.',
        details: {
          formattedAddress,
          lat,
          lng
        }
      };
    }

    if (data.status === 'REQUEST_DENIED') {
      const errMsg = data.error_message || 'Acceso denegado por Google Maps Platform.';
      addSystemLog('ERROR', 'Maps', `Prueba de clave API rechazada: ${errMsg}`);

      let guidance = 'Verifica que la clave sea correcta y que la API "Geocoding API" esté habilitada en Google Cloud Console.';
      if (errMsg.toLowerCase().includes('ip') || errMsg.toLowerCase().includes('referer') || errMsg.toLowerCase().includes('restriction')) {
        guidance += ' Además, comprueba las restricciones de aplicación (referenciadores HTTP / IP).';
      }

      return {
        success: false,
        status: 'REQUEST_DENIED',
        message: guidance,
        details: {
          googleErrorMessage: errMsg
        }
      };
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      addSystemLog('ERROR', 'Maps', 'Prueba de clave API: OVER_QUERY_LIMIT');
      return {
        success: false,
        status: 'OVER_QUERY_LIMIT',
        message: 'Límite de cuota alcanzado: Verifica que el proyecto de Google Cloud tenga facturación habilitada.'
      };
    }

    if (data.status === 'ZERO_RESULTS') {
      addSystemLog('WARN', 'Maps', 'Prueba de clave API: ZERO_RESULTS (clave válida pero sin resultados)');
      return {
        success: true,
        status: 'ZERO_RESULTS',
        message: 'La clave es válida y se conectó a Google, aunque la dirección de prueba no arrojó resultados.'
      };
    }

    const rawError = data.error_message || `Estado de respuesta no reconocido: ${data.status}`;
    addSystemLog('WARN', 'Maps', `Prueba de clave API: ${rawError}`);

    return {
      success: false,
      status: data.status || 'ERROR',
      message: rawError,
      details: {
        googleErrorMessage: data.error_message
      }
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    addSystemLog('ERROR', 'Maps', `Error al conectar con la API de Google Maps: ${errorMsg}`);

    return {
      success: false,
      status: 'ERROR',
      message: `Error de red al conectar con Google Maps (${errorMsg}). Verifique su conexión a Internet o bloqueos de red.`
    };
  }
}
