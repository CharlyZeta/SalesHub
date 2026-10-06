import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testGoogleMapsApiKey } from '../utils/googleMapsService';

describe('googleMapsService - testGoogleMapsApiKey', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retorna EMPTY_KEY sin realizar petición cuando la clave está vacía o es solo espacios', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const resEmpty = await testGoogleMapsApiKey('');
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.status).toBe('EMPTY_KEY');
    expect(fetchMock).not.toHaveBeenCalled();

    const resSpaces = await testGoogleMapsApiKey('   ');
    expect(resSpaces.success).toBe(false);
    expect(resSpaces.status).toBe('EMPTY_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna OK y extrae coordenadas y dirección cuando Google responde con status OK', async () => {
    const mockResponse = {
      status: 'OK',
      results: [
        {
          formatted_address: 'Av. 9 de Julio s/n, C1043 CABA, Argentina',
          geometry: {
            location: {
              lat: -34.6037389,
              lng: -58.3815704
            }
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => mockResponse
    } as Response);

    const result = await testGoogleMapsApiKey('AIzaSyValidApiKeyTest123');

    expect(result.success).toBe(true);
    expect(result.status).toBe('OK');
    expect(result.message).toContain('¡Clave válida!');
    expect(result.details?.formattedAddress).toBe('Av. 9 de Julio s/n, C1043 CABA, Argentina');
    expect(result.details?.lat).toBe(-34.6037389);
    expect(result.details?.lng).toBe(-58.3815704);
  });

  it('retorna REQUEST_DENIED con mensaje explicativo cuando Google rechaza la clave o la API no está habilitada', async () => {
    const mockResponse = {
      status: 'REQUEST_DENIED',
      error_message: 'The provided API key is invalid or Geocoding API is not enabled on this project.'
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => mockResponse
    } as Response);

    const result = await testGoogleMapsApiKey('AIzaSyInvalidKey');

    expect(result.success).toBe(false);
    expect(result.status).toBe('REQUEST_DENIED');
    expect(result.message).toContain('Geocoding API');
    expect(result.details?.googleErrorMessage).toBe(mockResponse.error_message);
  });

  it('retorna OVER_QUERY_LIMIT cuando la respuesta HTTP es 429', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 429,
      json: async () => ({})
    } as Response);

    const result = await testGoogleMapsApiKey('AIzaSyOverQuotaKey');

    expect(result.success).toBe(false);
    expect(result.status).toBe('OVER_QUERY_LIMIT');
    expect(result.message).toContain('Límite de cuota');
  });

  it('retorna OVER_QUERY_LIMIT cuando data.status es OVER_QUERY_LIMIT', async () => {
    const mockResponse = {
      status: 'OVER_QUERY_LIMIT',
      error_message: 'You have exceeded your daily request quota for this API.'
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => mockResponse
    } as Response);

    const result = await testGoogleMapsApiKey('AIzaSyOverQuotaKey');

    expect(result.success).toBe(false);
    expect(result.status).toBe('OVER_QUERY_LIMIT');
  });

  it('retorna ZERO_RESULTS con success true cuando la clave es válida pero la búsqueda no tiene resultados', async () => {
    const mockResponse = {
      status: 'ZERO_RESULTS',
      results: []
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => mockResponse
    } as Response);

    const result = await testGoogleMapsApiKey('AIzaSyValidKey');

    expect(result.success).toBe(true);
    expect(result.status).toBe('ZERO_RESULTS');
  });

  it('retorna ERROR cuando ocurre un fallo de red o excepción en fetch', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (CORS or network down)'));

    const result = await testGoogleMapsApiKey('AIzaSyTestKey');

    expect(result.success).toBe(false);
    expect(result.status).toBe('ERROR');
    expect(result.message).toContain('Error de red al conectar');
  });
});
