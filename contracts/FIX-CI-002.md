# CONTRACT: Hook local pre-push (validación antes de que el commit salga de la máquina)

# ID: FIX-CI-002

# Status: APPROVED

# Mode: LOOP

# Gate-Mode: EXPRESS

# Autorización: pedido directo del dueño (2026-10-30)

# Depende de: FIX-CI-001 (CI solo manual)

## Intent

Con el CI ejecutándose solo a mano (FIX-CI-001), la validación cotidiana quedó a cargo de
acordarse de correr los chequeos. Error humano: lo demuestra el run 25, que falló porque se
pusheó sin pasar Prettier. Se instala un hook **pre-push** que corre los mismos chequeos en
local, en el momento exacto en que el error todavía es barato de arreglar.

## Current Behavior

`npm run hooks:install` instala sólo `pre-commit` (regenera el mapa del código). Nada valida antes
de pushear: los errores aparecen en GitHub, o directamente no aparecen si no se corre el CI.

## Expected Behavior

Al ejecutar `git push`, el hook corre **lint, formato, mapa y tests**. Si algo falla, el push se
aborta con un mensaje que explica qué falló y cómo saltearlo.

## Business Rules

- **BR-CI-005:** El hook valida, en este orden: `lint` (tsc + ESLint), `format:check`,
  `map:check` y `test`. El **build** queda fuera: es el paso más caro y ya lo cubre el CI.
- **BR-CI-006:** El hook es **saltables** explícitamente con `git push --no-verify`, e imprime esa
  instrucción cuando falla. Nunca debe encerrar al usuario.
- **BR-CI-007:** Si no hay dependencias instaladas (`node_modules` ausente) o no hay `node`, el
  hook **no bloquea** el push: avisa y sale en 0.
- **BR-CI-008:** Se instala con el mismo instalador idempotente (`npm run hooks:install`, que corre
  también en `npm install` vía `prepare`) y usa un marcador propio para no pisar un hook ajeno.
- **BR-CI-009:** Debe funcionar en Windows con Git Bash, leyendo el nombre de la rama y el commit
  desde stdin (el hook de git recibe las refs por entrada estándar).

## Acceptance Criteria

- **AC-001:** GIVEN el hook instalado WHEN hago `git push` con los chequeos en verde THEN el push
  se completa y veo el detalle de lo validado.
- **AC-002:** GIVEN el hook instalado WHEN algún chequeo falla THEN el push se **aborta** y el
  mensaje indica cuál falló y que se puede usar `--no-verify`.
- **AC-003:** GIVEN un clon sin `node_modules` WHEN ejecuto el hook THEN sale en 0 sin bloquear.
- **AC-004:** GIVEN un `pre-push` propio del usuario WHEN corro `npm run hooks:install` THEN **no**
  se sobrescribe.

## Entities Affected

- `scripts/install-hooks.mjs` — nueva constante `PRE_PUSH` e instalación idempotente.
- `.git/hooks/pre-push` — generado por el instalador (no se versiona).

## Ambiguity Log

- [x] _¿`pre-push` o `pre-commit`?_ `pre-push`. Un commit local puede quedar a medias; el push es
      el punto donde el error se vuelve visible para el resto. Además el `pre-commit` actual ya hace
      trabajo (mapa) y no conviene volverlo lento.
- [x] _¿Incluir `build`?_ No. Suma ~20-40 s por push y el tipo de error que atrapa (bundling) es
      poco frecuente; queda en el CI manual.
- [x] _¿Instalarlo a mano o por script?_ Por `install-hooks.mjs`, para que un clon nuevo lo tenga
      sin pasos extra (el `prepare` ya corre en `npm install`).

## Evidencia de verificación (2026-10-30)

Los dos caminos de escape se probaron **sin ensuciar el repo real**: el bypass contra un remoto
bare de descarte en `%TEMP%`, y el clon sin dependencias en un repo git vacío aparte.

| AC     | Prueba                                                  | Resultado                                                                        |
| :----- | :------------------------------------------------------ | :------------------------------------------------------------------------------- |
| AC-001 | `git push origin master` real (commit `8a4843e`)        | ✅ los 4 chequeos `OK` y el push se completó                                      |
| AC-002 | Push a remoto de descarte con un archivo fuera de norma | ✅ `Push ABORTADO. Falló: formato` · exit 1 · con `--no-verify` pasó · exit 0      |
| AC-003 | Hook en repo sin `node_modules`                         | ✅ `Sin dependencias instaladas (node_modules): se omite la validación` · exit 0 |
| —      | Hook con stdin vacío (nada que pushear)                 | ✅ exit 0 sin ejecutar chequeos                                                   |

Limpieza posterior: rama `tmp/prepush-test` borrada, remoto `prepush-test` eliminado, sonda
`src/utils/__prepush_probe.ts` inexistente, `master` en `8a4843e`, un solo remoto (`origin`).

## Completion Map

# generated: 2026-10-30T00:00:00Z
# Tarea 1: Generar y instalar pre-push desde install-hooks.mjs|BR-CI-005,BR-CI-007,BR-CI-008|coder-agent|✅
# Tarea 2: Verificar que un push real lo ejecuta y muestra el resultado|AC-001|coder-agent|✅
# Tarea 3: Verificar bypass y clon sin dependencias|AC-002,AC-003|coder-agent|✅
