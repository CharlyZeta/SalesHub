#!/usr/bin/env node
/**
 * Instalador idempotente de hooks de git de SalesHub.
 *
 * Se ejecuta automáticamente en cada `npm install` / `npm ci` (script `prepare`), así
 * que un clon nuevo queda con la automatización activa sin pasos manuales.
 *
 * Qué instala:
 *  - `pre-commit`: regenera `docs/MAPA-DEL-CODIGO.md` y lo agrega al commit, para que el
 *    índice del código nunca quede desactualizado (chequeo sin costo de tokens).
 *  - `pre-push`: valida lint, formato, mapa y tests antes de que el commit salga de la
 *    máquina (el CI pasó a ser manual: ver FIX-CI-001 / FIX-CI-002).
 *
 * Qué NO toca:
 *  - `post-commit` de Graphify (reconstrucción del grafo): se preserva tal cual y solo se
 *    avisa si falta.
 *
 * Uso: npm run hooks:install
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARK_START = '# saleshub-hooks-start';
const PRE_PUSH_MARK = '# saleshub-prepush-start';

function gitDir() {
  try {
    return execFileSync('git', ['rev-parse', '--git-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const PRE_COMMIT = `#!/bin/sh
${MARK_START}
# Regenera el mapa del código y lo incluye en el commit (sin costo de tokens).
# Instalado por: npm run hooks:install  (o automáticamente con npm install)

# Evitar interferir con rebase/merge/cherry-pick
GIT_DIR=\${GIT_DIR:-$(git rev-parse --git-dir 2>/dev/null)}
[ -d "$GIT_DIR/rebase-merge" ] && exit 0
[ -d "$GIT_DIR/rebase-apply" ] && exit 0
[ -f "$GIT_DIR/MERGE_HEAD" ] && exit 0
[ -f "$GIT_DIR/CHERRY_PICK_HEAD" ] && exit 0

# Si el repo no tiene dependencias instaladas, no bloquear el commit
command -v node >/dev/null 2>&1 || exit 0

node scripts/generate-code-map.mjs >/dev/null 2>&1 || exit 0

# Agregar el mapa al commit solo si cambió
if ! git diff --quiet -- docs/MAPA-DEL-CODIGO.md 2>/dev/null; then
  git add docs/MAPA-DEL-CODIGO.md
  echo "[saleshub hook] docs/MAPA-DEL-CODIGO.md actualizado y agregado al commit"
fi
# saleshub-hooks-end
`;

const PRE_PUSH = `#!/bin/sh
# saleshub-prepush-start
# Valida lint, formato, mapa y tests antes de pushear.
# Bypass: git push --no-verify
# Instalado por: npm run hooks:install  (o automáticamente con npm install)

if ! command -v node >/dev/null 2>&1; then
  echo "[saleshub] node no disponible: se omite la validación previa al push"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "[saleshub] Sin dependencias instaladas (node_modules): se omite la validación"
  exit 0
fi

# Git entrega por stdin las refs que se van a pushear. Sin refs no hay nada que validar.
REFS=$(cat 2>/dev/null)
if [ -z "$REFS" ]; then
  exit 0
fi

GIT_DIR=\${GIT_DIR:-$(git rev-parse --git-dir 2>/dev/null)}
if [ -d "$GIT_DIR/rebase-merge" ] || [ -d "$GIT_DIR/rebase-apply" ]; then
  echo "[saleshub] Rebase en curso: se omite la validación previa al push"
  exit 0
fi

LOG="$GIT_DIR/saleshub-prepush.log"
FAILED=""

run_check() {
  LABEL="$1"
  shift
  printf "[saleshub] %-10s " "$LABEL"
  if "$@" >"$LOG" 2>&1; then
    echo "OK"
  else
    echo "FALLO"
    FAILED="$FAILED $LABEL"
    tail -n 25 "$LOG" | sed 's/^/    /'
  fi
}

echo "[saleshub] Validando antes del push (para saltear: git push --no-verify)"
run_check "lint" npm run --silent lint
run_check "formato" npm run --silent format:check
run_check "mapa" npm run --silent map:check
run_check "tests" npm run --silent test

if [ -n "$FAILED" ]; then
  echo ""
  echo "[saleshub] Push ABORTADO. Falló:$FAILED"
  echo "[saleshub] Corregí los errores, o salteá con: git push --no-verify"
  exit 1
fi

echo "[saleshub] Todo en orden: continuando con el push."
exit 0
# saleshub-prepush-end
`;

function main() {
  const dir = gitDir();
  if (!dir) {
    console.log('ℹ️  No es un repositorio git: se omiten los hooks.');
    return;
  }

  const hooksDir = path.isAbsolute(dir) ? path.join(dir, 'hooks') : path.join(ROOT, dir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const existing = fs.existsSync(preCommitPath) ? fs.readFileSync(preCommitPath, 'utf8') : '';
  const hasOtherContent = existing.trim().length > 0 && !existing.includes(MARK_START);

  if (hasOtherContent) {
    console.log('⚠️  Ya existe un pre-commit propio: no se modifica (ver .git/hooks/pre-commit).');
  } else if (existing === PRE_COMMIT) {
    console.log('✅ Hook pre-commit ya estaba actualizado.');
  } else {
    fs.writeFileSync(preCommitPath, PRE_COMMIT, 'utf8');
    try {
      fs.chmodSync(preCommitPath, 0o755);
    } catch {
      /* en Windows el bit de ejecución no aplica */
    }
    console.log('✅ Hook pre-commit instalado (regenera docs/MAPA-DEL-CODIGO.md en cada commit).');
  }

  // Hook pre-push (FIX-CI-002): valida antes de que el commit salga de la máquina.
  const prePushPath = path.join(hooksDir, 'pre-push');
  const existingPush = fs.existsSync(prePushPath) ? fs.readFileSync(prePushPath, 'utf8') : '';
  const pushHasOtherContent = existingPush.trim().length > 0 && !existingPush.includes(PRE_PUSH_MARK);

  if (pushHasOtherContent) {
    console.log('⚠️  Ya existe un pre-push propio: no se modifica (ver .git/hooks/pre-push).');
  } else if (existingPush === PRE_PUSH) {
    console.log('✅ Hook pre-push ya estaba actualizado.');
  } else {
    fs.writeFileSync(prePushPath, PRE_PUSH, 'utf8');
    try {
      fs.chmodSync(prePushPath, 0o755);
    } catch {
      /* en Windows el bit de ejecución no aplica */
    }
    console.log('✅ Hook pre-push instalado (lint + formato + mapa + tests antes de cada push).');
  }

  // Aviso (sin tocar nada) sobre el hook de Graphify
  const postCommitPath = path.join(hooksDir, 'post-commit');
  const hasGraphify =
    fs.existsSync(postCommitPath) && fs.readFileSync(postCommitPath, 'utf8').includes('graphify-hook-start');
  if (!hasGraphify) {
    console.log(
      'ℹ️  Hook post-commit de Graphify ausente: ejecutá `graphify hook install` para reconstruir el grafo en cada commit.'
    );
  }
}

main();
