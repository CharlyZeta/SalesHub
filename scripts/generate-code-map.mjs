#!/usr/bin/env node
/**
 * Genera `docs/MAPA-DEL-CODIGO.md`: un índice compacto del código (una fila por
 * archivo con su responsabilidad y sus exports principales).
 *
 * ¿Para qué? Para que un agente (o una persona) pueda entender la estructura del
 * proyecto leyendo ~1 página en lugar de abrir decenas de archivos completos. Es la
 * forma más barata de "grafo" para el 90 % de las consultas del día a día.
 *
 * Uso:
 *   npm run map          → regenera el archivo
 *   npm run map:check    → falla (exit 1) si el archivo está desactualizado (CI)
 *
 * Sin dependencias externas: solo Node + fs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'docs', 'MAPA-DEL-CODIGO.md');
const SCAN_DIRS = ['src', 'scripts'];
const CHECK = process.argv.includes('--check');

/** Archivos que no aportan al mapa. */
const IGNORE = [/\.d\.ts$/, /__tests__[\\/]/, /node_modules/, /dist/, /coverage/];

/**
 * Descripciones curadas de los módulos principales (lo que un índice automático no
 * puede inferir). Si un archivo no está acá, se usa su comentario de cabecera.
 */
const DESCRIPTIONS = {
  'src/App.tsx': 'Orquestador principal: estado global, persistencia, efectos de sync y montaje de modales',
  'src/main.tsx': 'Punto de entrada de React (render del árbol en #root)',
  'src/types.ts': 'Modelo de dominio tipado (Sale, Budget, Customer, CatalogProduct, AppConfig, seguridad)',
  'src/components/Header.tsx': 'Barra superior: marca, KPIs rápidos, accesos a modales, tema y bloqueo de sesión',
  'src/components/KpiSummary.tsx': 'Banner de KPIs mensuales, filtro por mes/canal y configuración de tarjetas visibles',
  'src/components/SpreadsheetGrid.tsx': 'Planilla interactiva de ventas: edición inline, filtros, paginación y tracking Andreani',
  'src/components/SaleFormModal.tsx': 'Alta/edición de ventas: cliente, ítems con descuento, facturación, envío y borrador autoguardado',
  'src/components/BudgetModal.tsx': 'Presupuestos AFIP: ítems, IVA/percepciones, PDF y conversión a venta',
  'src/components/SendBudgetModal.tsx': 'Envío omnicanal de presupuestos por WhatsApp (wa.me) y correo (mailto)',
  'src/components/RemitoModal.tsx': 'Remito de entrega/despacho: datos de empresa, transporte, PDF e impresión',
  'src/components/CustomerDirectoryModal.tsx': 'Directorio de clientes: búsqueda, historial de compras y alta de clientes',
  'src/components/WooCommerceModal.tsx': 'Sincronización WooCommerce: credenciales, catálogo, clientes y programación',
  'src/components/ProductSearchPicker.tsx': 'Buscador autocompletable de productos del catálogo',
  'src/components/SaleLocationMap.tsx': 'Mapa Leaflet/OSM con geocodificación Nominatim y pin arrastrable',
  'src/components/ImportModal.tsx': 'Importador CSV / pegado desde Google Sheets con mapeo de columnas',
  'src/components/ExportModal.tsx': 'Exportador de ventas a CSV por rango y canal',
  'src/components/AnalyticsModal.tsx': 'Panel de analítica con gráficos Recharts (tendencia y distribución por canal)',
  'src/components/SystemLogsModal.tsx': 'Consola de auditoría: filtros por nivel/categoría/fecha y exportación',
  'src/components/ConfigModal.tsx': 'Configuración del sistema: shell del modal, estado compartido, guardado y pestañas',
  'src/components/ConfigGeneralTab.tsx': 'Pestaña General & Ventas: canales, pagos, envíos, Andreani, numeración e importación',
  'src/components/ConfigEmpresaTab.tsx': 'Pestaña Empresa / Firma: identidad, logo, datos fiscales y puntos de venta',
  'src/components/ConfigSecurityTab.tsx': 'Pestaña Seguridad & PIN: control de acceso, inactividad y restricciones por rol',
  'src/components/ConfigBackupsTab.tsx': 'Pestaña Copias de seguridad: backup automático, copia manual y restauración',
  'src/components/AuthModal.tsx': 'Auth Gate: PIN, selección de rol (RBAC) y bloqueo progresivo por intentos',
  'src/utils/formatters.ts': 'Formateo ARS/fechas, validaciones de venta, IDs y sanitización de CSV',
  'src/utils/logger.ts': 'Motor de auditoría (localStorage + eventos) con filtros y exportación',
  'src/utils/security.ts': 'Hash de PIN (SHA-256), verificación retrocompatible y escalada de bloqueo',
  'src/utils/backupService.ts': 'Backups en IndexedDB y disco (API /api/backup) con rotación',
  'src/utils/budgetDelivery.ts': 'Plantillas de envío de presupuestos (WhatsApp/correo) y normalización de teléfonos',
  'src/utils/numberToWords.ts': 'Conversión de importes a texto (para comprobantes)',
  'src/utils/wooCommerceApi.ts': 'Cliente REST de WooCommerce: productos y clientes paginados',
  'src/utils/andreaniStatusMapper.ts': 'Mapeo canónico de estados de Andreani a estados del sistema',
  'src/utils/andreaniSyncService.ts': 'Consulta en lote del tracking de Andreani con caché de 60 s',
  'src/data/initialData.ts': 'Datos semilla opcionales (demo), configuración inicial y empresa por defecto',
  'scripts/generate-code-map.mjs': 'Generador de este mapa (npm run map / map:check)',
  'scripts/graph-doctor.mjs': 'Diagnóstico del grafo de conocimiento y de los hooks (npm run graph:doctor)',
  'scripts/install-hooks.mjs': 'Instalación automática de hooks de git (npm install / npm run hooks:install)',
};

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (IGNORE.some((re) => re.test(full))) continue;
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

/** Primera línea útil del comentario de cabecera del archivo. */
function headerSummary(content) {
  const block = content.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (block) {
    const line = block[1]
      .split('\n')
      .map((l) => l.replace(/^\s*\*?\s?/, '').trim())
      .find((l) => l.length > 12 && !l.startsWith('@'));
    if (line) return line.replace(/\s+/g, ' ');
  }
  const lineComment = content.match(/^\/\/\s*(.+)$/m);
  if (lineComment) return lineComment[1].trim();
  return '';
}

/** Exports principales del archivo (nombre + tipo). */
function exportedSymbols(content) {
  const symbols = [];
  const patterns = [
    /export\s+const\s+([A-Za-z0-9_$]+)\s*[:=]/g,
    /export\s+function\s+([A-Za-z0-9_$]+)/g,
    /export\s+async\s+function\s+([A-Za-z0-9_$]+)/g,
    /export\s+interface\s+([A-Za-z0-9_$]+)/g,
    /export\s+type\s+([A-Za-z0-9_$]+)/g,
    /export\s+class\s+([A-Za-z0-9_$]+)/g,
  ];
  for (const re of patterns) {
    for (const match of content.matchAll(re)) symbols.push(match[1]);
  }
  if (/export\s+default\s+/.test(content) && symbols.length === 0) symbols.push('(default)');
  return [...new Set(symbols)];
}

function describeFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const lines = content.split('\n').length;
  const exports = exportedSymbols(content);
  return {
    rel,
    dir: path.dirname(rel),
    name: path.basename(rel),
    lines,
    summary: DESCRIPTIONS[rel] || headerSummary(content),
    exports: exports.join(', '),
  };
}

function buildMarkdown() {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))).map(describeFile);
  const byDir = new Map();
  for (const f of files.sort((a, b) => a.rel.localeCompare(b.rel))) {
    if (!byDir.has(f.dir)) byDir.set(f.dir, []);
    byDir.get(f.dir).push(f);
  }

  const totalLines = files.reduce((acc, f) => acc + f.lines, 0);
  const out = [];
  out.push('# Mapa del Código — SalesHub');
  out.push('');
  out.push('> **Archivo generado automáticamente** por `npm run map` (no editar a mano).');
  out.push('> Es el índice que conviene leer **antes** de abrir archivos: una fila por módulo');
  out.push('> con su responsabilidad y sus exports principales.');
  out.push('');
  out.push(`**Resumen:** ${files.length} archivos · ${totalLines.toLocaleString('es-AR')} líneas.`);
  out.push('');
  out.push('| Directorio | Archivos | Líneas |');
  out.push('|:--|--:|--:|');
  for (const [dir, list] of [...byDir.entries()].sort()) {
    out.push(`| \`${dir}/\` | ${list.length} | ${list.reduce((a, f) => a + f.lines, 0).toLocaleString('es-AR')} |`);
  }
  out.push('');

  for (const [dir, list] of [...byDir.entries()].sort()) {
    out.push(`## \`${dir}/\``);
    out.push('');
    out.push('| Archivo | Líneas | Responsabilidad | Exports |');
    out.push('|:--|--:|:--|:--|');
    for (const f of list) {
      const summary = (f.summary || '—').replace(/\|/g, '\\|');
      const exports = (f.exports || '—').replace(/\|/g, '\\|');
      out.push(`| \`${f.name}\` | ${f.lines} | ${summary} | ${exports} |`);
    }
    out.push('');
  }

  out.push('## Documentación de referencia');
  out.push('');
  out.push('| Documento | Contenido |');
  out.push('|:--|:--|');
  out.push('| `AGENTS.md` | Protocolo de sesión para agentes (lectura mínima, ahorro de tokens) |');
  out.push('| `docs/ESTADO-DEL-PROYECTO.md` | Estado actual, entregado, pendientes y cómo retomar |');
  out.push('| `docs/FIXES.md` | Registro de correcciones aplicadas y deuda pendiente (IDs) |');
  out.push('| `CHANGELOG.txt` | Historial de versiones |');
  out.push('| `graphify-out/GRAPH_REPORT.md` | Reporte del grafo de conocimiento (comunidades, nodos centrales) |');
  out.push('');
  return out.join('\n');
}

const markdown = buildMarkdown();

if (CHECK) {
  const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
  if (current !== markdown) {
    console.error('❌ docs/MAPA-DEL-CODIGO.md está desactualizado. Ejecutá: npm run map');
    process.exit(1);
  }
  console.log('✅ docs/MAPA-DEL-CODIGO.md está actualizado.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, markdown, 'utf8');
console.log(`✅ Mapa generado: docs/MAPA-DEL-CODIGO.md (${markdown.split('\n').length} líneas)`);
