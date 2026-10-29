# CONTRACT: Filtro por Estado de Pago y Listado de Cobros Pendientes (cross-mes) con Export PDF

# ID: FEAT-PAY-002

# Status: APPROVED

# Mode: LOOP

# Gate-Mode: STRICT

# Depende de: FEAT-PAY-001 (libro de pagos y saldo/estado derivados)

## Intent

Con el estado de pago ya modelado (FEAT-PAY-001), falta poder **encontrar la deuda**. La
planilla filtra por mes (`SpreadsheetGrid.tsx:141`), lo que esconde lo que se debe de meses
anteriores: justo lo que más interesa cobrar. Se agrega (a) un **filtro por estado de pago** en
la planilla y (b) un **listado de cobros pendientes que ignora el mes en curso**, en pantalla, con
**exportación a PDF** de los datos principales.

## Use Case

**Actor:** Administrador / Operador con acceso a `ventas`
**Goal:** ver de una sola vez todo lo que falta cobrar, de cualquier mes, y llevarse el listado.

### Main Flow

1. **Filtro en la planilla:** en la barra de herramientas aparece un selector
   _Estado de pago_ (`Todos` | `Pagado` | `Pago parcial` | `Pendiente`). Al elegir uno, la grilla
   y sus totales se recalculan.
2. **Listado de cobros pendientes:** el botón "Cobros pendientes" abre un modal con **todas** las
   ventas con saldo > 0, **sin importar el mes**, ordenadas por fecha ascendente (la más vieja
   primero).
3. El modal muestra un resumen: cantidad de ventas, total facturado, total cobrado y **total a
   cobrar**.
4. El botón **Exportar PDF** genera un A4 con membrete de la empresa, fecha de emisión, la tabla
   de ventas pendientes y el resumen de totales.

### Alternative Flows

- **AF-01 (Sin deuda):** si no hay ventas con saldo, el modal muestra un estado vacío explícito
  ("No hay cobros pendientes") y el botón de PDF queda deshabilitado.
- **AF-02 (Búsqueda):** se puede buscar por cliente, comprobante o producto dentro del listado.
- **AF-03 (Día de corte):** se puede acotar opcionalmente el listado por rango de fechas, pero
  **por defecto arranca sin filtro de fecha** (cross-mes).
- **AF-04 (Solo lectura):** el listado es de consulta; no permite editar ventas desde ahí.

## Business Rules

- **BR-PAY-009:** El listado de cobros pendientes **no depende de `showAllMonths`** ni del mes
  seleccionado en el KPI: siempre barre el histórico completo, salvo que el usuario fije un rango
  explícito (AF-03).
- **BR-PAY-010:** "Pendiente de cobro" es toda venta con saldo > 0 (`parcial` o `pendiente`).
  `pagado` nunca aparece en el listado.
- **BR-PAY-011:** Los totales del resumen se calculan sobre el conjunto filtrado, no sobre el
  total del sistema, y se muestran formateados con `formatCurrency`.
- **BR-PAY-012:** El PDF se genera con `jspdf` en modo **vectorial** (texto y líneas), no con
  captura `html-to-image`: así el archivo es liviano, la tabla se puede copiar y sale nítida. No
  se agrega ninguna dependencia nueva.
- **BR-PAY-013:** El PDF incluye: empresa y fecha de emisión en el encabezado, tabla con
  **fecha, cliente, comprobante, total, cobrado, saldo y estado**, y el resumen de totales al
  pie. Si hay más filas que una página, se pagina automáticamente repitiendo el encabezado de
  tabla.
- **BR-PAY-014:** El acceso al botón "Cobros pendientes" respeta RBAC: requiere `ventas` con
  permiso `read` o superior. En modo `read` el listado y el PDF funcionan igual (son de consulta).
- **BR-PAY-015:** El filtro de estado de pago de la planilla convive con los filtros existentes
  (búsqueda, canal, mes) y se aplica **después** de ellos.

## Acceptance Criteria

- **AC-001:** GIVEN la planilla WHEN elijo "Pendiente" en el filtro de estado de pago THEN solo
  veo ventas con saldo y los totales del pie se recalculan.
- **AC-002:** GIVEN ventas pendientes de tres meses distintos WHEN abro "Cobros pendientes" THEN
  aparecen todas, sin importar el mes seleccionado.
- **AC-003:** GIVEN el modal abierto WHEN miro el resumen THEN muestra cantidad, total facturado,
  cobrado y a cobrar del conjunto filtrado.
- **AC-004:** GIVEN el modal WHEN pulso "Exportar PDF" THEN descargo un A4 con membrete, tabla de
  ventas pendientes y totales, con texto seleccionable.
- **AC-005:** GIVEN el listado WHEN no hay ventas con saldo THEN veo el estado vacío y el botón
  de PDF deshabilitado.
- **AC-006:** GIVEN un usuario con `ventas` en `read` WHEN abre el listado THEN puede verlo y
  exportar, pero no editar ventas.
- **AC-007:** GIVEN la suite WHEN corro `npm test` THEN hay tests de: filtrado por estado, barrido
  cross-mes, cálculo de totales del resumen y armado de las filas del PDF.

## Entities Affected

- `src/components/SpreadsheetGrid.tsx` — estado del filtro por estado de pago y aplicación en
  `filteredSales`.
- `src/components/grid/GridToolbar.tsx` — selector "Estado de pago".
- `src/components/CobrosPendientesModal.tsx` (nuevo) — listado cross-mes, resumen, PDF y acceso
  a la cuenta corriente del cliente (FEAT-PAY-003).
- `src/utils/cobrosPendientes.ts` (nuevo) — selección de ventas con saldo, totales y filas del
  PDF (funciones puras, testeables).
- `src/utils/pdfCobros.ts` (nuevo) — composición del PDF con `jspdf` (patrón de
  `RemitoModal.tsx:112-160`).
- `src/components/Header.tsx` — botón de acceso al listado, según permisos de `ventas`.
- `src/App.tsx` — estado de apertura del modal y lazy loading (patrón de los demás modales).
- `src/__tests__/cobrosPendientes.test.ts` (nuevo).

## Ambiguity Log

- [x] _¿Alcanza con el toggle `showAllMonths` que ya existe?_
      No. Ese toggle es global y afecta KPIs y planilla; el requisito es un listado de deuda
      acotado a saldo > 0, con resumen y PDF propios. Se reutiliza el criterio de "no filtrar por
      mes", no el estado global.
- [x] _¿`html-to-image` o `jspdf` vectorial?_
      Vectorial. El proyecto ya usa ambos patrones; para una tabla de datos el vectorial es
      nítido, liviano y no depende de la resolución del DOM.
- [x] _¿El listado es un modal nuevo o una pestaña de la planilla?_
      Modal nuevo: no recarga la grilla mensual y permite el flujo "abro, miro la deuda, exporto".
- [ ] _¿Conviene incluir el teléfono del cliente en el PDF para gestionar el cobro?_
      Propuesta: **no** por defecto (dato personal innecesario en un PDF que puede circular); si
      lo querés, se agrega en una segunda pasada.

## Completion Map

# generated: 2026-10-24T00:00:00Z

# Tarea 1: Utilidades puras de selección de deuda y totales|BR-PAY-009,BR-PAY-010,BR-PAY-011|coder-agent|✅

# Tarea 2: Filtro por estado de pago en la planilla y su toolbar|AC-001|coder-agent|✅

# Tarea 3: Modal de cobros pendientes cross-mes con resumen|AC-002,AC-003,AC-005|coder-agent|✅

# Tarea 4: Export PDF vectorial con membrete, tabla paginada y totales|BR-PAY-012,BR-PAY-013,AC-004|coder-agent|✅

# Tarea 5: Botón en Header con gating RBAC y lazy load (con contador)|BR-PAY-014,AC-006|coder-agent|✅

# Tarea 6: Tests de filtrado, cross-mes, totales y armado de filas|AC-007|coder-agent|✅

# Tarea 7: Verificación visual del listado y del PDF en claro/oscuro|AC-004|humano|❌
