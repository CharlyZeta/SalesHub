# AGENTS.md — Protocolo de trabajo para agentes (SalesHub)

Este archivo lo lee el agente **automáticamente** al iniciar cada sesión. Su objetivo es
doble: que el trabajo sea predecible y que **cada pedido consuma la menor cantidad de
tokens posible**.

---

## 1. Lectura mínima obligatoria (en este orden)

| # | Archivo | Para qué | Tamaño |
|:--|:--|:--|:--|
| 1 | `docs/ESTADO-DEL-PROYECTO.md` | Estado actual, entregado, pendientes y cómo retomar | ~5 KB |
| 2 | `docs/MAPA-DEL-CODIGO.md` | Índice: 1 fila por archivo con responsabilidad y exports | ~5 KB |
| 3 | `docs/FIXES.md` | Registro de incidencias con IDs (A*, B*, W*) y su estado | ~15 KB (leer solo la sección necesaria) |
| 4 | `graphify-out/GRAPH_REPORT.md` | Reporte del grafo: comunidades y nodos centrales | solo si hace falta el panorama |

**No leer nunca `graphify-out/graph.json`** (535 KB ≈ 150k tokens). Para eso existen
`graphify explain` / `graphify path`.

---

## 2. Reglas de economía de tokens (obligatorias)

1. **Localizar antes de leer**: usar `grep` dirigido o `graphify explain "<Nodo>"` y recién
   después leer **el tramo exacto** (`offset` + `limit`), nunca el archivo completo.
2. **Límite de lectura**: no leer archivos de más de ~300 líneas enteros (`BudgetModal`,
   `SpreadsheetGrid`, `SaleFormModal`, `App.tsx`, `ConfigModal` son grandes).
3. **Salida de comandos digerida**: pedir resúmenes (`--reporter=dot`, `Select-String`,
   `git diff --stat`, `Measure-Object`). **Prohibido** volcar logs completos, reportes de
   lint con cientos de líneas o `git status` de decenas de archivos sin filtrar.
4. **Ediciones quirúrgicas**: usar `edit` con el texto exacto. Evitar reescribir archivos
   completos (reescribir un archivo de 1.500 líneas cuesta miles de tokens).
5. **Trabajo pesado → subagente**: exploraciones amplias, auditorías o búsquedas en todo el
   repo se delegan (`subagent`), que devuelve solo el resumen.
6. **Sin volcados en el chat**: no pegar archivos ni JSON enteros; citar rutas y extractos.
7. **Compactar**: al cerrar cada milestone, sugerir `/compact` para cortar el historial.

---

## 3. Ciclo de trabajo

**Al iniciar**
```bash
npm run graph:doctor     # estado del grafo, hooks y artefactos (sin costo de tokens)
npm run lint && npm test # confirmar que el punto de partida está sano
```

**Durante**
- Un pedido = un objetivo verificable (idealmente 1–3 fixes relacionados, no 10).
- Cada cambio de comportamiento se acompaña de su entrada en `docs/FIXES.md` (con ID) y en
  `CHANGELOG.txt`.
- Antes de commitear: `npm run lint` (tsc + ESLint), `npm test`, `npm run build` cuando
  aplique.

**Al cerrar**
```bash
npm run map              # (o lo hace el hook pre-commit automáticamente)
# actualizar docs/ESTADO-DEL-PROYECTO.md (versión, commit, pendientes)
git add -A && git commit -m "…" && git push origin master
```
Luego verificar el CI en GitHub Actions y reportar el resultado. Los mensajes de commit
siguen *Conventional Commits* en español (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).

---

## 4. Automatización ya instalada

| Mecanismo | Qué hace | Cuándo corre |
|:--|:--|:--|
| `hooks:install` (script `prepare`) | Instala los hooks de git | automático en `npm install` / `npm ci` |
| Hook `pre-commit` | Regenera y agrega `docs/MAPA-DEL-CODIGO.md` | en cada commit |
| Hook `post-commit` (Graphify) | Reconstruye el grafo de conocimiento en segundo plano | en cada commit |
| `npm run map:check` | Falla si el mapa quedó desactualizado | en CI |
| `npm run graph:doctor` | Diagnóstico del grafo/hooks/artefactos | a demanda / inicio de sesión |
| CI (`.github/workflows/ci.yml`) | Typecheck + ESLint, tests, build, mapa al día y ciclos de imports | en cada push/PR |

---

## 5. Contexto del proyecto que hay que respetar

- **Dominio**: front-office comercial (ventas, presupuestos AFIP, remitos, envíos) para un
  comercio; **no** reemplaza al ERP.
- **Persistencia**: `localStorage` + IndexedDB (una sola PC). No hay backend de datos; el
  `server.js` solo sirve el build y expone `/api/backup*` y `/api/tracking/andreani/*`.
- **Uso real**: una PC en el local, operadores con teclado. Priorizar claridad y velocidad.
- **Datos sensibles**: `backups/` (PII), claves de WooCommerce y hash de Andreani viven en
  el navegador. **Nunca** commitear `backups/`, `.env`, logs ni el mirror `andreani-shipping/`.
- **Trabajo pendiente**: se gestiona por IDs en `docs/FIXES.md` (prioridad: W2/Fix E y
  W5/Fix D).
- **Infra de tokens**: Graphify (grafo + hook), mapa del código, este archivo y `/compact`.
