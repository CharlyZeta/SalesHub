# CONTRACT: Cambio de Proveedor de Geocodificación a Google Maps para Mayor Precisión en Localización de Clientes
# ID: FEAT-GEO-001
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: GATE

## Intent
Incrementar la precisión de geolocalización de direcciones de clientes reemplazando el servicio de geocodificación gratuito OpenStreetMap (Nominatim) por la API de Google Geocoding, manteniendo intacta la interfaz de usuario basada en Leaflet y el flujo existente. El objetivo es corregir la baja precisión reportada en búsquedas de domicilios como "Córdoba" o localidades con múltiples coincidencias.

## Use Case
**Actor:** Operador comercial / Facturador  
**Goal:** Al cargar o editar un cliente, el sistema localiza automáticamente su domicilio con mayor precisión al buscar, permitiendo corrección manual arrastrando el marcador del mapa. El proceso completo:

1. El operador ingresa domicilio, localidad y provincia en el formulario del cliente (o sale ya existente).
2. El sistema envía automáticamente una petición de geocodificación (debounce 1.5s si está en el formulario de venta).
3. La API devuelve coordenadas precisas que se muestran en el mapa Leaflet.
4. El operador puede ajustar manualmente arrastrando el marcador; esas coordenadas sobrescriben la geolocalización automática.
5. Al guardar la venta, se persisten las coordenadas finales.

## Main Flow
1. **Inicialización de geocodificación** - Cuando cambian `address`, `city` o `province`, el hook `useEffect` dispara `geocodeAddress(fullAddress)` con un temporizador de 1500ms.
2. **Petición a Google Geocoding API** - Se llama a `GET https://maps.googleapis.com/maps/api/geocode/json?address=${URLencode(fullAddress)}&key=${VITE_GOOGLE_MAPS_KEY}` con el header `Accept-Language: es`.
3. **Parseo de respuesta** - Se extraen `lat` y `lng` de `data.results[0].geometry.location.lat` y `data.results[0].geometry.location.lng`.
4. **Actualización UI** - Las coordenadas se pasan a `onChangeCoordinatesRef.current()`, el marcador se reposiciona y el mapa hace zoom a nivel 15, y se muestra `¡Dirección localizada!` en `statusText`.
5. **Búsqueda manual** - El operador puede escribir una búsqueda distinta en el input y pulsar Enter o el botón de búsqueda; se ejecuta `geocodeAddress(searchQuery)` con el mismo flujo.
6. **Ubicación compartida** - El enlace de WhatsApp incluye `https://www.google.com/maps?q=${lat},${lng}`.

## Alternative Flows
- **AF-01**: La geolocalización devuelve cero resultados → el sistema muestra `No se encontraron coordenadas para esta dirección.` y el mapa se mantiene en el último punto conocido o en el centro de Argentina (lat: -34.6037, lng: -58.3816).
- **AF-02**: El input de búsqueda manual se queda vacío y el operador pulsa buscar → se no hace petición (el método `geocodeAddress` retorna temprano si `!addrStr.trim()`).
- **AF-03**: El mapa ya tiene coordenadas establecidas (del cliente previamente guardado) → el `useEffect` inicial omite la búsqueda automática (condicional `if (!address || coordinates) return;`).
- **AF-04**: Google Geocoding API responde con HTTP 429 (rate limit) → el componente muestra `No hay cupo disponible en la API de Google. Intenta nuevamente más tarde.` en `statusText`, loguea `RATE_LIMIT`, y retorna sin llamar a `onChangeCoordinatesRef.current`.

## Business Rules
- **BR-001**: El endpoint de geocodificación pasará a ser `GET https://maps.googleapis.com/maps/api/geocode/json` con query `address` y `key`.
- **BR-002**: La API Key se leerá de `import.meta.env.VITE_GOOGLE_MAPS_KEY` como string obligatorio; si la variable no está definida, el componente loguea un error (`addSystemLog('ERROR', 'Maps', 'Variable de entorno VITE_GOOGLE_MAPS_KEY no definida')`) y se detiene.
- **BR-003**: El código de respuesta cambia: antes `response.lat / response.lon`, ahora `data.results[0].geometry.location.lat / lng`.
- **BR-004**: La URL del mapa Leaflet (tiles) puede permanecer en OSM (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) o migrar a Google Maps Tiles futura; en esta fase se mantiene OSM para cumplir con los Términos de Servicio sin costo adicional.
- **BR-005**: El rate limit gratuito de Google (2,500 req/día) se documenta; para uso intensivo en caja se debe habilitar facturación en la consola.
- **BR-006**: Cuando Google devuelve código HTTP 429 (too many requests), el componente:
  - Muestra `No hay cupo disponible en la API de Google. Intenta nuevamente más tarde.` en `statusText`.
  - Loguea un error como `RATE_LIMIT: Error 429 de Google Geocoding API (código: 429)`.
  - Retorna sin llamar a `onChangeCoordinatesRef.current` (evitando actualizaciones fallidas).

## Acceptance Criteria
- **AC-001**: GIVEN que el usuario escribe "Belgrano 789, Córdoba, Córdoba, Argentina" WHEN el componente geocodifica con Google THEN devuelve coordenadas distintas a las de Nominatim para la misma dirección, corrigiendo el error reportado.
- **AC-002**: GIVEN un formulario existente WHEN el operador pregunta "¿Dónde está mi cliente en el mapa?" THEN el mapa muestra la ubicación exacta con marcador arrastrable.
- **AC-003**: GIVEN que `VITE_GOOGLE_MAPS_KEY` no está definido en `.env` WHEN el componente intenta geocodificar THEN se loguea error (`addSystemLog('ERROR', 'Maps', ...)`) y el mapa se mantiene en el último punto conocido.
- **AC-004**: GIVEN una dirección sin resultados en Google WHEN el componente lo detecta THEN muestra el mensaje `No se encontraron coordenadas para esta dirección.` sin colgar ni lanzar excepción.
- **AC-005**: GIVEN que Google Geocoding API responde con HTTP 429 (rate limit) WHEN el componente lo detecta THEN muestra `No hay cupo disponible en la API de Google. Intenta nuevamente más tarde.` en `statusText`, loguea `RATE_LIMIT`, y retorna sin llamar a `onChangeCoordinatesRef.current`.
- **AC-006**: GIVEN un cambio en el código (endpoint o parseo) WHEN se ejecuta `npm run lint` THEN pasa sin warnings de ESLint ni errores de TypeScript.
- **AC-007**: GIVEN que la API responde exitosamente WHEN se actualiza coordenada THEN el marker se mueve y el mapa hace zoom a niveau 15, manteniendo el comportamiento previo.

## Entities Affected
- `src/components/SaleLocationMap.tsx:58-102` - Modificación del método `geocodeAddress` para cambiar endpoint, headers y parseo de respuesta.
- `src/components/SaleLocationMap.tsx:15-24` - Nueva prop `googleMapsApiKey?: string` (opcional, fallback a env).
- `src/components/SaleLocationMap.tsx:62` - Prioridad: `googleMapsApiKey` de configuración → `import.meta.env.VITE_GOOGLE_MAPS_KEY`.
- `src/components/SaleFormModal.tsx:31-44` - Nueva prop `googleMapsApiKey?: string`.
- `src/components/SaleFormModal.tsx:572` - Pasa `googleMapsApiKey={googleMapsApiKey}` al SaleLocationMap.
- `src/App.tsx:487` - Pasa `googleMapsApiKey={config.googleMapsApiKey}` al SaleFormModal.
- `src/components/ConfigModal.tsx:80` - Estado `googleMapsApiKey` inicializado desde `config.googleMapsApiKey`.
- `src/components/ConfigModal.tsx:136` - Sincronización de estado al abrir modal.
- `src/components/ConfigModal.tsx:253` - Persistencia `googleMapsApiKey` en `onSaveConfig`.
- `src/components/ConfigGeneralTab.tsx:143-156` - Nuevos props `googleMapsApiKey` y `setGoogleMapsApiKey`.
- `src/components/ConfigGeneralTab.tsx:363-386` - Nuevo bloque UI "Integración con Google Maps (Geocodificación de Direcciones)" con input de clave y enlace a Google Cloud Console.
- `src/types.ts:231` - Nuevo campo `googleMapsApiKey?: string` en `AppConfig`.
- `src/data/initialData.ts:63` - Inicialización `googleMapsApiKey: ''` en `INITIAL_CONFIG`.
- `.env.example` (actualizado) - Agregar `VITE_GOOGLE_MAPS_KEY=TU_API_KEY_AQUI` como referencia para desarrollo.
- `index.html` o `vite.config.ts` - Garantizar que Vite pueda leer variables `VITE_*`.

## Ambiguity Log
- [x] ¿Se debe migrar también los tiles del mapa de OSM a Google Maps o mantener OSM como provider gratuito?  
  *Decisión:* 
  - Tiles OSM mantendrán OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) para preservar free tier sin costo.
  - Google Maps JS API no será usado para visualización; solo la API de Geocodificación.
- [x] ¿Se agrega manejo de fallback a Nominatim cuando Google falla por rate limit?  
  *Decisión:* No hay fallback; en cambio, el servicio notifica al usuario (`No hay cupo disponible en la API de Google. Intenta nuevamente más tarde.`) y registra error (`RATE_LIMIT`). El operador puede intentarlo manualmente con la búsqueda alternativa en el input.
- [x] ¿La API Key de Google Maps se configura por variable de entorno o por usuario?  
  *Decisión:* **Por usuario**. Se agrega un campo en la pestaña "General & Ventas" del modal de configuración (ConfigGeneralTab.tsx) que se guarda en `AppConfig.googleMapsApiKey`. El SaleLocationMap prioriza la key de configuración y, si no existe, cae a `import.meta.env.VITE_GOOGLE_MAPS_KEY` para desarrollo. El enlace para generar la key se incluye en la UI (`https://console.cloud.google.com/apis/credentials`).

## Completion Map
| Tarea | AC | Agente | Estado |
|-------|-----|--------|--------|
| Agregar variable `VITE_GOOGLE_MAPS_KEY` en `.env.example` | AC-003 | coder-agent | ✅ |
| Agregar `googleMapsApiKey` a `AppConfig` (types.ts, initialData.ts) | AC-003 | coder-agent | ✅ |
| Agregar UI de clave de Google Maps en `ConfigGeneralTab.tsx` con enlace a Google Cloud Console | AC-003 | coder-agent | ✅ |
| Agregar estado + persistencia en `ConfigModal.tsx` | AC-003 | coder-agent | ✅ |
| Propagar `googleMapsApiKey` desde `App.tsx` → `SaleFormModal` → `SaleLocationMap` | AC-003 | coder-agent | ✅ |
| Modificar endpoint en `geocodeAddress()` a Google Geocoding API | AC-001, AC-004, AC-006 | coder-agent | ✅ |
| Ajustar parseo de respuesta JSON (`results[0].geometry.location`) | AC-001, AC-006 | coder-agent | ✅ |
| Añadir logs de error cuando key no está definida o API falla | AC-003 | coder-agent | ✅ |
| Manejar rate limit HTTP 429 (statusText + log RATE_LIMIT) | AC-005 | coder-agent | ✅ |
| Verificar lint, typecheck, tests y build sin warnings | AC-006 | coder-agent | ✅ |
| Test manual de geocodificación con direcciones problemáticas | AC-001, AC-002 | tester-agent | ✅ |
| Actualización de CHANGELOG.md | — | coder-agent | ✅ |

# generated: 2026-09-27
# After human approval: status → APPROVED, mode → LOOP