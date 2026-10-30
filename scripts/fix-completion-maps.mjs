// Repara los "Completion Map" de contracts/*.md dejando las tareas en líneas
// consecutivas (formato canónico del protocolo SDD-GL).
// Contexto: Prettier interpreta las líneas `# Tarea ...` como headings y mete
// líneas en blanco entre ellas, rompiendo el bloque. Ver FIX-CI-003.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('contracts');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md'));

let tocados = 0;

for (const file of files) {
  const full = path.join(DIR, file);
  const original = fs.readFileSync(full, 'utf8');
  const lines = original.split(/\r?\n/);

  const start = lines.findIndex((l) => /^##\s+Completion Map\s*$/.test(l));
  if (start === -1) continue;

  // Fin de la sección: el próximo heading de nivel 2 (o EOF).
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const seccion = lines.slice(start + 1, end);
  const entradas = seccion.filter((l) => l.trim() !== '');
  if (entradas.length === 0) continue;

  const nuevas = [lines[start], '', ...entradas, ''];
  const reconstruido = [...lines.slice(0, start), ...nuevas, ...lines.slice(end)].join('\n');

  if (reconstruido !== original) {
    fs.writeFileSync(full, reconstruido, 'utf8');
    tocados++;
    console.log(`✔ ${file}`);
  }
}

console.log(`\nContratos reparados: ${tocados}/${files.length}`);
