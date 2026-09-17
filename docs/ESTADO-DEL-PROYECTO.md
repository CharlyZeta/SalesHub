# Estado del Proyecto y de la Sesión — SalesHub

Documento de **handoff**: qué se hizo, cómo quedó el repositorio y qué sigue.
Pensado para retomar el trabajo en cualquier momento (o para que otra persona entienda
el punto exacto en el que está el desarrollo).

**Última actualización:** 2026-09-13
**Versión del proyecto:** 0.0.19
**Commit de referencia:** `cc0bd74`
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
| Tests | **9 archivos / 90 tests** (Vitest) |
| Cobertura | utils **81,6 %** · global **76,0 %** (`security.ts` 95,5 %) |
| Build | Producción OK |
| CI | GitHub Actions **en verde** en cada push (typecheck + lint, tests, build) |
| Sincronización WooCommerce | **Funcionando según la configuración** (validado en uso real) |
| Repositorio | Sincronizado: local = remoto = `cc0bd74`, árbol limpio |

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

### 2.4 Sincronización WooCommerce (Fix A + Fix C)
- La programación **depende solo de `autoSync` + URL + credenciales**; el flag de seguridad
  pasó a restringir únicamente la edición de claves a Operadores (con aviso en el modal).
- **Backoff exponencial** (1 → 30 min) ante fallos, log explícito del motivo y **banner en
  pantalla** con el próximo reintento.
- **Validado en uso real:** la sincronización se ejecuta según el intervalo configurado.

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
| Alta | **W2 / Fix E** | Mover la programación de WooCommerce a `server.js` para sincronizar **con la app cerrada** |
| Alta | **W5 / Fix D** | Evitar el catálogo *demo* contado como éxito y hacer *merge* por SKU en lugar de reemplazar el catálogo |
| Media | **W3** | Autoguardado de la configuración de WooCommerce (hoy requiere "Guardar Ajustes") |
| Media | **B8** | Endurecimiento: no precargar claves en el modal + revisar defaults de seguridad |
| Media | **B3 (resto)** | Tests de componentes UI (requiere `@testing-library/react` + jsdom) y completar cobertura de `wooCommerceApi` |
| Baja | **B1** | Aplicar Prettier al código y verificar format en CI (diff grande, commit exclusivo) |
| Baja | **B2** | Migrar los 53 `any` explícitos (regla hoy desactivada en el baseline) |
| Baja | **B4** | Refactor de `BudgetModal.tsx` (~1.400 líneas) y `App.tsx` |
| Baja | **B7** | Reemplazar 24 `console.*` por el logger propio o silenciarlos por entorno |
| Baja | **B9** | Quitar residuos del entorno original (`metadata.json`, `.agents/`, `.superpowers/`, `graphify-out/`) |
| Aparte | **Carril 1 UI** | Esc/foco accesible en modales + toasts en lugar de `alert()` (pausado a pedido del usuario) |

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

## 6. Notas operativas (cosas que conviene recordar)

- **Recargas en desarrollo:** el cliente de Vite recarga la página al reconectar su
  WebSocket (pestaña en segundo plano, suspensión de la PC o reinicio del server). Para
  carga de datos sin interrupciones usar `npm run stable`. El borrador de venta evita
  perder lo cargado en cualquier caso.
- **Sincronización WooCommerce:** corre mientras la app está abierta (W2 pendiente para el
  modo con la app cerrada). El estado se ve en el modal ("Automatización: Activa cada N h")
  y los errores en el banner + log de auditoría (categoría `WooCommerce`).
- **Backups:** se rotan solos (30 copias / 7 días). `BACKUP_MAX_FILES=0` desactiva la
  rotación.
- **PIN:** si una instalación tenía un PIN en texto plano, se migra a hash al guardar la
  configuración. Los hashes viejos siguen siendo válidos (salt legacy).
- **Datos por defecto:** la empresa arranca como "Mi Empresa" y sin datos fiscales: se
  configuran desde **Configuración → Empresa / Firma**.

---

## 7. Cómo retomar

1. `git pull` y `npm install` (si hubo cambios de dependencias).
2. `npm run lint && npm test` para confirmar que el punto de partida está sano.
3. Elegir el pendiente por ID desde `docs/FIXES.md` (recomendado empezar por **W2/Fix E** o
   **W5/Fix D**) y actualizar el tablero al cerrarlo.
4. Al terminar: actualizar este documento (versión, commit de referencia y pendientes),
   `CHANGELOG.txt` y commitear.

### Prompt sugerido para la próxima sesión
> “Retomamos SalesHub. Leé `docs/ESTADO-DEL-PROYECTO.md` y `docs/FIXES.md`, confirmá que el
> repo está sincronizado y seguimos con **[W2/Fix E] | [W5/Fix D] | [otro]**.”
