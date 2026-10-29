# Mapa del Código — SalesHub

> **Archivo generado automáticamente** por `npm run map` (no editar a mano).
> Es el índice que conviene leer **antes** de abrir archivos: una fila por módulo
> con su responsabilidad y sus exports principales.

**Resumen:** 74 archivos · 21.337 líneas.

| Directorio | Archivos | Líneas |
|:--|--:|--:|
| `scripts/` | 5 | 563 |
| `src/` | 3 | 1.145 |
| `src/components/` | 22 | 9.579 |
| `src/components/budget/` | 3 | 976 |
| `src/components/common/` | 1 | 35 |
| `src/components/config/` | 2 | 661 |
| `src/components/encargos/` | 2 | 1.220 |
| `src/components/grid/` | 3 | 892 |
| `src/components/payments/` | 2 | 258 |
| `src/components/sales/` | 3 | 706 |
| `src/config/` | 1 | 145 |
| `src/data/` | 1 | 364 |
| `src/hooks/` | 7 | 910 |
| `src/services/` | 4 | 966 |
| `src/utils/` | 15 | 2.917 |

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
| `App.tsx` | 799 | Orquestador principal: estado global, persistencia, efectos de sync y montaje de modales | (default) |
| `main.tsx` | 11 | Punto de entrada de React (render del árbol en #root) | — |
| `types.ts` | 335 | Modelo de dominio tipado (Sale, Budget, Customer, CatalogProduct, AppConfig, seguridad) | SaleProductItem, SalePayment, Sale, Customer, CatalogProduct, WooCommerceConfig, ColumnMapping, DateFilterRange, BudgetItem, Budget, AppUser, RolePermissions, SecurityPolicyConfig, SecurityConfig, BackupConfig, CompanyConfig, GoogleMapsUsage, AppConfig, EncargoItem, SaleChannel, PaymentMethod, ShippingMethod, ShippingStatus, InvoiceType, PaymentStatus, UserRole, AuthMode, PermissionLevel, ToolResourceId, ResourcePermissionMap, EncargoTipo, EncargoEstado |

## `src/components/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `AnalyticsModal.tsx` | 319 | Panel de analítica con gráficos Recharts (tendencia y distribución por canal) | AnalyticsModal |
| `AuthModal.tsx` | 367 | Auth Gate: PIN, selección de rol (RBAC) y bloqueo progresivo por intentos | AuthModal |
| `BudgetModal.tsx` | 709 | Presupuestos AFIP: ítems, IVA/percepciones, PDF y conversión a venta | BudgetModal |
| `CobrosPendientesModal.tsx` | 216 | — | CobrosPendientesModal, CobrosPendientesModalProps |
| `ConfigBackupsTab.tsx` | 242 | Pestaña Copias de seguridad: backup automático, copia manual y restauración | ConfigBackupsTab, ConfigBackupsTabProps |
| `ConfigEmpresaTab.tsx` | 351 | Pestaña Empresa / Firma: identidad, logo, datos fiscales y puntos de venta | ConfigEmpresaTab, ConfigEmpresaTabProps |
| `ConfigGeneralTab.tsx` | 795 | Pestaña General & Ventas: canales, pagos, envíos, Andreani, numeración e importación | ConfigGeneralTab, ConfigGeneralTabProps |
| `ConfigModal.tsx` | 602 | Configuración del sistema: shell del modal, estado compartido, guardado y pestañas | ConfigModal |
| `ConfigSecurityTab.tsx` | 166 | Pestaña Seguridad & PIN: control de acceso, inactividad y restricciones por rol | ConfigSecurityTab, ConfigSecurityTabProps |
| `CustomerDirectoryModal.tsx` | 507 | Directorio de clientes: búsqueda, historial de compras y alta de clientes | CustomerDirectoryModal |
| `ExportModal.tsx` | 125 | Exportador de ventas a CSV por rango y canal | ExportModal |
| `Header.tsx` | 296 | Barra superior: marca, KPIs rápidos, accesos a modales, tema y bloqueo de sesión | Header |
| `ImportModal.tsx` | 583 | Importador CSV / pegado desde Google Sheets con mapeo de columnas | ImportModal |
| `KpiSummary.tsx` | 327 | Banner de KPIs mensuales, filtro por mes/canal y configuración de tarjetas visibles | KpiSummary |
| `ProductSearchPicker.tsx` | 238 | Buscador autocompletable de productos del catálogo | ProductSearchPicker, ProductSearchPickerProps |
| `RemitoModal.tsx` | 534 | Remito de entrega/despacho: datos de empresa, transporte, PDF e impresión | RemitoModal |
| `SaleFormModal.tsx` | 687 | Alta/edición de ventas: cliente, ítems con descuento, facturación, envío y borrador autoguardado | SaleFormModal |
| `SaleLocationMap.tsx` | 270 | Mapa Leaflet/OSM con geocodificación Nominatim y pin arrastrable | SaleLocationMap |
| `SendBudgetModal.tsx` | 373 | Envío omnicanal de presupuestos por WhatsApp (wa.me) y correo (mailto) | SendBudgetModal |
| `SpreadsheetGrid.tsx` | 584 | Planilla interactiva de ventas: edición inline, filtros, paginación y tracking Andreani | SpreadsheetGrid |
| `SystemLogsModal.tsx` | 425 | Consola de auditoría: filtros por nivel/categoría/fecha y exportación | SystemLogsModal |
| `WooCommerceModal.tsx` | 863 | Sincronización WooCommerce: credenciales, catálogo, clientes y programación | WooCommerceModal |

## `src/components/budget/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `BudgetEditorTab.tsx` | 529 | — | BudgetEditorTab, BudgetEditorTabProps |
| `BudgetListTab.tsx` | 143 | — | BudgetListTab, BudgetListTabProps |
| `BudgetPrintPreview.tsx` | 304 | — | BudgetPrintPreview, BudgetPrintPreviewProps |

## `src/components/common/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `PermissionGate.tsx` | 35 | — | PermissionGate, PermissionGateProps |

## `src/components/config/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `ConfigPermissionsTab.tsx` | 238 | — | ConfigPermissionsTab |
| `ConfigUsersTab.tsx` | 423 | — | ConfigUsersTab, ConfigUsersTabProps |

## `src/components/encargos/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `EncargoFormModal.tsx` | 482 | — | EncargoFormModal |
| `EncargosModal.tsx` | 738 | — | EncargosModal |

## `src/components/grid/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `GridPagination.tsx` | 82 | — | GridPagination, GridPaginationProps |
| `GridRow.tsx` | 541 | Helper badge color for sales channel | GridRow, GridVisibleColumns, GridRowProps |
| `GridToolbar.tsx` | 269 | — | GridToolbar, GridToolbarProps |

## `src/components/payments/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `PaymentStatusBadge.tsx` | 43 | — | PaymentStatusBadge |
| `SalePaymentsModal.tsx` | 215 | — | SalePaymentsModal, NuevoPagoForm, SalePaymentsModalProps |

## `src/components/sales/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `SaleBillingSection.tsx` | 176 | — | SaleBillingSection, SaleBillingSectionProps |
| `SaleCustomerSection.tsx` | 389 | — | SaleCustomerSection, SaleCustomerSectionProps |
| `SaleProductsSection.tsx` | 141 | — | SaleProductsSection, SaleProductsSectionProps |

## `src/config/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `toolRegistry.ts` | 145 | — | TOOL_REGISTRY, getDefaultOperadorPermissions, getDefaultAdminPermissions, ToolDefinition |

## `src/data/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `initialData.ts` | 364 | Datos semilla opcionales (demo), configuración inicial y empresa por defecto | DEMO_SEED_ENABLED, INITIAL_DEMO_CUSTOMERS, INITIAL_COMPANY_CONFIG, INITIAL_CONFIG, INITIAL_BUDGETS, INITIAL_SALES, INITIAL_CATALOG, INITIAL_WOO_CONFIG |

## `src/hooks/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `useBudgetCalculation.ts` | 61 | — | calculateBudgetItemSubtotal, calculateBudgetTotals, useBudgetCalculation, BudgetCalculationResult |
| `useCatalogState.ts` | 39 | — | useCatalogState, UseCatalogStateReturn |
| `usePermissions.ts` | 73 | — | usePermissions, UsePermissionsReturn |
| `useSalePaymentActions.ts` | 33 | — | useSalePaymentActions |
| `useSalesState.ts` | 241 | — | useSalesState, UseSalesStateProps, UseSalesStateReturn |
| `useSecurityRole.ts` | 118 | — | useSecurityRole, UseSecurityRoleReturn |
| `useWooCommerceSync.ts` | 345 | — | useWooCommerceSync, UseWooCommerceSyncProps, UseWooCommerceSyncReturn |

## `src/services/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `encargosService.ts` | 328 | — | getEncargos, saveEncargos, generateEncargoId, addEncargo, updateEncargo, deleteEncargo, getEncargosMetrics, agruparParaCompras, generarMensajeWhatsAppProveedor, generarMensajeWhatsAppCliente, generarUrlWhatsApp, crearProductoDeEncargo, ItemCompraConsolidado, EncargosMetrics |
| `permissionService.ts` | 98 | — | PERMISSIONS_STORAGE_KEY, getRolePermissions, saveRolePermissions, resolveUserPermission, canViewTool, canModifyTool |
| `storageRepository.ts` | 158 | — | defaultStorageRepository, IStorageRepository, LocalStorageRepository |
| `userService.ts` | 382 | — | USERS_STORAGE_KEY, USERS_STORAGE_KEY_CORRUPT, ACTIVE_USER_SESSION_KEY, ACTIVE_USER_SESSION_KEY_LEGACY, DEFAULT_ADMIN_CREDENTIALS, getUsers, hasCorruptedUsers, saveUsers, generateUserId, getActiveSessionUser, setActiveSessionUser, ensureDefaultAdminExists, createUser, updateUser, deleteUser, authenticateWithPassword, authenticateWithPin, CreateUserData, UpdateUserData |

## `src/utils/`

| Archivo | Líneas | Responsabilidad | Exports |
|:--|--:|:--|:--|
| `andreaniStatusMapper.ts` | 206 | Mapeo canónico de estados de Andreani a estados del sistema | ANDREANI_CANONICAL_STATUSES, mapAndreaniTrackingStatus, isTerminalStatus, getAndreaniStatusConfig, AndreaniStatusConfig |
| `andreaniSyncService.ts` | 114 | Consulta en lote del tracking de Andreani con caché de 60 s | clearAndreaniTrackingCache, fetchAndreaniTrackingsBulk, AndreaniTrackResult |
| `backupService.ts` | 333 | Backups en IndexedDB y disco (API /api/backup) con rotación | IDB_RETENTION, saveToIndexedDb, listFromIndexedDb, getFromIndexedDb, deleteFromIndexedDb, pruneIndexedDbBackups, saveToBackend, listFromBackend, getFromBackend, runBackup, listAllBackups, restoreBackup, checkAndTriggerAutoBackup, FullAppState, BackupItem |
| `budgetDelivery.ts` | 156 | Plantillas de envío de presupuestos (WhatsApp/correo) y normalización de teléfonos | formatWhatsAppPhone, generateBudgetWhatsAppText, generateBudgetEmailSubject, generateBudgetEmailBody, openWhatsAppForBudget, openEmailForBudget |
| `cobrosPendientes.ts` | 56 | — | getVentasPendientes, getResumenCobros, filtrarCobros, cumpleFiltroEstadoPago, ResumenCobros |
| `customerIndex.ts` | 53 | — | buildSalesCustomerIndex, filterCustomers, CustomerSalesSummary |
| `formatters.ts` | 493 | Formateo ARS/fechas, validaciones de venta, IDs y sanitización de CSV | ARGENTINE_PROVINCES, DEFAULT_PROVINCE, ARGENTINE_PROVINCE_CODES, formatCurrency, formatDate, parseDateToISO, parseAmountString, validateRequiredSaleFields, getCurrentMonthISO, generateSaleId, getMonthYearLabel, exportSalesToCSV, normalizePersonName, resolveArgentineProvince, parseCombinedAddress, parseCustomerIdentityFromWoo, RecordValidationResult |
| `googleMapsService.ts` | 319 | — | getCurrentMonthKey, getGoogleMapsUsageInfo, checkGoogleMapsQuota, recordGoogleMapsRequest, resetGoogleMapsUsage, getStoredAppConfig, saveStoredAppConfig, incrementStoredGoogleMapsUsage, checkStoredGoogleMapsQuota, testGoogleMapsApiKey, GoogleMapsTestResult, GoogleMapsUsageInfo |
| `logger.ts` | 129 | Motor de auditoría (localStorage + eventos) con filtros y exportación | getSystemLogs, addSystemLog, clearSystemLogs, filterSystemLogs, exportLogsJSON, exportLogsCSV, LogEntry, LogFilterOptions, LogLevel |
| `numberToWords.ts` | 104 | Conversión de importes a texto (para comprobantes) | numberToWordsSpanish |
| `pdfCobros.ts` | 141 | — | exportarCobrosPendientesPDF |
| `salePayments.ts` | 115 | — | ESTADO_PAGO_LABEL, round2, esVentaHistorica, getPagos, getTotalCobrado, getSaldo, getEstadoPago, validarPago, generatePaymentId, crearPago, agregarPago, quitarPago, PaymentValidationResult, NuevoPagoInput |
| `security.ts` | 107 | Hash de PIN (SHA-256), verificación retrocompatible y escalada de bloqueo | PIN_SALT, PASSWORD_SALT, isHashedPin, authLockWaitMs, hashPin, verifyPin, hashPassword, verifyPassword |
| `securityAccess.ts` | 37 | — | canManageSecurity, hayAdminConCredencialesSeguras, AdminCredencialInput |
| `wooCommerceApi.ts` | 554 | Cliente REST de WooCommerce: productos y clientes paginados | buildWooApiUrl, transformWooProduct, transformWooCustomer, fetchWithCorsProxy, fetchWooCommerceProducts, fetchWooCommerceCustomers, WooProductDTO, WooCustomerDTO |

## Documentación de referencia

| Documento | Contenido |
|:--|:--|
| `AGENTS.md` | Protocolo de sesión para agentes (lectura mínima, ahorro de tokens) |
| `docs/ESTADO-DEL-PROYECTO.md` | Estado actual, entregado, pendientes y cómo retomar |
| `docs/FIXES.md` | Registro de correcciones aplicadas y deuda pendiente (IDs) |
| `CHANGELOG.txt` | Historial de versiones |
| `graphify-out/GRAPH_REPORT.md` | Reporte del grafo de conocimiento (comunidades, nodos centrales) |
