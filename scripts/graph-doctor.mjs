#!/usr/bin/env node
/**
 * Diagnóstico del grafo de conocimiento (Graphify) y de la automatización.
 *
 * No modifica nada: informa el estado y qué hacer si algo falta. Pensado para
 * ejecutarse al inicio de una sesión de trabajo (o cuando "el agente dice que no
 * encuentra las cosas").
 *
 * Uso: npm run graph:doctor
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'graphify-out');
const GRAPH = path.join(OUT, 'graph.json');
const REPORT = path.join(OUT, 'GRAPH_REPORT.md');

const results = [];
const ok = (msg) => results.push(['✅', msg]);
const warn = (msg) => results.push(['⚠️', msg]);
const bad = (msg) => results.push(['❌', msg]);

function kb(file) {
  return `${Math.round(fs.statSync(file).size / 1024)} KB`;
}

// 1. Grafo presente y tamaño
if (fs.existsSync(GRAPH)) {
  ok(`Grafo presente: graphify-out/graph.json (${kb(GRAPH)})`);
} else {
  bad('No existe graphify-out/graph.json → ejecutá `graphify` (o el rebuild del hook) para generarlo');
}

if (fs.existsSync(REPORT)) {
  ok(`Reporte de arquitectura: graphify-out/GRAPH_REPORT.md (${kb(REPORT)}) — es el resumen más barato para entender el sistema`);
} else {
  warn('Falta graphify-out/GRAPH_REPORT.md (se genera con el análisis de Graphify)');
}

// 2. Frescura: el grafo debe ser más nuevo que el archivo de código más reciente.
//    (Comparar contra la fecha del commit daba falsos positivos: el hook puede
//    reconstruir y decidir "sin cambios topológicos", dejando las salidas intactas.)
if (fs.existsSync(GRAPH)) {
  const graphTime = fs.statSync(GRAPH).mtime;
  let newestSource = null;
  let newestTime = 0;
  const scan = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const t = fs.statSync(full).mtimeMs;
        if (t > newestTime) {
          newestTime = t;
          newestSource = path.relative(ROOT, full);
        }
      }
    }
  };
  scan(path.join(ROOT, 'src'));

  if (!newestSource || graphTime.getTime() >= newestTime) {
    ok('Grafo al día respecto del código fuente');
  } else {
    warn(
      `El grafo todavía no cubre el último cambio: ${newestSource} (${new Date(newestTime).toLocaleString()}) ` +
        `es más nuevo que graph.json (${graphTime.toLocaleString()}). Se reconstruye solo al commitear; ` +
        `log: ${path.join(process.env.HOME || process.env.USERPROFILE || '', '.cache', 'graphify-rebuild.log')}`
    );
  }
}

// 3. Hooks de git
const hooksDir = path.join(ROOT, '.git', 'hooks');
const postCommit = path.join(hooksDir, 'post-commit');
const preCommit = path.join(hooksDir, 'pre-commit');
if (fs.existsSync(postCommit) && fs.readFileSync(postCommit, 'utf8').includes('graphify-hook-start')) {
  ok('Hook post-commit de Graphify instalado (reconstruye el grafo en cada commit)');
} else {
  warn('Hook post-commit de Graphify ausente → `graphify hook install`');
}
if (fs.existsSync(preCommit) && fs.readFileSync(preCommit, 'utf8').includes('saleshub-hooks-start')) {
  ok('Hook pre-commit de SalesHub instalado (regenera y agrega docs/MAPA-DEL-CODIGO.md)');
} else {
  warn('Hook pre-commit de SalesHub ausente → `npm run hooks:install`');
}

// 4. CLI de graphify y versión del skill
try {
  const version = execFileSync('graphify', ['--version'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ok(`CLI graphify disponible (${version.split('\n')[0]})`);
} catch {
  warn('CLI `graphify` no disponible en PATH (los comandos explain/path no funcionarán)');
}

// 5. Artefactos de bajo costo para agentes
const map = path.join(ROOT, 'docs', 'MAPA-DEL-CODIGO.md');
if (fs.existsSync(map)) ok(`Mapa del código presente (docs/MAPA-DEL-CODIGO.md, ${kb(map)})`);
else warn('Falta docs/MAPA-DEL-CODIGO.md → `npm run map`');

const agents = path.join(ROOT, 'AGENTS.md');
if (fs.existsSync(agents)) ok('AGENTS.md presente (protocolo de sesión que el agente lee automáticamente)');
else warn('Falta AGENTS.md (sin él, cada sesión vuelve a explorar el repo desde cero)');

// Salida
console.log('\n🩺 Diagnóstico del grafo y la automatización\n');
for (const [icon, msg] of results) console.log(`${icon} ${msg}`);
const problems = results.filter(([icon]) => icon !== '✅').length;
console.log(`\n${problems === 0 ? 'Todo en orden.' : `${problems} punto(s) a revisar (ver arriba).`}\n`);
