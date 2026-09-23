# Estado del Proyecto y de la Sesión — SalesHub

Documento de **handoff**: qué se hizo, cómo quedó el repositorio y qué sigue.
Pensado para retomar el trabajo en cualquier momento (o para que otra persona entienda
el punto exacto en el que está el desarrollo).

**Última actualización:** 2026-09-23
**Versión del proyecto:** 0.0.27
**Commit de cierre:** el último de `master` (`git log -1 --oneline`)
**Repositorio:** https://github.com/CharlyZeta/SalesHub (rama `master`)

---

## 1. Resumen ejecutivo

SalesHub es el sistema de **front-office comercial** (ventas, presupuestos AFIP, remitos,
omnicanalidad y seguimiento de envíos) que complementa al ERP de la firma. En esta sesión
el proyecto pasó de un estado funcional pero con deuda acumulada a un estado **ordenado,
documentado, con lint/CI reales y los problemas de sincronización resueltos**.

| Área | Estado |
|:--|:--|
| Calidad | `npm run lint` (tsc + ESLint): **0 errores / 0 warnings** |
| Tests | **13 archivos / 128 tests** (Vitest) |
| Cobertura | utils **82,5 %** · global **76,5 %** (`security.ts` 95,5 %) |
| Build | Producción OK |
| CI | GitHub Actions **en verde** en cada push (typecheck + lint, tests, build) |
| Sincronización WooCommerce | **Funcionando según la configuración** (validado en uso real) |
| Repositorio | Sincronizado: local = remoto, árbol limpio |

---

## 2. Qué se entregó en esta sesión

### 2.1 Infraestructura y despliegue
- **`server.js`** (servidor de producción Node) + **`api-handlers.js`** (capa de API
  compartida): sirve el build estático y expone `/api/backup*` y `/api/tracking/andreani/*`
  tanto en desarrollo como en producción.
- Scripts nuevos: `npm start`, `npm run stable` (build + server, **sin recargas**),
  `npm run dev:stable` (dev sin HMR ni watcher).

### 2.2 Seguridad
- PIN **siempre hasheado** (salt `saleshub::`, con verificación retrocompatible del salt
  legacy), **bloqueo progresivo** por intentos fallidos, **Auth Gate al iniciar** y
  validación que impide habilitar la seguridad con el PIN predeterminado.

### 2.3 Robustez y UX
- **Anti-parpadeo (FOUC)** del tema: el modo oscuro se aplica antes del primer pintado.
- **Borrador autoguardado** del formulario de venta: si la página se recarga, al reabrir se
  recupera la venta a medio cargar (con aviso y opción de descartar).
- **Auto-bloqueo consciente de visibilidad**: cambiar de ventana ya no bloquea la app.
- **Rotación de backups**: 30 copias / mínimo 7 días (disco e IndexedDB), configurable.

### 2.4 Sincronización WooCommerce (Fix A + Fix C + Fix E + Fix D) ✅
- **Fix A**: la programación depende solo de `autoSync` + URL + credenciales; el flag de
  seguridad pasó a restringir únicamente la edición de claves a Operadores.
- **Fix C**: **backoff exponencial** (1 → 30 min) ante fallos, con motivo en el log de
  auditoría y **banner en pantalla** con el próximo reintento.
- **Fix E (W2)**: la sincronización ahora corre **en el servidor** (`server-woo.js` +
  temporizador en `server.js`), así que **funciona con la app cerrada** y **sin CORS**. La
  app publica la configuración, importa el snapshot automáticamente y, si no hay servidor,
  mantiene el modo navegador como respaldo.
- **Fix D (W5)**: la sincronización **combina (merge) en lugar de reemplazar** — conserva
  productos manuales e historial de clientes; y el **modo demo dejó de simular**: ante un
  fallo de la API el error se propaga (el demo requiere `VITE_WOO_DEMO=true`).
- **Validado en uso real:** la sincronización se ejecuta según el intervalo configurado
  (W1 y W4 verificados por el usuario con los logs).

### 2.5 Neutralización de marca y autoría
- Sin rastro de datos del cliente en archivos versionados; defaults neutros; producto
  renombrado a **SalesHub**; autoría **Gerardo Maidana** (`LICENSE` MIT, `package.json`,
  README) e identidad git del repositorio actualizada.

### 2.6 Documentación
- `docs/FIXES.md`: tablero de incidencias (A1–A5, B1–B9, W1–W6) con síntoma, causa,
  solución, verificación y estado.
- `README.md`: badges reales, cobertura al día, modos de ejecución, comportamiento de la
  sincronización y notas de despliegue.
- `CHANGELOG.txt`: entradas `[0.0.10]` a `[0.0.19]` con todo lo anterior.

### 2.7 Commits de la sesión
| Commit | Contenido |
|:--|:--|
| `c19abc5` | Servidor de producción, endurecimiento de PIN, refactor de UI, lint y neutralización de marca |
| `928c756` | Fixes pendientes (CI lint, hooks del mapa, copiado de tracking, retención de backups, datos demo) |
| `cc0bd74` | Sincronización WooCommerce: respeta la configuración y los fallos dejan de ser silenciosos (Fix A + C) |
| `5989c8c` | Documento de estado del proyecto y de la sesión (handoff) |
| `b00f84a` | Infraestructura automática de ahorro de tokens (AGENTS.md, mapa del código, hooks, chequeos CI) |
| `0ea7ba2` | Ajuste del diagnóstico del grafo y corrección de un `&` literal en JSX |
| `9f06645` | **W2 / Fix E paso 1**: sincronización de WooCommerce del lado del servidor |
| `7d11d9e` | **W2 / Fix E paso 2**: programación en el servidor + importación del snapshot en la app |
| `d0bdbec` | **W5 / Fix D**: merge en lugar de reemplazo y fin del catálogo demo como falso éxito |

---

## 3. Estado técnico actual

- **Stack:** React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4.1 · Recharts · Leaflet ·
  Lucide · Motion. Tooling: Vitest 4.1 · ESLint 10 · Prettier 3.9.
- **Tamaño:** 21 componentes y 9 módulos de utilidades (~12.800 líneas de producción).
- **Persistencia:** `localStorage` (estado de la app) + IndexedDB y disco (backups).
  Definido para **una sola PC en el local** (no requiere backend de datos).
- **Datos demo:** desactivados por defecto (`VITE_SEED_DEMO`); una instalación nueva arranca
  vacía.
- **API externas:** WooCommerce REST (catálogo/clientes), Nominatim/OSM (geocoding),
  Andreani (tracking), WhatsApp `wa.me` y `mailto:`.

---

## 4. Pendientes priorizados

Detalle completo, con causa y plan, en `docs/FIXES.md`.

| Prioridad | ID | Pendiente |
|:--:|:--|:--|
| Media | **B8** | Endurecimiento: no precargar claves en el modal + revisar defaults de seguridad |
| Media | **B3 (resto)** | Tests de componentes UI (requiere `@testing-library/react` + jsdom) y completar cobertura de `wooCommerceApi` |
| Baja | **B1** | Aplicar Prettier al código y verificar format en CI (diff grande, commit exclusivo) |
| Baja | **B2** | Migrar los 53 `any` explícitos (regla hoy desactivada en el baseline) |
| Baja | **B4** | Refactor de `BudgetModal.tsx` (~1.400 líneas) y `App.tsx` |
| Baja | **B7** | Reemplazar 24 `console.*` por el logger propio o silenciarlos por entorno |
| Baja | **B9** | Quitar residuos del entorno original (`metadata.json`, `.agents/`, `.superpowers/`, `graphify-out/`) |
| Baja | **W6** | Mostrar la "próxima corrida" también cuando todo funciona (hoy se informa en el log) |
| Baja | — | Actualizar el skill de Graphify (0.9.25 → 0.9.39) con `graphify install` |
| Aparte | **Carril 1 UI** | Esc/foco accesible en modales + toasts en lugar de `alert()` (pausado a pedido del usuario) |

> **Cerrado y probado:** W1 y W4 (validados en uso real), **W2 / Fix E** (sincronización
> programada en el servidor, con prueba real del temporizador), **W5 / Fix D** (merge sin
> borrados + fin del catálogo demo como falso éxito), y **W3 / FIX-W003** (autoguardado con
> debounce y unmount seguro, verificado por contrato SDD-GL y tests unitarios).

---

## 5. Comandos útiles

```bash
npm run dev           # desarrollo (Vite, HMR)
npm run dev:stable    # desarrollo sin HMR ni watcher (menos recargas)
npm run stable        # build + servidor de producción (cero recargas automáticas)
npm start             # servir el build ya compilado
npm run lint          # tsc --noEmit + ESLint
npm test              # 9 suites / 90 tests
npm run test:coverage # cobertura (utils + capa de API)
npm run build         # bundle de producción
```

---

## 6. Ahorro de tokens (infraestructura automática)

Objetivo: que cada pedido cueste menos, evitando que el agente "relea" el repositorio.

| Mecanismo | Qué hace | Se activa |
|:--|:--|:--|
| `AGENTS.md` | Protocolo de sesión (orden de lectura, límites, reglas de economía) | automático: el harness lo carga en cada sesión |
| `docs/MAPA-DEL-CODIGO.md` | Índice de 1 fila por archivo (responsabilidad + exports, ~5 KB) | `npm run map` (se regenera y agrega en cada commit vía hook) |
| Graphify (`graphify-out/`) | Grafo del código + `GRAPH_REPORT.md` para relaciones y panorama | `post-commit` reconstruye en segundo plano |
| `scripts/graph-doctor.mjs` | Diagnóstico: grafo, hooks, artefactos, CLI | `npm run graph:doctor` (inicio de sesión) |
| `scripts/install-hooks.mjs` | Instala los hooks de git (idempotente) | automático en `npm install` (`prepare`) |
| CI | Verifica mapa al día (`map:check`) y dependencias circulares (`madge`) | en cada push/PR |
| `/compact` | Resume el historial para no reenviarlo en cada pedido | manual, al cerrar cada milestone |

**Reglas de oro para el agente** (están en `AGENTS.md`): localizar antes de leer (grep o
`graphify explain`), no abrir archivos de más de ~300 líneas completos, pedir salidas de
comandos digeridas, editar de forma quirúrgica, delegar exploraciones amplias a subagentes
y no volcar archivos ni JSON enteros en el chat.

---

## 7. Notas operativas (cosas que conviene recordar)

- **Recargas en desarrollo:** el cliente de Vite recarga la página al reconectar su
  WebSocket (pestaña en segundo plano, suspensión de la PC o reinicio del server). Para
  carga de datos sin interrupciones usar `npm run stable`. El borrador de venta evita
  perder lo cargado en cualquier caso.
- **Sincronización WooCommerce:** corre en el **servidor** (`server-woo.js` más el
  temporizador de `server.js`), así que sincroniza con la app cerrada y sin CORS. La app
  publica la configuración al guardar y **importa el snapshot** al abrirse; si el servidor no
  está disponible, sigue el modo navegador. Estado en el modal ("Servidor: sincroniza solo ·
  próxima HH:MM") y errores en el banner + log de auditoría (categoría `WooCommerce`).
- **La sincronización no borra nada (merge):** los productos manuales se conservan, los que
  coinciden por SKU se actualizan manteniendo su id local, y los clientes conservan su
  historial de compras. Los datos del servidor viven en `data/` (config, estado y snapshot),
  **excluido de git**.
- **Verificación sin tienda real:** `node scripts/mock-woo-server.mjs` levanta una API falsa
  de WooCommerce en `http://127.0.0.1:4141` para probar el merge de punta a punta.
- **Backups:** se rotan solos (30 copias / 7 días). `BACKUP_MAX_FILES=0` desactiva la
  rotación.
- **PIN:** si una instalación tenía un PIN en texto plano, se migra a hash al guardar la
  configuración. Los hashes viejos siguen siendo válidos (salt legacy).
- **Datos por defecto:** la empresa arranca como "Mi Empresa" y sin datos fiscales: se
  configuran desde **Configuración → Empresa / Firma**.

---

## 8. Cómo retomar

1. `git pull` y `npm install` (los hooks se reinstalan solos con el script `prepare`).
2. `npm run graph:doctor` → estado del grafo, hooks y artefactos (sin costo de tokens).
3. `npm run lint && npm test` para confirmar que el punto de partida está sano.
4. Elegir el pendiente por ID desde `docs/FIXES.md` (recomendado empezar por **W2/Fix E** o
   **W5/Fix D**) y actualizar el tablero al cerrarlo.
5. Al terminar: `npm run map` (o lo hace el hook), actualizar este documento,
   `CHANGELOG.txt`, commitear, pushear y verificar el CI. Cerrar con **`/compact`**.

### Prompt sugerido para la próxima sesión
> “Retomamos SalesHub. Leé `AGENTS.md`, `docs/ESTADO-DEL-PROYECTO.md` y
> `docs/MAPA-DEL-CODIGO.md`, confirmá con `npm run graph:doctor` que está todo en orden y
> seguimos con **[W2/Fix E] | [W5/Fix D] | [otro]**.”
