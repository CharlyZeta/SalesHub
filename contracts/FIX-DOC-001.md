# CONTRACT: Aislar los artefactos de docu (sin tocar la documentación existente)
# ID: FIX-DOC-001
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: EXPRESS
# Autorización: pedido directo del dueño (2026-10-30)

## Intent

Se está probando el proyecto **Docu** sobre este repositorio para evaluar su calidad. La condición
del dueño es triple: **no alterar la documentación existente**, **no pisar nada** y **que nada de
lo generado se cuele en git**.

La generación cumple las dos primeras por diseño (escribe sólo en `docs/generated/` y en `.docu/`,
que son suyos). La tercera no: ambos directorios quedan como *untracked* y un `git add -A` se los
llevaría.

Además apareció un efecto secundario que bloquea el trabajo diario: `prettier --check .` también
revisa archivos **sin trackear**, así que los documentos generados (166 KB de Markdown) y el
manifiesto hacen fallar `format:check` → **el hook `pre-push` aborta todos los pushes**.

## Current Behavior

- `git status` lista `docs/generated/`, `.docu/` y `PROBAR-CON-OTRO-AGENTE.md` como untracked.
- `npm run format:check` devuelve exit 1 nombrando `.docu/manifest.json`,
  `docs/generated/l1-manual-tecnico.md`, `docs/generated/l4-readme.md` y
  `PROBAR-CON-OTRO-AGENTE.md`.

## Expected Behavior

- Ninguno de esos artefactos aparece en `git status` ni puede entrar a un commit.
- `npm run format:check` vuelve a 0 sin tener que formatear documentación generada.
- La documentación existente (`README.md`, `AGENTS.md`, `docs/*.md`, `CHANGELOG.txt`) sigue
  exactamente igual y **sí** sigue cubierta por Prettier.

## Business Rules

- **BR-DOC-001:** `docs/generated/` y `.docu/` se agregan a `.gitignore`: son salida y memoria de
  docu, no fuente del proyecto.
- **BR-DOC-002:** Se agregan también a `.prettierignore`: son documentos **generados**, igual
  criterio que `docs/MAPA-DEL-CODIGO.md` y `contracts/`. Reformatearlos rompería la idempotencia de
  la herramienta que los produce.
- **BR-DOC-003:** `PROBAR-CON-OTRO-AGENTE.md` (copia local de la guía de Docu, en la raíz) se
  ignora en git y en Prettier. Es un archivo de prueba local, no del producto; su copia canónica
  vive en `E:\Propios\Docu\`.
- **BR-DOC-004:** No se borra ni se mueve ningún archivo: sólo se declara qué se ignora.
- **BR-DOC-005:** No se modifica ningún archivo de documentación existente.

## Acceptance Criteria

- **AC-001:** GIVEN los artefactos de docu presentes WHEN ejecuto `git status --porcelain` THEN no
  aparecen `docs/generated/`, `.docu/` ni `PROBAR-CON-OTRO-AGENTE.md`.
- **AC-002:** GIVEN el repo en ese estado WHEN ejecuto `npm run format:check` THEN devuelve 0.
- **AC-003:** GIVEN un `git add -A` WHEN reviso el índice THEN no se agrega ningún archivo de
  `docs/generated/` ni de `.docu/`.
- **AC-004:** GIVEN `git diff` sobre la documentación versionada WHEN lo ejecuto THEN está vacío.

## Entities Affected

- `.gitignore` — tres entradas nuevas.
- `.prettierignore` — tres entradas nuevas.

## Ambiguity Log

- [x] *¿Borrar `PROBAR-CON-OTRO-AGENTE.md` de la raíz?*
      No. Es del dueño y su copia canónica existe en Docu; ignorarlo resuelve el riesgo sin destruir
      nada (BR-DOC-004).
- [x] *¿Ignorar en Prettier o correr `--write` sobre lo generado?*
      Ignorar. Formatear la salida de docu la haría divergir de lo que la herramienta regenera en
      cada corrida, exactamente el problema que ya tuvimos con el mapa del código.
- [x] *¿Sirve de algo el `docs/generated/` generado si no se versiona?*
      Sí: docu lo usa como fuente del servidor MCP (`search_docs`, `get_module`) y para
      `get_freshness`. Se regenera cuando haga falta; no es un entregable del repo.

## Completion Map

# generated: 2026-10-30T00:00:00Z
# Tarea 1: Agregar docs/generated/, .docu/ y la guía local a .gitignore|BR-DOC-001,BR-DOC-003,AC-001,AC-003|coder-agent|✅
# Tarea 2: Agregar los mismos paths a .prettierignore|BR-DOC-002,AC-002|coder-agent|✅
# Tarea 3: Verificar que la documentación existente sigue intacta|BR-DOC-005,AC-004|coder-agent|✅
# Tarea 4: Verificar format:check, map:check, lint y tests en verde|AC-002|coder-agent|✅
