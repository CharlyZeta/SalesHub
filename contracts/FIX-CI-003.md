# CONTRACT: Prettier rompía los Completion Map de los contratos
# ID: FIX-CI-003
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: EXPRESS
# Autorización: corrección de un daño detectado durante FIX-CI-002 (2026-10-30)
# Depende de: nada

## Intent

Al aplicar Prettier sobre `contracts/*.md` (commit `style: aplicar Prettier…`), el bloque
`## Completion Map` perdió su formato. Prettier interpreta cada línea `# Tarea …|agente|✅` como
un heading de Markdown y **inserta una línea en blanco entre cada una**, de modo que las tareas
dejan de estar en líneas consecutivas. Ese bloque es la lista atómica que consume la metodología
SDD-GL: el formato no es cosmético, es datos.

El daño alcanzó a **19 contratos**, incluidos los de features ya cerradas (FEAT-AUTH-002,
FEAT-RBAC-001, FEAT-ENCARGOS-001 y otros).

## Current Behavior

Cada Completion Map tenía una línea en blanco entre tareas, y `npm run format` lo volvía a
introducir en cada pasada. No había forma de tener los contratos formateados *y* con el mapa
íntegro.

## Expected Behavior

Los contratos quedan fuera del alcance de Prettier (como el mapa del código generado) y su
Completion Map vuelve a ser una lista de líneas consecutivas.

## Business Rules

- **BR-CI-010:** `contracts/` se agrega a `.prettierignore`, con el motivo escrito en el archivo.
  Mismo criterio ya aplicado a `docs/MAPA-DEL-CODIGO.md`: lo estructurado/legible por máquina no
  se reformatea.
- **BR-CI-011:** Se repara el formato de los Completion Map dejando las entradas consecutivas, sin
  líneas en blanco intermedias.
- **BR-CI-012:** La reparación es **idempotente** y queda versionada como script
  (`scripts/fix-completion-maps.mjs`) para poder re-ejecutarla si el bloque se vuelve a dañar.
- **BR-CI-013:** No se altera el contenido de ninguna tarea: sólo el espaciado del bloque.

## Acceptance Criteria

- **AC-001:** GIVEN cualquier contrato con Completion Map WHEN lo leo THEN las tareas están en
  líneas consecutivas, sin blancos intermedios.
- **AC-002:** GIVEN `npm run format` WHEN lo ejecuto sobre el repo THEN los Completion Map **no**
  cambian.
- **AC-003:** GIVEN `npm run format:check` WHEN lo ejecuto THEN devuelve 0.

## Entities Affected

- `.prettierignore` — nueva entrada `contracts/`.
- `scripts/fix-completion-maps.mjs` (nuevo) — reparador idempotente.
- `contracts/*.md` — 19 archivos con el bloque normalizado.

## Ambiguity Log

- [x] *¿Fencear el bloque en un code fence o excluir la carpeta?*
      Excluir la carpeta. Fencear cambiaría el formato respecto del histórico del repo y obligaría
      a reescribir 22 contratos; la exclusión resuelve la causa sin tocar el contenido.
- [x] *¿Se pierde cobertura de formato en la documentación?*
      Sí, y es deliberado: los contratos son especificaciones con partes estructuradas. El resto
      del Markdown versionado (`README.md`, `AGENTS.md`, `docs/*`) sigue formateado.

## Completion Map

# generated: 2026-10-30T00:00:00Z
# Tarea 1: Agregar contracts/ a .prettierignore|BR-CI-010,AC-002|coder-agent|✅
# Tarea 2: Reparar los 19 Completion Map dañados|BR-CI-011,BR-CI-013,AC-001|coder-agent|✅
# Tarea 3: Dejar el reparador versionado e idempotente|BR-CI-012|coder-agent|✅
# Tarea 4: Verificar format:check en 0 y maps consecutivos|AC-001,AC-003|coder-agent|✅
