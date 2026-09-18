# Registro de Correcciones (Fixes) — SalesHub

Documento de seguimiento de incidencias detectadas durante la revisión técnica del
proyecto, con su estado, causa, solución aplicada y forma de verificarla.

> **Cómo leerlo**
> - **Estado**: `✅ Reparado` (aplicado y verificado) · `🟡 Parcial` · `⏳ Pendiente`.
> - Cada fix trae tres bloques: **Qué se notaba** (síntoma, en lenguaje simple),
>   **Causa** (técnica, con archivo y línea) y **Solución + verificación**.
> - Los comandos de verificación son los mismos que usa el CI.

**Última actualización:** 2026-09-13 · **Versión del proyecto:** 0.0.18

---

## 1. Tablero general

| ID | Corrección | Severidad | Estado |
|:--|:--|:--:|:--:|
| **A1** | ESLint no se ejecutaba en CI | Alta | ✅ Reparado |
| **A2** | Dependencias de hooks incorrectas en el mapa (posible *stale closure*) | Alta | ✅ Reparado |
| **A3** | El aviso "Copiado" del remito nunca se mostraba | Media | ✅ Reparado |
| **A4** | Backups sin retención (disco crecía indefinidamente) | Media | ✅ Reparado |
| **A5** | Datos de demostración en instalaciones nuevas | Media | ✅ Reparado |
| **B3** | Sin tests para la capa de API/servidor | Media | 🟡 Parcial |
| **B5** | `bun.lock` obsoleto versionado | Baja | ✅ Reparado |
| **B6** | `.env.example` documentaba variables inexistentes (Gemini) | Baja | ✅ Reparado |
| **B1** | Prettier configurado pero no aplicado ni verificado en CI | Baja | ⏳ Pendiente |
| **B2** | 53 usos de `any` explícito | Baja | ⏳ Pendiente |
| **B4** | Componentes grandes (`BudgetModal`, `App.tsx`) | Baja | ⏳ Pendiente |
| **B7** | 24 `console.*` fuera del logger propio | Baja | ⏳ Pendiente |
| **B8** | Claves WooCommerce precargadas en el modal / defaults de seguridad | Media | ⏳ Pendiente |
| **B9** | Residuos del entorno original (metadata AI Studio, cachés de agentes) | Baja | ⏳ Pendiente |
| **W1** | El flag de seguridad apagaba la sincronización automática de WooCommerce | **Alta** | ✅ Reparado |
| **W4** | Fallos de sincronización silenciosos y sin backoff | **Alta** | ✅ Reparado |
| **W2** | La programación sólo existía con la app abierta (sin cron en el servidor) | Alta | ✅ Reparado |
| **W3** | La config de automatización podía no guardarse (botón poco visible) | Media | 🟡 Parcial |
| **W5** | Fallback a catálogo **demo** contado como éxito + reemplazo total del catálogo | Media | ⏳ Pendiente |
| **W6** | Faltan indicadores (próxima corrida / último error) | Baja | 🟡 Parcial |

**Estado global de calidad:** `npm run lint` → 0 errores / **0 warnings** ·
tests **9 archivos / 90 tests** · build de producción OK · CI en verde.

---

## 2. Correcciones aplicadas

### A1 — ESLint ahora corre en el pipeline de CI
- **Qué se notaba:** el workflow validaba tipos, tests y build, pero **no** ejecutaba
  ESLint, así que una regresión de lint (o de Reglas de Hooks) podía llegar a `master`
  sin que nada la frenara.
- **Causa:** el paso de CI usaba `npx tsc --noEmit` en lugar del script `lint` del
  proyecto (que ya incluye `tsc` + `eslint`).
- **Solución:** `.github/workflows/ci.yml` → paso **“Typecheck & Lint (tsc + ESLint)”**
  que ejecuta `npm run lint`.
- **Verificación:** el pipeline falla si ESLint reporta un error. Localmente:
  `npm run lint`.

### A2 — Dependencias de hooks en `SaleLocationMap`
- **Qué se notaba:** dos advertencias de ESLint sobre efectos con dependencias
  incompletas; en la práctica, el marcador/mapa podía quedar desincronizado con las
  coordenadas o geocodificar con datos viejos.
- **Causa:** los efectos leían `currentLat`, `currentLng`, `onChangeCoordinates`,
  `coordinates` y `geocodeAddress` sin declararlos como dependencias; declararlos
  directamente recrearía el mapa en cada cambio (efecto no deseado).
- **Solución** (`src/components/SaleLocationMap.tsx`):
  - `onChangeCoordinatesRef` y `initialCoordsRef` (refs estables) para que la
    inicialización del mapa siga corriendo **una sola vez**.
  - `geocodeAddress` envuelto en `useCallback` y agregado a las dependencias del efecto
    de autobúsqueda, junto con `coordinates` (con guarda para no repetir la búsqueda).
- **Verificación:** `npm run lint` ya no reporta warnings en ese archivo; el pin sigue
  el arrastre y la búsqueda manual/automática funciona igual que antes.

### A3 — Feedback real al copiar el número de seguimiento
- **Qué se notaba:** al pulsar **“Copiar Tracking”** en el remito no aparecía ninguna
  confirmación (el estado se actualizaba pero no se mostraba).
- **Causa:** el estado `copiedMessage` se había quedado sin lectura en el JSX.
- **Solución** (`src/components/RemitoModal.tsx`): se muestra un distintivo
  **“¡Copiado!”** durante 3 s, el copiado pasó a `async` con control de errores
  (si el navegador no permite el portapapeles, se avisa al usuario) y se registra en el
  log de auditoría.
- **Verificación:** abrir un remito con Nº de seguimiento → “Copiar Tracking” →
  aparece “¡Copiado!” y el número queda en el portapapeles.

### A4 — Retención (rotación) de copias de seguridad
- **Qué se notaba:** la carpeta `backups/` crecía sin límite (**15 archivos / 41,9 MB**
  al momento del análisis), y el navegador acumulaba copias en IndexedDB.
- **Causa:** cada backup se escribía sin política de retención.
- **Solución:**
  - **Servidor / dev** (`api-handlers.js`): nueva función `pruneBackups()` que conserva
    las **30 copias más recientes** y **nunca elimina copias con menos de 7 días**
    (`BACKUP_MAX_FILES`, `BACKUP_MIN_AGE_DAYS`; `0` desactiva la rotación). El guardado
    responde además `pruned: [...]` con lo eliminado, y la rotación nunca interrumpe el
    guardado de la copia nueva.
  - **Navegador** (`src/utils/backupService.ts`): `pruneIndexedDbBackups()` con las
    mismas reglas (30 archivos / 7 días), ejecutada de forma *best-effort* tras guardar.
- **Verificación:** 5 tests automáticos (conserva las N recientes, respeta el piso de
  antigüedad, no borra nada si está desactivada, reporta lo podado al guardar).

### A5 — Instalación nueva sin datos de ejemplo
- **Qué se notaba:** al instalar la app sin datos previos, aparecían **ventas, catálogo,
  presupuestos y clientes de ejemplo** (riesgo de mezclarlos con datos reales).
- **Causa:** cuando `localStorage` estaba vacío, `App.tsx` sembraba los `INITIAL_*`.
- **Solución:**
  - Nuevo flag `VITE_SEED_DEMO` (por defecto **desactivado**): una instalación nueva
    arranca vacía. Documentado en `.env.example` y tipado en `src/vite-env.d.ts`.
  - Los clientes de demo se movieron de `App.tsx` a `src/data/initialData.ts`
    (`INITIAL_DEMO_CUSTOMERS`), manteniendo `DEMO_SEED_ENABLED` como único interruptor.
- **Verificación:** `npm run dev` sin `.env` → la planilla arranca vacía;
  `VITE_SEED_DEMO=true` → se cargan los datos de ejemplo. Los datos ya guardados en cada
  navegador no se modifican.

### B3 (parcial) — Tests de la capa de API
- **Qué faltaba:** `api-handlers.js` (backups, tracking Andreani) no tenía pruebas.
- **Solución:** `src/__tests__/apiHandlers.test.ts` con **16 tests**: enrutado
  (`/api` desconocida → 404, rutas no-API → `false`), alta/listado/restauración de
  backups, JSON inválido y cuerpo vacío (400), **path traversal bloqueado**, retención
  (5 casos) y validaciones de Andreani.
- **Verificación:** `npm test` → 9 archivos / 90 tests.

### B5 — Se eliminó `bun.lock` obsoleto
- El proyecto usa `package-lock.json` (npm); el `bun.lock` estaba desactualizado y
  desincronizado. Se quitó del repositorio y de `.prettierignore`.

### B6 — `.env.example` realista
- Declaraba `GEMINI_API_KEY` y `APP_URL`, **sin ninguna referencia en el código**.
  Se reescribió documentando lo que sí existe: `VITE_SEED_DEMO`, `PORT`, `HOST`,
  `DIST_DIR`, `BACKUP_MAX_FILES`, `BACKUP_MIN_AGE_DAYS`, y una nota aclarando que las
  credenciales de WooCommerce y el hash de Andreani se configuran **dentro de la app**
  (nunca por entorno).

---

## 3. Sincronización automática de WooCommerce (análisis y estado)

Causas detectadas de que la sincronización **no respetara la programación configurada**,
con su estado actual:

### W1 — El flag de seguridad apagaba toda la automatización ✅ Reparado y **validado en uso real** (Fix A)
- **Qué se notaba:** se configuraba "cada 2 h" y la sincronización no corría nunca.
- **Causa:** `App.tsx` cortaba el efecto si `config.seguridad.bloquearSincronizacionWooCommerce`
  estaba activo, pero ese interruptor en la UI dice **"Bloquear edición de API Keys a
  Operadores"** (su alcance debería ser sólo edición). Peor: `ConfigModal` lo define en
  `true` por defecto cuando `config.seguridad` no existe, así que con sólo guardar la
  configuración la automatización quedaba muerta, sin aviso.
- **Solución:** la programación ahora depende **únicamente** de `autoSync` + `url` +
  `conectado`; el flag pasó a cumplir su función real: en `WooCommerceModal` deshabilita
  los campos de URL/Consumer Key/Secret y muestra un aviso cuando el perfil es OPERADOR.
- **Verificación:** con `bloquearSincronizacionWooCommerce: true` en la configuración, el
  log muestra `Iniciando sincronización automática programada (cada N hora/s)`.
- **Validado en uso real (13/09/2026):** el usuario confirmó que la sincronización
  programada se ejecuta según el intervalo configurado.

### W4 — Fallos silenciosos y sin backoff ✅ Reparado y **validado en uso real** (Fix C)
- **Qué se notaba:** la sincronización "no hacía nada" y no había forma de enterarse.
- **Causa:** el `catch` sólo escribía en el log de auditoría y reintentaba cada 60 s
  indefinidamente; el usuario no veía el error salvo abriendo los logs.
- **Solución:** **backoff exponencial** (1, 2, 4, … hasta 30 min), registro explícito en
  el log con el motivo y el próximo reintento, y **banner de aviso en pantalla** con el
  error, la hora del próximo intento y accesos a "Revisar WooCommerce" / "Ocultar".
  En éxito se registra también la próxima corrida programada.
- **Validado en uso real (13/09/2026):** verificado junto con W1 en la operación diaria.

### W2 — La programación sólo existía con la app abierta ✅ Reparado (Fix E)
El chequeo era un `setInterval` en el navegador, así que si la app estaba cerrada no había
sincronización. **Solución implementada en dos pasos:**

1. **Servicio en el servidor** (`server-woo.js`): cliente REST de WooCommerce con
   paginación, mapeo a `CatalogProduct`/`Customer`, y persistencia en `data/`
   (config, estado y snapshot; excluido de git). Rutas: `GET /api/woo/status`,
   `GET /api/woo/snapshot`, `POST|DELETE /api/woo/config`, `POST /api/woo/sync`.
2. **Programación real** (`server.js`): temporizador que evalúa cada 60 s
   (`WOO_TICK_MS`, `WOO_SCHEDULER=off` para desactivar) y consulta WooCommerce desde Node —
   **corre con la aplicación cerrada** y sin CORS. Con backoff de 1 → 30 min ante fallos.
   La app, al abrirse, importa el snapshot si es más nuevo que su `ultimoSync` y lo registra
   en el log; si el servidor no está disponible, sigue operando el modo navegador.

**Verificado:** 10 tests de la capa de API/programación, prueba real del temporizador
(registró solo un error de red con una URL inválida) y prueba de endpoints contra `server.js`.

### W3 — La configuración podía no guardarse 🟡 Parcial
`WooCommerceModal` mantiene el checkbox y la frecuencia en estado local; sólo se persisten
con **"Guardar Ajustes"** o al hacer una sync manual. Se agregó un indicador
**"Automatización: Activa cada N h / Inactiva"** (con la aclaración "se guarda con Guardar
Ajustes"). Pendiente: autoguardado o aviso de cambios sin guardar al cerrar.

### W5 — Fallback a catálogo *demo* y reemplazo total del catálogo ⏳ Pendiente
`wooCommerceApi.ts` devuelve productos/clientes de ejemplo cuando la petición falla y la
URL contiene `demo`/`ejemplo` o falta la Consumer Key, y el flujo lo registra como éxito;
además `handleSyncCatalog` **reemplaza** todo el catálogo, borrando productos locales.
Propuesta (**Fix D**): exigir un flag explícito para el modo demo y hacer *merge* por SKU.

### W6 — Indicadores 🟡 Parcial
Cubierto por el banner de fallo y el badge de automatización. Pendiente: mostrar la
**próxima corrida** también cuando todo funciona (hoy se informa en el log).

### Cómo confirmar en tu instalación
1. Consola del navegador (F12), con la app abierta:
   ```js
   JSON.parse(localStorage.getItem('app_woo_config_v1'))   // autoSync, syncIntervalHours, conectado, ultimoSync
   JSON.parse(localStorage.getItem('app_config_v1')).seguridad
   ```
2. **Configuración → Logs del sistema**, categoría `WooCommerce`: deben verse
   `Iniciando sincronización automática programada…` y, si falla,
   `Fallo en sincronización automática (intento N): … Próximo reintento en X min`.
3. Dejar la app abierta más que el intervalo configurado y observar "Última sync" en el
   modal de WooCommerce (y el banner si hubo error).

---

## 4. Pendientes con plan propuesto

| ID | Pendiente | Plan propuesto |
|:--|:--|:--|
| **B1** | Prettier sin aplicar | Ejecutar `npm run format` en un commit exclusivo (`style:`) y luego agregar `npm run format:check` al CI para que no vuelva a divergir |
| **B2** | 53 `any` | Activar `@typescript-eslint/no-explicit-any` como `warn` y migrar módulo por módulo (empezando por `utils/`) |
| **B3** | Cobertura de UI | Sumar `@testing-library/react` + `jsdom` para componentes críticos (venta, presupuesto, configuración) y completar `wooCommerceApi` (60%) y `security` (55%) |
| **B4** | Componentes grandes | `BudgetModal.tsx` (~1.400 líneas) y `App.tsx` (~810): extraer hook `useLocalStorageState`, agrupar el estado de modales y dividir el flujo del presupuesto |
| **B7** | 24 `console.*` | Reemplazar por `addSystemLog` (ya existe el motor de auditoría) o silenciarlos según entorno |
| **B8** | Endurecimiento extra | H2: no precargar las claves de WooCommerce en el formulario (dejar vacío = mantener). H3: revisar defaults de seguridad y auto-habilitación de PIN |
| **B9** | Residuos | Quitar `metadata.json` (AI Studio) y las carpetas de trabajo de agentes (`graphify-out/`, `.superpowers/`) del árbol público |

---

## 5. Cómo verificar todo

```bash
npm run lint          # tsc --noEmit + eslint (0 errores / 0 warnings)
npm test              # 9 archivos / 90 tests
npm run test:coverage # reporte de cobertura (utils)
npm run build         # bundle de producción
```

En GitHub, el pipeline **CI/CD Pipeline - SalesHub** ejecuta typecheck + lint, tests y
build en cada push a `master`; el estado se ve en la pestaña **Actions** y en el badge
`CI` del README.

---

## 6. Historial del documento

| Fecha | Cambio |
|:--|:--|
| 2026-09-13 | Creación: registro de fixes A1–A5, B3 (parcial), B5, B6 aplicados; B1, B2, B4, B7, B8, B9 documentados como pendientes |
| 2026-09-13 | Sección 3 (WooCommerce): análisis de las 6 causas de que la programación no se cumpliera; **W1 (Fix A)** y **W4 (Fix C)** reparados; W2/W3/W5/W6 documentados con plan |
| 2026-09-13 | **W1 y W4 validados en uso real**: la sincronización programada se ejecuta según el intervalo configurado. Documentado también en README (sección 7) |
