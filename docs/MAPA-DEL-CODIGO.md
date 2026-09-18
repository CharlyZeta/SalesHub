# Mapa del Código — SalesHub

> **Archivo generado automáticamente** por `npm run map` (no editar a mano).
> Es el índice que conviene leer **antes** de abrir archivos: una fila por módulo
> con su responsabilidad y sus exports principales.

**Resumen:** 38 archivos · 13.604 líneas.

| Directorio | Archivos | Líneas |
|:--|--:|--:|
| `scripts/` | 4 | 445 |
| `src/` | 3 | 1.310 |
| `src/components/` | 21 | 9.733 |
| `src/data/` | 1 | 358 |
| `src/utils/` | 9 | 1.758 |

## `scripts/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `generate-code-map.mjs` | 197 | Generador de este mapa (npm run map / map:check) | — |
| `graph-doctor.mjs` | 114 | Diagnóstico del grafo de conocimiento y de los hooks (npm run graph:doctor) | — |
| `install-hooks.mjs` | 97 | Instalación automática de hooks de git (npm install / npm run hooks:install) | — |
| `mock-woo-server.mjs` | 37 | Servidor falso que imita la API REST de WooCommerce (solo para probar el merge). | — |

## `src/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `App.tsx` | 1068 | Orquestador principal: estado global, persistencia, efectos de sync y montaje de modales | (default) |
| `main.tsx` | 11 | Punto de entrada de React (render del árbol en #root) | — |
| `types.ts` | 231 | Modelo de dominio tipado (Sale, Budget, Customer, CatalogProduct, AppConfig, seguridad) | SaleProductItem, Sale, Customer, CatalogProduct, WooCommerceConfig, ColumnMapping, DateFilterRange, BudgetItem, Budget, SecurityConfig, BackupConfig, CompanyConfig, AppConfig, SaleChannel, PaymentMethod, ShippingMethod, ShippingStatus, InvoiceType, UserRole |

## `src/components/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `AnalyticsModal.tsx` | 293 | Panel de analítica con gráficos Recharts (tendencia y distribución por canal) | AnalyticsModal |
| `AuthModal.tsx` | 271 | Auth Gate: PIN, selección de rol (RBAC) y bloqueo progresivo por intentos | AuthModal |
| `BudgetModal.tsx` | 1392 | Presupuestos AFIP: ítems, IVA/percepciones, PDF y conversión a venta | BudgetModal |
| `ConfigBackupsTab.tsx` | 212 | Pestaña Copias de seguridad: backup automático, copia manual y restauración | ConfigBackupsTab, ConfigBackupsTabProps |
| `ConfigEmpresaTab.tsx` | 374 | Pestaña Empresa / Firma: identidad, logo, datos fiscales y puntos de venta | ConfigEmpresaTab, ConfigEmpresaTabProps |
| `ConfigGeneralTab.tsx` | 431 | Pestaña General & Ventas: canales, pagos, envíos, Andreani, numeración e importación | ConfigGeneralTab, ConfigGeneralTabProps |
| `ConfigModal.tsx` | 477 | Configuración del sistema: shell del modal, estado compartido, guardado y pestañas | ConfigModal |
| `ConfigSecurityTab.tsx` | 155 | Pestaña Seguridad & PIN: control de acceso, inactividad y restricciones por rol | ConfigSecurityTab, ConfigSecurityTabProps |
| `CustomerDirectoryModal.tsx` | 434 | Directorio de clientes: búsqueda, historial de compras y alta de clientes | CustomerDirectoryModal |
| `ExportModal.tsx` | 124 | Exportador de ventas a CSV por rango y canal | ExportModal |
| `Header.tsx` | 219 | Barra superior: marca, KPIs rápidos, accesos a modales, tema y bloqueo de sesión | Header |
| `ImportModal.tsx` | 526 | Importador CSV / pegado desde Google Sheets con mapeo de columnas | ImportModal |
| `KpiSummary.tsx` | 319 | Banner de KPIs mensuales, filtro por mes/canal y configuración de tarjetas visibles | KpiSummary |
| `ProductSearchPicker.tsx` | 230 | Buscador autocompletable de productos del catálogo | ProductSearchPicker |
| `RemitoModal.tsx` | 504 | Remito de entrega/despacho: datos de empresa, transporte, PDF e impresión | RemitoModal |
| `SaleFormModal.tsx` | 983 | Alta/edición de ventas: cliente, ítems con descuento, facturación, envío y borrador autoguardado | SaleFormModal |
| `SaleLocationMap.tsx` | 235 | Mapa Leaflet/OSM con geocodificación Nominatim y pin arrastrable | SaleLocationMap |
| `SendBudgetModal.tsx` | 367 | Envío omnicanal de presupuestos por WhatsApp (wa.me) y correo (mailto) | SendBudgetModal |
| `SpreadsheetGrid.tsx` | 1081 | Planilla interactiva de ventas: edición inline, filtros, paginación y tracking Andreani | SpreadsheetGrid |
| `SystemLogsModal.tsx` | 367 | Consola de auditoría: filtros por nivel/categoría/fecha y exportación | SystemLogsModal |
| `WooCommerceModal.tsx` | 739 | Sincronización WooCommerce: credenciales, catálogo, clientes y programación | WooCommerceModal |

## `src/data/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `initialData.ts` | 358 | Datos semilla opcionales (demo), configuración inicial y empresa por defecto | DEMO_SEED_ENABLED, INITIAL_DEMO_CUSTOMERS, INITIAL_COMPANY_CONFIG, INITIAL_CONFIG, INITIAL_BUDGETS, INITIAL_SALES, INITIAL_CATALOG, INITIAL_WOO_CONFIG |

## `src/utils/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `andreaniStatusMapper.ts` | 199 | Mapeo canónico de estados de Andreani a estados del sistema | ANDREANI_CANONICAL_STATUSES, mapAndreaniTrackingStatus, isTerminalStatus, getAndreaniStatusConfig, AndreaniStatusConfig |
| `andreaniSyncService.ts` | 114 | Consulta en lote del tracking de Andreani con caché de 60 s | clearAndreaniTrackingCache, fetchAndreaniTrackingsBulk, AndreaniTrackResult |
| `backupService.ts` | 331 | Backups en IndexedDB y disco (API /api/backup) con rotación | IDB_RETENTION, saveToIndexedDb, listFromIndexedDb, getFromIndexedDb, deleteFromIndexedDb, pruneIndexedDbBackups, saveToBackend, listFromBackend, getFromBackend, runBackup, listAllBackups, restoreBackup, checkAndTriggerAutoBackup, FullAppState, BackupItem |
| `budgetDelivery.ts` | 152 | Plantillas de envío de presupuestos (WhatsApp/correo) y normalización de teléfonos | formatWhatsAppPhone, generateBudgetWhatsAppText, generateBudgetEmailSubject, generateBudgetEmailBody, openWhatsAppForBudget, openEmailForBudget |
| `formatters.ts` | 253 | Formateo ARS/fechas, validaciones de venta, IDs y sanitización de CSV | formatCurrency, formatDate, parseDateToISO, parseAmountString, validateRequiredSaleFields, getCurrentMonthISO, generateSaleId, getMonthYearLabel, exportSalesToCSV, RecordValidationResult |
| `logger.ts` | 125 | Motor de auditoría (localStorage + eventos) con filtros y exportación | getSystemLogs, addSystemLog, clearSystemLogs, filterSystemLogs, exportLogsJSON, exportLogsCSV, LogEntry, LogFilterOptions, LogLevel |
| `numberToWords.ts` | 71 | Conversión de importes a texto (para comprobantes) | numberToWordsSpanish |
| `security.ts` | 92 | Hash de PIN (SHA-256), verificación retrocompatible y escalada de bloqueo | PIN_SALT, isHashedPin, authLockWaitMs, hashPin, verifyPin |
| `wooCommerceApi.ts` | 421 | Cliente REST de WooCommerce: productos y clientes paginados | buildWooApiUrl, transformWooProduct, transformWooCustomer, fetchWithCorsProxy, fetchWooCommerceProducts, fetchWooCommerceCustomers, WooProductDTO, WooCustomerDTO |

## Documentación de referencia

| Documento | Contenido |
|:--|:--|
| `AGENTS.md` | Protocolo de sesión para agentes (lectura mínima, ahorro de tokens) |
| `docs/ESTADO-DEL-PROYECTO.md` | Estado actual, entregado, pendientes y cómo retomar |
| `docs/FIXES.md` | Registro de correcciones aplicadas y deuda pendiente (IDs) |
| `CHANGELOG.txt` | Historial de versiones |
| `graphify-out/GRAPH_REPORT.md` | Reporte del grafo de conocimiento (comunidades, nodos centrales) |
