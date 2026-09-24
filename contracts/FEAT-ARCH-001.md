# CONTRACT: Modernización Arquitectónica, Code-Splitting y Descomposición Modular de Componentes
# ID: FEAT-ARCH-001
# Status: RESOLVED
# Mode: LOOP
# Gate-Mode: FULL

## Intent
Modernizar la arquitectura de SalesHub para reducir la carga de código inicial, optimizar el rendimiento de renderizado y desacoplar los componentes masivos ("God Components": BudgetModal, SaleFormModal, SpreadsheetGrid y App.tsx) en submódulos cohesivos, custom hooks de dominio y una capa de abstracción de repositorio de persistencia (Storage Repository Pattern), garantizando cero regresiones y 100% de compatibilidad con la funcionalidad existente.

## Use Case
**Actor:** Operador de mostrador / Administrador del local / Desarrollador
**Goal:** Iniciar la aplicación con velocidad ultra rápida (bundle inicial < 350 kB), navegar e interactuar de forma fluida sin re-renderizados innecesarios en la grilla de ventas, y contar con una base de código modular, extensible y preparada para multi-sucursal o backend remoto en el futuro.

### Main Flow
1. **Code-Splitting y Lazy Loading (Etapa 1):**
   - Se configuran chunks específicos en Rollup (`vite.config.ts`) para aislar librerías de terceros (`vendor-react`, `vendor-icons`, `vendor-charts`, `vendor-geo`, `vendor-utils`).
   - Se transforman los modales pesados en `src/App.tsx` a importaciones diferidas con `React.lazy()` y `<Suspense>`.
2. **Descomposición de Componentes Monolíticos (Etapa 2):**
   - `BudgetModal.tsx` se descompone en `src/components/budget/BudgetEditorTab.tsx`, `src/components/budget/BudgetListTab.tsx`, `src/components/budget/BudgetPrintPreview.tsx` y `src/hooks/useBudgetCalculation.ts`.
   - `SaleFormModal.tsx` se descompone en `src/components/sales/SaleCustomerSection.tsx`, `src/components/sales/SaleProductsSection.tsx`, `src/components/sales/SaleBillingSection.tsx` y `src/components/sales/SaleDeliverySection.tsx`.
   - `SpreadsheetGrid.tsx` aísla el renderizado de filas en `src/components/grid/GridRow.tsx` memoizado con `React.memo`, junto con `src/components/grid/GridToolbar.tsx` y `src/components/grid/GridPagination.tsx`.
3. **Extracción de Custom Hooks de Dominio (Etapa 3):**
   - Se extraen la lógica de estado de ventas (`useSalesState.ts`), sincronización con WooCommerce (`useWooCommerceSync.ts`), catálogo (`useCatalogState.ts`) y seguridad/PIN (`useSecurityRole.ts`).
   - `App.tsx` pasa a ser un orquestador conciso (<250 líneas).
4. **Capa de Abstracción de Persistencia (Etapa 4):**
   - Se implementa `src/services/storageRepository.ts` con la interfaz `IStorageRepository` para desacoplar el acceso a `localStorage` / IndexedDB / API de servidor.
5. **Verificación y Pruebas (Etapa 5):**
   - Se ejecutan y superan todos los tests unitarios existentes y nuevos, typecheck estricto, 0 dependencias circulares y reducción comprobada del bundle en `dist/`.

### Alternative Flows
- AF-01: El navegador tarda en descargar un modal diferido en red lenta → Se presenta un `ModalLoadingFallback` accesible y estilizado con spinner consistente con el resto de la app.

## Business Rules
- BR-001: La carga diferida de modales no debe alterar ningún comportamiento funcional ni causar parpadeos o pérdida de foco en los controles.
- BR-002: La edición en celdas de `SpreadsheetGrid` solo debe re-renderizar la fila afectada (`GridRow` memoizado).
- BR-003: Los cálculos de presupuestos, descuentos, IVA, percepciones y conversión de números a palabras deben preservar 100% la exactitud previa.
- BR-004: Todas las mutaciones de ventas, sincronización periódica de WooCommerce, tracking de Andreani y copias de seguridad deben seguir operando de forma idéntica e ininterrumpida.
- BR-005: Todo nuevo componente debe soportar modo oscuro (`dark:`) y tipado estricto en TypeScript sin `any` innecesarios.

## Acceptance Criteria
- AC-001: GIVEN `npm run build` WHEN se compila el proyecto THEN el chunk principal de entrada `index-*.js` pesa menos de 350 kB (reducción >65% desde los 1.16 MB originales) y no hay advertencias de chunk excesivo (>500 kB).
- AC-002: GIVEN la apertura de cualquier modal secundario (Analytics, Presupuestos, WooCommerce, Configuración, etc.) WHEN el usuario lo solicita THEN se carga de forma diferida con `Suspense` y abre correctamente.
- AC-003: GIVEN la confección o edición de presupuestos WHEN se ingresan productos, descuentos y datos de cliente THEN los cálculos y la vista previa de impresión funcionan de manera idéntica a la versión anterior.
- AC-004: GIVEN la edición de una celda en la grilla principal de ventas WHEN se modifica un valor THEN la fila responde de forma inmediata y aislada mediante `GridRow` memoizado.
- AC-005: GIVEN la suite de pruebas automatizadas WHEN se corre `npm test` THEN el 100% de los tests pasan exitosamente y se agregan tests para nuevos hooks.
- AC-006: GIVEN la verificación estricta WHEN se corre `npm run lint` y `npm run deps:circular` THEN no hay errores de TypeScript, ni advertencias de ESLint, ni dependencias circulares (0 ciclos).

## Entities Affected
- `vite.config.ts`: Configuración de `manualChunks` en Rollup.
- `src/App.tsx`: Refactor a orquestador ligero con `React.lazy()` y custom hooks.
- `src/components/BudgetModal.tsx` & `src/components/budget/*`: Modularización del modal de presupuestos.
- `src/components/SaleFormModal.tsx` & `src/components/sales/*`: Modularización del formulario de ventas.
- `src/components/SpreadsheetGrid.tsx` & `src/components/grid/*`: Fila memoizada y controles extraídos.
- `src/hooks/*`: Nuevos custom hooks (`useSalesState`, `useWooCommerceSync`, `useCatalogState`, `useSecurityRole`, `useBudgetCalculation`).
- `src/services/storageRepository.ts`: Contrato de persistencia unificado.
- `src/__tests__/*`: Tests de hooks y verificación global.

## Ambiguity Log
- [x] ¿Debe alterarse la estructura de datos guardada en `localStorage` o IndexedDB?
      *Decisión:* No. La capa de repositorio y los hooks mantendrán exactamente el mismo formato y claves (`saleshub_sales`, `saleshub_config`, etc.) para garantizar retrocompatibilidad total sin necesidad de migración de datos de usuario.

## Completion Map
# generated: 2026-09-24T22:45:00Z
# Etapa 1: Rollup manualChunks en vite.config.ts y Lazy loading en App.tsx|AC-001,AC-002,BR-001|coder-agent|✅
# Etapa 2.1: Descomposición de BudgetModal en submódulos y useBudgetCalculation|AC-003,BR-003,BR-005|coder-agent|✅
# Etapa 2.2: Descomposición de SaleFormModal en submódulos de venta|AC-004,BR-004,BR-005|coder-agent|✅
# Etapa 2.3: Optimización de SpreadsheetGrid con GridRow memoizado|AC-004,BR-002,BR-005|coder-agent|✅
# Etapa 3: Extracción de custom hooks de dominio y adelgazamiento de App.tsx|AC-004,BR-004|coder-agent|✅
# Etapa 4: Abstracción de Storage Repository Pattern|AC-004,BR-004|coder-agent|✅
# Etapa 5: Verificación de tests, lint, circular deps y bundle build|AC-001,AC-005,AC-006|tester-agent|✅
