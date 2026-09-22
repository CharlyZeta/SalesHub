# CONTRACT: Autoguardado con Debounce de Ajustes WooCommerce
# ID: FIX-W003
# Status: RESOLVED
# Mode: LOOP
# Gate-Mode: EXPRESS

## Intent
Persistir automáticamente los ajustes de conexión y programación de WooCommerce al modificarse en el formulario con debounce, evitando pérdida de configuración por cierre accidental del modal sin pulsar "Guardar Ajustes" y sincronizando el estado con el servidor Node.

## Use Case
**Actor:** Operador / Administrador
**Goal:** Configurar la conexión y programación de WooCommerce sin riesgo de perder cambios al cerrar el modal.

### Main Flow
1. El usuario modifica algún campo de configuración (URL, keys, intervalo, autoSync).
2. El sistema detecta el cambio, muestra el indicador "Guardando..." y espera 900 ms de inactividad (debounce).
3. El sistema guarda la configuración en el estado local (`localStorage`).
4. El sistema publica la configuración al servidor (`/api/woo/config`) para actualizar el temporizador desatendido.
5. El sistema actualiza el estado a "Guardado" durante 2.5 s y registra la auditoría.

### Alternative Flows
- AF-01: El usuario ingresa una URL vacía o solo espacios → No se dispara la persistencia ni la llamada al servidor.
- AF-02: El usuario cierra el modal con un guardado pendiente en cola de debounce → Se cancela el temporizador y se aplica el guardado inmediatamente antes de desmontar.
- AF-03: El endpoint del servidor `/api/woo/config` responde error o no está disponible → Se preserva la configuración en el navegador y se marca `available: false` en el estado del servidor.

## Business Rules
- BR-001: El primer render del modal no debe disparar eventos de autoguardado si los valores provienen del estado inicial/existente.
- BR-002: No debe existir duplicación de métodos (`publishConfigToServer`) en `WooCommerceModal.tsx` (`TS2451`).

## Acceptance Criteria
- AC-001: GIVEN el formulario con URL válida WHEN se modifica el intervalo THEN tras 900 ms se invoca `onUpdateConfig` y se publica a `/api/woo/config`.
- AC-002: GIVEN un debounce pendiente WHEN se desmonta el modal THEN se persiste el estado pendiente antes del desmontaje.
- AC-003: GIVEN el proyecto con los cambios aplicados WHEN se ejecuta `npm run lint` THEN debe pasar con 0 errores y 0 warnings.

## Entities Affected
- `WooCommerceConfig`: estructura de configuración en `src/types.ts`.
- `WooCommerceModal.tsx`: componente de UI del modal.

## Ambiguity Log
- [ ] Sin ambigüedades pendientes.

## Completion Map
# generated: 2026-09-22T11:05:00Z
# Resolver colisión TS2451 publishConfigToServer en WooCommerceModal|AC-003|coder-agent|✅
# Validar flujo de autoguardado y unmount seguro|AC-001,AC-002|coder-agent|✅
# Verificación de lint y suite completa de tests|AC-003|reviewer-agent|✅
