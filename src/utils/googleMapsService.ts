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

/**
 * Prueba en vivo la validez de una clave de API de Google Maps realizando una geocodificación
 * de prueba para una dirección canónica fija.
 */
export async function testGoogleMapsApiKey(apiKey: string): Promise<GoogleMapsTestResult> {
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
