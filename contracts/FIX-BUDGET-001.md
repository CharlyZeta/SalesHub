# CONTRACT: Corrección de Renderizado en Presupuestos y Resiliencia en ProductSearchPicker

# ID: FIX-BUDGET-001

# Status: RESOLVED

# Mode: LOOP

# Gate-Mode: EXPRESS

## Intent

Resolver el error de consola y bloqueo de renderizado `Uncaught TypeError: Cannot read properties of undefined (reading 'trim')` al abrir o interactuar con la pestaña de creación/edición de Presupuestos, blindando el componente `ProductSearchPicker` y alineando los contratos de props.

## Use Case

**Actor:** Operador / Vendedor
**Goal:** Abrir el modal de Presupuestos y agregar o editar ítems con el buscador sensible de catálogo sin excepciones de Javascript.

### Main Flow

1. El usuario abre el modal de Presupuestos y selecciona la pestaña de nuevo presupuesto / edición.
2. `BudgetEditorTab` renderiza la lista de ítems pasando a `ProductSearchPicker` las propiedades estandarizadas `value={item.descripcion || ''}` y `onChangeText`.
3. `ProductSearchPicker` calcula `effectiveValue`, inicializa su término de búsqueda de forma null-safe (`(searchTerm || '').trim()`) y renderiza la lista sin arrojar excepciones.
4. El usuario puede escribir un nombre manual o seleccionar un producto del catálogo de WooCommerce.

### Alternative Flows

- AF-01: El ítem no posee descripción cargada (`undefined` o `null`) → El componente asume string vacío `''` y muestra el placeholder.
- AF-02: El componente recibe props con la nomenclatura anterior (`currentValue` o `onChangeValue`) → Se procesan con retrocompatibilidad transparente.
- AF-03: Los productos del catálogo tienen campos `nombre`, `sku` o `categoria` indefinidos → El filtro evalúa de forma null-safe sin romper la ejecución.

## Business Rules

- BR-001: Toda manipulación de strings en búsquedas y filtros en `ProductSearchPicker` debe ser defensiva y null-safe.
- BR-002: El servidor debe enviar cabeceras anti-caché para el index HTML para evitar desfase de chunks JS en el cliente tras builds.

## Acceptance Criteria

- AC-001: GIVEN un ítem con descripción indefinida WHEN se renderiza `ProductSearchPicker` THEN no debe arrojar `TypeError: Cannot read properties of undefined (reading 'trim')`.
- AC-002: GIVEN el modal de Presupuestos WHEN se abre la pestaña de edición THEN la tabla de ítems debe renderizar correctamente.
- AC-003: GIVEN el proyecto con los cambios aplicados WHEN se ejecuta `npm run lint && npm test && npm run build` THEN todo debe finalizar exitosamente con 0 errores y 0 warnings.

## Entities Affected

- `ProductSearchPicker.tsx`: componente selector/buscador de productos.
- `BudgetEditorTab.tsx`: editor de ítems de presupuesto.
- `server.js`: cabeceras HTTP de caché para assets estáticos.

## Ambiguity Log

- [ ] Sin ambigüedades pendientes.

## Completion Map

# generated: 2026-10-07T17:05:00Z

# Resiliencia y soporte de props en ProductSearchPicker|AC-001|coder-agent|✅

# Estandarización de props en BudgetEditorTab|AC-002|coder-agent|✅

# Verificación de lint, tests y build de producción|AC-003|reviewer-agent|✅
