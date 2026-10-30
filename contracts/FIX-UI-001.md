# CONTRACT: Ensanchar el modal de Configuración y evitar el scroll horizontal de pestañas

# ID: FIX-UI-001

# Status: APPROVED

# Mode: LOOP

# Gate-Mode: EXPRESS

# Autorización: pedido directo del dueño (2026-10-24)

## Intent

El modal de Configuración está pensado para uso en PC, pero quedó dimensionado como un modal de
teléfono (`max-w-3xl` = 768 px). Con seis pestañas, la barra superior no entra y aparece un
**scroll horizontal incómodo** que obliga a arrastrar para llegar a las últimas pestañas.

## Current Behavior

- `ConfigModal.tsx:371`: panel con `max-w-3xl`.
- `ConfigModal.tsx:394`: barra de pestañas con `overflow-x-auto` y botones `whitespace-nowrap`;
  al no entrar en 768 px, se genera scroll horizontal.

## Expected Behavior

En pantallas de escritorio el modal aprovecha el ancho disponible (sin llegar a pegarse a los
bordes) y **todas las pestañas se ven de una sola vez**: si por ancho no entran en una fila, se
acomodan en una segunda en lugar de exigir scroll horizontal.

## Business Rules

- **BR-UI-001:** El ancho máximo del panel pasa a `max-w-6xl` (1152 px) manteniendo `w-full`, para
  que en pantallas chicas siga achicándose solo.
- **BR-UI-002:** La barra de pestañas usa `flex-wrap`: **nunca** scroll horizontal. Se conserva
  `whitespace-nowrap` en cada botón para que el texto no se corte.
- **BR-UI-003:** Es un cambio exclusivamente de presentación: no se toca lógica, estado, permisos
  ni el guardado de configuración.
- **BR-UI-004:** Debe seguir funcionando en tema claro y oscuro y en ventanas angostas.

## Acceptance Criteria

- **AC-001:** GIVEN una pantalla de escritorio WHEN abro Configuración THEN el modal se ve
  claramente más ancho que antes y las seis pestañas entran en una fila.
- **AC-002:** GIVEN una ventana angosta WHEN abro Configuración THEN las pestañas se acomodan en
  varias filas y **no** aparece scroll horizontal.
- **AC-003:** GIVEN el modal ensanchado WHEN recorro las pestañas THEN el contenido de cada una se
  adapta al nuevo ancho sin desbordes.

## Entities Affected

- `src/components/ConfigModal.tsx` — dos clases: ancho del panel y comportamiento de la barra.

## Ambiguity Log

- [x] _¿`max-w-5xl` o `max-w-6xl`?_ `max-w-6xl` (1152 px): en 1080p deja márgenes cómodos y
      permite que las pestañas entren sin partirse. `5xl` (1024 px) seguía apretando con seis pestañas.
- [x] _¿Scroll horizontal con degradado o wrap?_ Wrap. El scroll horizontal es justamente lo que
      molestaba; envolver es predecible y no esconde pestañas.

## Completion Map

# generated: 2026-10-24T00:00:00Z

# Tarea 1: Ensanchar el panel a max-w-6xl|BR-UI-001,AC-001|coder-agent|✅

# Tarea 2: Barra de pestañas con flex-wrap, sin overflow horizontal|BR-UI-002,AC-002|coder-agent|✅

# Tarea 3: Verificación visual en escritorio y ventana angosta|AC-001,AC-002,AC-003|humano|❌
