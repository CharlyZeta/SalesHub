# CONTRACT: Botón de Prueba y Validación de Clave API de Google Maps en el Configurador

# ID: FEAT-GEO-002

# Status: RESOLVED

# Mode: LOOP

# Gate-Mode: FULL

## Intent

Incorporar un mecanismo de validación interactiva y prueba en vivo ("Probar Clave") en la pestaña General & Ventas del Configurador (`ConfigGeneralTab.tsx`), permitiendo al usuario comprobar de forma inmediata si la clave de API de Google Maps ingresada es válida, si tiene habilitada la `Geocoding API` y si las restricciones configuradas en Google Cloud Console permiten la geolocalización de domicilios sin errores.

## Use Case

**Actor:** Administrador / Operador del sistema  
**Goal:** Validar en tiempo real la clave API de Google Maps al momento de ingresarla o editarla en el panel de configuración, obteniendo feedback visual detallado (éxito con coordenadas de prueba o causa exacta de rechazo como `REQUEST_DENIED`, `OVER_QUERY_LIMIT`, etc.) antes de guardar los cambios.

### Main Flow

1. El usuario abre el modal de Configuración (`ConfigModal`) en la pestaña **General & Ventas**.
2. En la sección **Integración con Google Maps (Geocodificación de Direcciones)**, el usuario ingresa o edita su clave API.
3. El usuario hace clic en el botón **"Probar Clave"** (o presiona Enter en el campo).
4. El sistema deshabilita temporalmente el botón y muestra un estado de carga (`Probando conexión con Google...`).
5. El sistema envía una petición de prueba `GET` a `https://maps.googleapis.com/maps/api/geocode/json?address=Obelisco%2C+Buenos+Aires%2C+Argentina&key=${apiKey}`.
6. La API de Google responde con status `OK`:
   - Se muestra un banner / mensaje de éxito en verde con icono de confirmación: `¡Clave válida! Conexión y geocodificación exitosas`.
   - Se registra un evento `INFO` en los logs del sistema (`addSystemLog('INFO', 'Maps', 'Prueba de clave API de Google Maps exitosa')`).
7. El usuario guarda la configuración con total tranquilidad de funcionamiento.

### Alternative Flows

- **AF-01 (Clave vacía):** El usuario pulsa "Probar Clave" sin haber ingresado ninguna clave $\rightarrow$ Se muestra una advertencia en amarillo: `Por favor, ingresa una clave de API antes de realizar la prueba.` sin emitir petición HTTP.
- **AF-02 (Acceso denegado / REQUEST_DENIED):** Google responde con `REQUEST_DENIED` (clave incorrecta, `Geocoding API` no habilitada o restricción de referenciador incompatible) $\rightarrow$ Se muestra un banner de error en rojo con el motivo detallado de Google y sugerencias de solución (ej. _"Habilita Geocoding API en Google Cloud Console"_).
- **AF-03 (Límite de cuota / OVER_QUERY_LIMIT o 429):** Google responde con cupo excedido o falta de facturación $\rightarrow$ Se muestra alerta de cuota / facturación requerida.
- **AF-04 (Error de red / CORS):** Falla la conexión $\rightarrow$ Se muestra alerta de conectividad.

## Business Rules

- **BR-001:** El botón de prueba debe estar disponible tanto si la clave ya estaba guardada como si el usuario acaba de escribir o pegar una nueva clave en el input (sin obligar a guardar primero).
- **BR-002:** El botón debe permitir alternar entre ver u ocultar los caracteres de la clave (icono de ojo) para facilitar la verificación visual.
- **BR-003:** La consulta de prueba debe utilizar una dirección canónica fija rápida (ej: `"Obelisco, Buenos Aires, Argentina"`).
- **BR-004:** La interfaz debe soportar modo claro y modo oscuro (`dark:`) consistente con el diseño de SalesHub.
- **BR-005:** Los resultados de la prueba deben registrarse en el log de auditoría del sistema (`addSystemLog`) para facilitar el soporte técnico.

## Acceptance Criteria

- **AC-001:** GIVEN el panel de configuración WHEN el usuario ingresa una clave válida y presiona "Probar Clave" THEN se muestra feedback visual verde de éxito y estado `OK`.
- **AC-002:** GIVEN una clave vacía WHEN el usuario presiona "Probar Clave" THEN se solicita ingresar una clave sin lanzar petición de red.
- **AC-003:** GIVEN una clave inválida o sin permisos WHEN se presiona "Probar Clave" THEN se muestra el error devuelto por Google con sugerencia de resolución.
- **AC-004:** GIVEN la prueba en ejecución WHEN está pendiente la respuesta THEN el botón muestra spinner y queda deshabilitado para evitar peticiones duplicadas.
- **AC-005:** GIVEN la suite de pruebas WHEN se ejecuta `npm run lint` y `npm test` THEN no hay errores de TypeScript ni regresiones.

## Entities Affected

- `src/components/ConfigGeneralTab.tsx`: Incorporación del botón "Probar Clave", toggle de visibilidad y banner de estado de prueba.
- `src/utils/googleMapsService.ts`: Función utilitaria `testGoogleMapsApiKey(apiKey: string)` con tipado de respuesta y mapeo de errores.
- `src/__tests__/googleMapsTest.test.ts`: Pruebas unitarias para la validación de respuestas de Google Maps API.

## Ambiguity Log

- [x] ¿La prueba debe guardar la clave automáticamente?  
      _Decisión:_ No. La prueba solo valida el valor actual del input en memoria. El usuario decide guardar la configuración con el botón general "Guardar Cambios".

## Completion Map

# generated: 2026-10-06T17:55:00Z

# Etapa 1: Servicio utilitario de prueba de API Key Google Geocoding|AC-001,AC-002,AC-003|coder-agent|✅

# Etapa 2: UI en ConfigGeneralTab con botón, spinner, toggle de visualización y badges de estado|AC-001,AC-004|coder-agent|✅

# Etapa 3: Tests unitarios para el validador de clave|AC-005|tester-agent|✅

# Etapa 4: Verificación lint, tests y build|AC-005|tester-agent|✅
