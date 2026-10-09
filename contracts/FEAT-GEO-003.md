# CONTRACT: Limitador de Solicitudes Mensuales para la API de Google Geocoding

# ID: FEAT-GEO-003

# Status: RESOLVED

# Mode: LOOP

# Gate-Mode: FULL

## Intent

Implementar un sistema de gobernanza y control de cuota mensual para las solicitudes dirigidas a Google Geocoding API en SalesHub. Permitir al administrador configurar un límite mensual de peticiones (ej. 2500, 5000, o personalizado; 0 = ilimitado), registrar el consumo acumulado por mes calendario (`YYYY-MM`), visualizar una barra de consumo interactiva en el panel de configuración, prevenir llamadas que excedan el presupuesto y ofrecer reinicio manual del contador.

## Use Case

**Actor:** Administrador / Operador del sistema  
**Goal:** Establecer un tope mensual de peticiones a la API de Google Maps Geocoding y monitorear el consumo en tiempo real para evitar cargos imprevistos o sobregiro en Google Cloud Platform.

### Main Flow

1. El usuario abre el modal de Configuración (`ConfigModal`) en la pestaña **General & Ventas**.
2. En la sección **Integración con Google Maps (Geocodificación de Direcciones)**, se visualiza:
   - Campo para el **Límite Mensual de Solicitudes** (por defecto 2.500 solicitudes/mes, configurable a cualquier valor positivo o 0 para ilimitado).
   - Tarjeta de **Consumo del Mes en Curso** (`YYYY-MM`) con indicador numérico `X / Y consultas` y porcentaje de uso.
   - Barra de progreso visual con código de colores según nivel de consumo (verde < 70%, amarillo 70%-90%, rojo ≥ 90%).
   - Botón para **Reiniciar Contador** mensual (con confirmación).
3. Cada vez que `SaleLocationMap` o `googleMapsService` realiza una consulta efectiva a Google Geocoding:
   - El sistema verifica primero si el contador mensual no supera el límite configurado (`limit > 0 && count >= limit`).
   - Si está dentro del cupo, se envía la petición HTTP y se incrementa atómicamente el contador del mes actual en la configuración persistida (`localStorage`).
   - Se registra el evento en el log de auditoría (`addSystemLog`).

### Alternative Flows

- **AF-01 (Límite mensual alcanzado):** Si el contador mensual alcanza o supera el límite configurado (`count >= limit`):
  - El sistema bloquea la emisión de nuevas peticiones de geocodificación automática en `SaleLocationMap`.
  - Se informa al operador en la UI: `"Límite mensual de consultas a Google Maps alcanzado (X/Y). Modifique el límite en Configuración para continuar."`.
  - Se registra una advertencia `WARN` en `addSystemLog`.
- **AF-02 (Cambio de mes calendario):** Al realizar una petición en un mes nuevo (ej. pasa de `2026-10` a `2026-11`):
  - El sistema detecta automáticamente el cambio de mes y reinicia el contador a 0 para el nuevo período.
- **AF-03 (Modo Ilimitado / Límite = 0):** Si el límite se fija en `0`:
  - No se aplica bloqueo de peticiones, pero se sigue registrando y mostrando el contador de consumo mensual para visibilidad y auditoría.
- **AF-04 (Reinicio manual del contador):** El usuario pulsa "Reiniciar Contador":
  - Se solicita confirmación simple y se restablece el conteo del mes actual a 0.

## Business Rules

- **BR-001:** El mes de seguimiento se identifica bajo el formato ISO `YYYY-MM` (año y mes en hora local).
- **BR-002:** Un límite configurado con valor `0` representa cuota ilimitada (sin bloqueo).
- **BR-003:** El contador de peticiones debe actualizarse y persistirse en `AppConfig` (`googleMapsUsage`) asegurando retrocompatibilidad total.
- **BR-004:** Toda prueba de clave API manual desde el configurador (`Probar Clave`) debe informar el consumo actual pero permitir diagnosticar la conectividad.
- **BR-005:** Todos los componentes visuales nuevos deben soportar modo claro y modo oscuro (`dark:`) con Tailwind CSS.

## Acceptance Criteria

- **AC-001:** GIVEN la configuración del sistema WHEN se accede a la sección de Google Maps THEN se visualiza el input de límite mensual y la barra de consumo del mes actual.
- **AC-002:** GIVEN un límite configurado (ej. 2500) y consumo inferior WHEN se busca una dirección en el mapa THEN la petición se ejecuta y el contador del mes se incrementa en 1.
- **AC-003:** GIVEN un consumo igual o superior al límite WHEN se intenta geocodificar en el mapa THEN se previene la llamada HTTP de red y se muestra mensaje explicativo de cuota agotada.
- **AC-004:** GIVEN un cambio de mes calendario WHEN se realiza una petición THEN el contador se reinicia automáticamente para el nuevo mes.
- **AC-005:** GIVEN el botón "Reiniciar Contador" WHEN el usuario confirma THEN el contador del mes actual vuelve a 0.
- **AC-006:** GIVEN la suite de validación WHEN se ejecutan `npm run lint` y `npm test` THEN no existen errores de TypeScript ni fallos de pruebas.

## Entities Affected

- `src/types.ts`: Ampliación de `AppConfig` con `googleMapsMonthlyLimit?: number` y `googleMapsUsage?: { month: string; count: number; lastRequestTimestamp?: string }`.
- `src/data/initialData.ts`: Valores por defecto para `INITIAL_CONFIG`.
- `src/utils/googleMapsService.ts`: Funciones `getGoogleMapsUsage`, `checkGoogleMapsQuota`, `incrementGoogleMapsUsage`, `resetGoogleMapsUsage`.
- `src/components/ConfigGeneralTab.tsx`: Controles UI de límite mensual, visualizador de cuota con barra de progreso y botón de reinicio.
- `src/components/SaleLocationMap.tsx`: Verificación de cuota previa a geocodificación e incremento de contador tras consulta exitosa.
- `src/__tests__/googleMapsUsage.test.ts`: Suite de pruebas unitarias para control de cuota mensual, reseteo por cambio de mes y bloqueos.

## Ambiguity Log

- [ ] ¿Las pruebas desde el botón "Probar Clave" deben descontar del cupo mensual?  
      _Criterio:_ Sí, toda petición a Google Geocoding consume crédito de la API de Google, por lo que debe contabilizarse para mantener la precisión del consumo real.

## Completion Map

# generated: 2026-10-07T17:28:00Z

# Tarea 1: Extensión de tipos y utilidades de cuota mensual en googleMapsService|AC-001,AC-002,AC-004|coder-agent|✅

# Tarea 2: Integración de UI de límite, barra de progreso y reset en ConfigGeneralTab|AC-001,AC-005|coder-agent|✅

# Tarea 3: Verificación de cuota e incremento en SaleLocationMap|AC-002,AC-003|coder-agent|✅

# Tarea 4: Tests unitarios de cuota mensual (googleMapsUsage.test.ts)|AC-001,AC-002,AC-003,AC-004,AC-005|tester-agent|✅

# Tarea 5: Verificación integral de calidad (lint, tests, circular, build)|AC-006|reviewer-agent|✅
