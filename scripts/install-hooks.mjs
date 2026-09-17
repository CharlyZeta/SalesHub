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

  // Aviso (sin tocar nada) sobre el hook de Graphify
  const postCommitPath = path.join(hooksDir, 'post-commit');
  const hasGraphify =
    fs.existsSync(postCommitPath) && fs.readFileSync(postCommitPath, 'utf8').includes('graphify-hook-start');
  if (!hasGraphify) {
    console.log('ℹ️  Hook post-commit de Graphify ausente: ejecutá `graphify hook install` para reconstruir el grafo en cada commit.');
  }
}

main();
