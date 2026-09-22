# CONTRACT: Optimización de Rendimiento y Renderizado No Bloqueante del Directorio de Clientes
# ID: FIX-C001
# Status: RESOLVED
# Mode: LOOP
# Gate-Mode: EXPRESS

## Intent
Eliminar el congelamiento total ("tildado") del navegador y el consumo excesivo de memoria al ingresar al Directorio de Clientes, reemplazando el cálculo cuadrático O(N*M) y el renderizado masivo de miles de nodos DOM por indexación O(1), paginación/ventana virtual y filtrado no bloqueante.

## Use Case
**Actor:** Operador / Administrador de ventas
**Goal:** Abrir el listado de clientes, buscar por nombre/identificador y consultar historiales de forma instantánea y fluida, incluso con miles de clientes y ventas registradas.

### Main Flow
1. El usuario abre el modal "Directorio de Clientes".
2. El sistema indexa las ventas por `clienteId` en un `Map` en tiempo O(M) una sola vez (lookup O(1) por cliente).
3. El sistema presenta la primera página de clientes (p. ej. 40 clientes) de forma inmediata, sin saturar el DOM ni el hilo de render.
4. Al hacer scroll hacia el final de la lista, el sistema carga fluidamente el siguiente bloque de clientes (infinite scroll / paginación por demanda).
5. Al escribir en el buscador, la UI responde a 60 FPS sin bloquear la entrada del teclado, filtrando con `useDeferredValue` / debounce.
6. Al seleccionar un cliente, su historial de compras se obtiene inmediatamente vía O(1) desde el índice precalculado sin re-renderizar la lista completa.

### Alternative Flows
- AF-01: Búsqueda sin coincidencias → Muestra el estado vacío sin demoras ni cálculos residuales.
- AF-02: Búsqueda con menos resultados que el tamaño de página → Muestra todos los resultados coincidentes y desactiva la paginación adicional.
- AF-03: Cliente sin compras asociadas → Muestra métricas en cero inmediatamente sin escaneo lineal de ventas.

## Business Rules
- BR-001: La correlación entre ventas y clientes nunca debe calcularse mediante `sales.filter()` dentro de un bucle de renderizado (complejidad O(N*M) prohibida).
- BR-002: El DOM nunca debe renderizar más de 50 tarjetas de clientes simultáneamente en la vista inicial; los elementos adicionales deben cargarse bajo demanda.
- BR-003: La escritura en el campo de búsqueda debe mantener el hilo principal reactivo sin retrasos perceptibles en los caracteres ingresados.
- BR-004: Los totales de compra (`totalSpent`) y la cantidad de compras deben coincidir con la sumatoria real de ventas del cliente.

## Acceptance Criteria
- AC-001: GIVEN una lista de 3.000 clientes y 2.000 ventas WHEN se abre el modal THEN el primer renderizado se completa en menos de 100 ms y sin bloquear el hilo principal.
- AC-002: GIVEN la lista de clientes WHEN se busca por nombre/DNI THEN la respuesta del input no presenta retraso en el tipeo y el filtrado se realiza de manera no bloqueante.
- AC-003: GIVEN un cliente seleccionado WHEN se calcula su historial THEN los montos acumulados coinciden con los registros de ventas asociados en lookup O(1).
- AC-004: GIVEN la verificación técnica WHEN se ejecuta `npm run lint` y `npm test` THEN no debe haber errores de tipado, warnings ni regresiones.

## Entities Affected
- `Customer`: tipo de datos en `src/types.ts`.
- `CustomerDirectoryModal.tsx`: componente de presentación y filtrado.

## Ambiguity Log
- [ ] ¿Es suficiente la optimización en frontend (indexación O(1) + paginación por demanda + deferred search) o se requiere además paginación en backend vía `/api/customers`?
      *Evaluación:* Dado que `localStorage` ya aloja los datos en memoria del navegador de la terminal local, la causa raíz del congelamiento es el renderizado DOM de miles de nodos y el $O(N \times M)$ síncrono. La optimización en frontend resuelve el bloqueo de raíz sin romper el funcionamiento offline/local-first. Si el volumen superase los límites de `localStorage` (5-10 MB), se evaluará mover la persistencia a IndexedDB.

## Completion Map
# generated: 2026-09-22T17:50:00Z
# Pre-indexar ventas en Map O(1) y memoizar con useMemo|AC-001,AC-003,BR-001|coder-agent|✅
# Implementar paginación progresiva de tarjetas (batch de 40 items)|AC-001,BR-002|coder-agent|✅
# Implementar búsqueda no bloqueante con useDeferredValue / debounce|AC-002,BR-003|coder-agent|✅
# Tests unitarios de performance de agregación e indexación de clientes|AC-003|tester-agent|✅
# Verificación de lint y suite completa de tests|AC-004|reviewer-agent|✅
