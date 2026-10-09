# Mapa del Código — SalesHub

> **Archivo generado automáticamente** por `npm run map` (no editar a mano).
> Es el índice que conviene leer **antes** de abrir archivos: una fila por módulo
> con su responsabilidad y sus exports principales.

**Resumen:** 56 archivos · 16.867 líneas.

| Directorio | Archivos | Líneas |
|:--|--:|--:|
| `scripts/` | 5 | 563 |
| `src/` | 3 | 911 |
| `src/components/` | 21 | 9.045 |
| `src/components/budget/` | 3 | 976 |
| `src/components/grid/` | 3 | 818 |
| `src/components/sales/` | 3 | 706 |
| `src/data/` | 1 | 364 |
| `src/hooks/` | 5 | 783 |
| `src/services/` | 1 | 158 |
| `src/utils/` | 11 | 2.543 |

## `scripts/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `check-sdd-version.mjs` | 79 | 1. Verificar instalación / repositorio local del protocolo | — |
| `generate-code-map.mjs` | 204 | Generador de este mapa (npm run map / map:check) | — |
| `graph-doctor.mjs` | 116 | Diagnóstico del grafo de conocimiento y de los hooks (npm run graph:doctor) | — |
| `install-hooks.mjs` | 99 | Instalación automática de hooks de git (npm install / npm run hooks:install) | — |
| `mock-woo-server.mjs` | 65 | Servidor falso que imita la API REST de WooCommerce (solo para probar el merge). | — |

## `src/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `App.tsx` | 666 | Orquestador principal: estado global, persistencia, efectos de sync y montaje de modales | (default) |
| `main.tsx` | 11 | Punto de entrada de React (render del árbol en #root) | — |
| `types.ts` | 234 | Modelo de dominio tipado (Sale, Budget, Customer, CatalogProduct, AppConfig, seguridad) | SaleProductItem, Sale, Customer, CatalogProduct, WooCommerceConfig, ColumnMapping, DateFilterRange, BudgetItem, Budget, SecurityConfig, BackupConfig, CompanyConfig, GoogleMapsUsage, AppConfig, SaleChannel, PaymentMethod, ShippingMethod, ShippingStatus, InvoiceType, UserRole |

## `src/components/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `AnalyticsModal.tsx` | 319 | Panel de analítica con gráficos Recharts (tendencia y distribución por canal) | AnalyticsModal |
| `AuthModal.tsx` | 274 | Auth Gate: PIN, selección de rol (RBAC) y bloqueo progresivo por intentos | AuthModal |
| `BudgetModal.tsx` | 709 | Presupuestos AFIP: ítems, IVA/percepciones, PDF y conversión a venta | BudgetModal |
| `ConfigBackupsTab.tsx` | 242 | Pestaña Copias de seguridad: backup automático, copia manual y restauración | ConfigBackupsTab, ConfigBackupsTabProps |
| `ConfigEmpresaTab.tsx` | 351 | Pestaña Empresa / Firma: identidad, logo, datos fiscales y puntos de venta | ConfigEmpresaTab, ConfigEmpresaTabProps |
| `ConfigGeneralTab.tsx` | 795 | Pestaña General & Ventas: canales, pagos, envíos, Andreani, numeración e importación | ConfigGeneralTab, ConfigGeneralTabProps |
| `ConfigModal.tsx` | 539 | Configuración del sistema: shell del modal, estado compartido, guardado y pestañas | ConfigModal |
| `ConfigSecurityTab.tsx` | 169 | Pestaña Seguridad & PIN: control de acceso, inactividad y restricciones por rol | ConfigSecurityTab, ConfigSecurityTabProps |
| `CustomerDirectoryModal.tsx` | 507 | Directorio de clientes: búsqueda, historial de compras y alta de clientes | CustomerDirectoryModal |
| `ExportModal.tsx` | 125 | Exportador de ventas a CSV por rango y canal | ExportModal |
| `Header.tsx` | 231 | Barra superior: marca, KPIs rápidos, accesos a modales, tema y bloqueo de sesión | Header |
| `ImportModal.tsx` | 583 | Importador CSV / pegado desde Google Sheets con mapeo de columnas | ImportModal |
| `KpiSummary.tsx` | 327 | Banner de KPIs mensuales, filtro por mes/canal y configuración de tarjetas visibles | KpiSummary |
| `ProductSearchPicker.tsx` | 238 | Buscador autocompletable de productos del catálogo | ProductSearchPicker, ProductSearchPickerProps |
| `RemitoModal.tsx` | 534 | Remito de entrega/despacho: datos de empresa, transporte, PDF e impresión | RemitoModal |
| `SaleFormModal.tsx` | 653 | Alta/edición de ventas: cliente, ítems con descuento, facturación, envío y borrador autoguardado | SaleFormModal |
| `SaleLocationMap.tsx` | 270 | Mapa Leaflet/OSM con geocodificación Nominatim y pin arrastrable | SaleLocationMap |
| `SendBudgetModal.tsx` | 373 | Envío omnicanal de presupuestos por WhatsApp (wa.me) y correo (mailto) | SendBudgetModal |
| `SpreadsheetGrid.tsx` | 518 | Planilla interactiva de ventas: edición inline, filtros, paginación y tracking Andreani | SpreadsheetGrid |
| `SystemLogsModal.tsx` | 425 | Consola de auditoría: filtros por nivel/categoría/fecha y exportación | SystemLogsModal |
| `WooCommerceModal.tsx` | 863 | Sincronización WooCommerce: credenciales, catálogo, clientes y programación | WooCommerceModal |

## `src/components/budget/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `BudgetEditorTab.tsx` | 529 | — | BudgetEditorTab, BudgetEditorTabProps |
| `BudgetListTab.tsx` | 143 | — | BudgetListTab, BudgetListTabProps |
| `BudgetPrintPreview.tsx` | 304 | — | BudgetPrintPreview, BudgetPrintPreviewProps |

## `src/components/grid/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `GridPagination.tsx` | 82 | — | GridPagination, GridPaginationProps |
| `GridRow.tsx` | 503 | Helper badge color for sales channel | GridRow, GridVisibleColumns, GridRowProps |
| `GridToolbar.tsx` | 233 | — | GridToolbar, GridToolbarProps |

## `src/components/sales/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `SaleBillingSection.tsx` | 176 | — | SaleBillingSection, SaleBillingSectionProps |
| `SaleCustomerSection.tsx` | 389 | — | SaleCustomerSection, SaleCustomerSectionProps |
| `SaleProductsSection.tsx` | 141 | — | SaleProductsSection, SaleProductsSectionProps |

## `src/data/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `initialData.ts` | 364 | Datos semilla opcionales (demo), configuración inicial y empresa por defecto | DEMO_SEED_ENABLED, INITIAL_DEMO_CUSTOMERS, INITIAL_COMPANY_CONFIG, INITIAL_CONFIG, INITIAL_BUDGETS, INITIAL_SALES, INITIAL_CATALOG, INITIAL_WOO_CONFIG |

## `src/hooks/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `useBudgetCalculation.ts` | 61 | — | calculateBudgetItemSubtotal, calculateBudgetTotals, useBudgetCalculation, BudgetCalculationResult |
| `useCatalogState.ts` | 39 | — | useCatalogState, UseCatalogStateReturn |
| `useSalesState.ts` | 241 | — | useSalesState, UseSalesStateProps, UseSalesStateReturn |
| `useSecurityRole.ts` | 97 | — | useSecurityRole, UseSecurityRoleReturn |
| `useWooCommerceSync.ts` | 345 | — | useWooCommerceSync, UseWooCommerceSyncProps, UseWooCommerceSyncReturn |

## `src/services/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `storageRepository.ts` | 158 | — | defaultStorageRepository, IStorageRepository, LocalStorageRepository |

## `src/utils/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `andreaniStatusMapper.ts` | 206 | Mapeo canónico de estados de Andreani a estados del sistema | ANDREANI_CANONICAL_STATUSES, mapAndreaniTrackingStatus, isTerminalStatus, getAndreaniStatusConfig, AndreaniStatusConfig |
| `andreaniSyncService.ts` | 114 | Consulta en lote del tracking de Andreani con caché de 60 s | clearAndreaniTrackingCache, fetchAndreaniTrackingsBulk, AndreaniTrackResult |
| `backupService.ts` | 333 | Backups en IndexedDB y disco (API /api/backup) con rotación | IDB_RETENTION, saveToIndexedDb, listFromIndexedDb, getFromIndexedDb, deleteFromIndexedDb, pruneIndexedDbBackups, saveToBackend, listFromBackend, getFromBackend, runBackup, listAllBackups, restoreBackup, checkAndTriggerAutoBackup, FullAppState, BackupItem |
| `budgetDelivery.ts` | 156 | Plantillas de envío de presupuestos (WhatsApp/correo) y normalización de teléfonos | formatWhatsAppPhone, generateBudgetWhatsAppText, generateBudgetEmailSubject, generateBudgetEmailBody, openWhatsAppForBudget, openEmailForBudget |
| `customerIndex.ts` | 53 | — | buildSalesCustomerIndex, filterCustomers, CustomerSalesSummary |
| `formatters.ts` | 486 | Formateo ARS/fechas, validaciones de venta, IDs y sanitización de CSV | ARGENTINE_PROVINCES, DEFAULT_PROVINCE, ARGENTINE_PROVINCE_CODES, formatCurrency, formatDate, parseDateToISO, parseAmountString, validateRequiredSaleFields, getCurrentMonthISO, generateSaleId, getMonthYearLabel, exportSalesToCSV, normalizePersonName, resolveArgentineProvince, parseCombinedAddress, parseCustomerIdentityFromWoo, RecordValidationResult |
| `googleMapsService.ts` | 319 | — | getCurrentMonthKey, getGoogleMapsUsageInfo, checkGoogleMapsQuota, recordGoogleMapsRequest, resetGoogleMapsUsage, getStoredAppConfig, saveStoredAppConfig, incrementStoredGoogleMapsUsage, checkStoredGoogleMapsQuota, testGoogleMapsApiKey, GoogleMapsTestResult, GoogleMapsUsageInfo |
| `logger.ts` | 129 | Motor de auditoría (localStorage + eventos) con filtros y exportación | getSystemLogs, addSystemLog, clearSystemLogs, filterSystemLogs, exportLogsJSON, exportLogsCSV, LogEntry, LogFilterOptions, LogLevel |
| `numberToWords.ts` | 104 | Conversión de importes a texto (para comprobantes) | numberToWordsSpanish |
| `security.ts` | 89 | Hash de PIN (SHA-256), verificación retrocompatible y escalada de bloqueo | PIN_SALT, isHashedPin, authLockWaitMs, hashPin, verifyPin |
| `wooCommerceApi.ts` | 554 | Cliente REST de WooCommerce: productos y clientes paginados | buildWooApiUrl, transformWooProduct, transformWooCustomer, fetchWithCorsProxy, fetchWooCommerceProducts, fetchWooCommerceCustomers, WooProductDTO, WooCustomerDTO |

## Documentación de referencia

| Documento | Contenido |
|:--|:--|
| `AGENTS.md` | Protocolo de sesión para agentes (lectura mínima, ahorro de tokens) |
| `docs/ESTADO-DEL-PROYECTO.md` | Estado actual, entregado, pendientes y cómo retomar |
| `docs/FIXES.md` | Registro de correcciones aplicadas y deuda pendiente (IDs) |
| `CHANGELOG.txt` | Historial de versiones |
| `graphify-out/GRAPH_REPORT.md` | Reporte del grafo de conocimiento (comunidades, nodos centrales) |
