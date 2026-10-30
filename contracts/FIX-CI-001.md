# CONTRACT: CI solo manual y en PRs (desarrollo local sin despliegue)

# ID: FIX-CI-001

# Status: APPROVED

# Mode: LOOP

# Gate-Mode: EXPRESS

# Autorización: decisión del dueño (2026-10-30)

## Intent

El proyecto se desarrolla y se usa **en local**; no hay despliegue. El workflow se disparaba en
cada push a `master`, así que cada commit generaba un run y, cuando fallaba, una notificación por
correo. El pipeline en sí ya está sano (runs 26 y 27 en verde): lo que sobra es la ejecución
automática en cada commit.

## Current Behavior

`.github/workflows/ci.yml` se dispara con `push` a `master`/`main` y con `pull_request`.

## Expected Behavior

El pipeline corre **sólo** cuando se pide a mano (`workflow_dispatch`) o al abrir un PR. Un push
normal a `master` no genera run ni notificación. El badge del README conserva el último resultado
verde.

## Business Rules

- **BR-CI-001:** Se quita el disparador `push`. Quedan `workflow_dispatch` y `pull_request`.
- **BR-CI-002:** **No se borra ni se comenta ningún step.** El pipeline completo (lint, Prettier,
  mapa, ciclos, tests, build) se mantiene intacto para poder ejecutarlo a demanda.
- **BR-CI-003:** El badge no se toca: sigue mostrando el estado del último run (verde, run 27).
- **BR-CI-004:** Si en el futuro se abre el proyecto a terceros o se publica, se vuelve a agregar
  el disparador `push` (una línea).

## Acceptance Criteria

- **AC-001:** GIVEN el workflow modificado WHEN pusheo un commit a `master` THEN **no** se crea un
  run nuevo.
- **AC-002:** GIVEN la pestaña Actions WHEN entro al workflow THEN puedo ejecutarlo a mano con
  "Run workflow".
- **AC-003:** GIVEN el workflow WHEN lo ejecuto a mano THEN corre los mismos 10 pasos de siempre y
  termina en verde.

## Entities Affected

- `.github/workflows/ci.yml` — bloque `on:`.

## Ambiguity Log

- [x] _¿Borrarlo directamente?_ No. Se mantiene el pipeline: sirve como red de seguridad cuando se
      quiera validar algo antes de un hito, y no se pierden los steps.
- [x] _¿`push` desaparece del todo?_ Sí, por eso deja de haber notificaciones. La validación
      cotidiana queda cubierta por `npm run lint` / `npm test` en local.

## Completion Map

# generated: 2026-10-30T00:00:00Z
# Tarea 1: Reemplazar los disparadores por workflow_dispatch + pull_request|BR-CI-001,BR-CI-002,AC-001|coder-agent|✅
# Tarea 2: Verificar que un push ya no dispara el workflow|AC-001|coder-agent|✅
# Tarea 3: Verificar ejecución manual en verde|AC-002,AC-003|humano|❌
