# CONTRACT: Tool Registry y Matriz de Permisos Granulares por Herramienta (RBAC)
# ID: FEAT-RBAC-001
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: FULL

## Intent
Implementar un sistema modular de **Control de Acceso Basado en Roles y Herramientas (RBAC)** administrable exclusivamente por el rol Administrador. Incorpora un **Registro Central de Herramientas (Tool Registry)** extensible donde cada módulo del sistema declara sus capacidades y niveles de acceso requeridos (`none` / `read` / `full`). Permite al Administrador configurar de forma interactiva qué roles u operadores pueden ver o no ver cada herramienta, quiénes pueden verla en modo consulta ("Solo Lectura" sin poder modificar, borrar ni crear) y quiénes poseen control total. Cualquier módulo o función que se agregue en el futuro queda automáticamente integrado a la matriz de permisos.

## Use Case
**Actor:** Administrador del Sistema  
**Goal:** Restringir y auditar con precisión qué información comercial, herramientas operativas y opciones de configuración puede ver y manipular cada usuario del local, garantizando que los operadores no modifiquen configuraciones críticas ni datos sensibles.

### Main Flow
1. **Registro Declarativo de Herramientas (Tool Registry):**
   - El sistema define un registro maestro tipado (`TOOL_REGISTRY`) que cataloga todas las herramientas del sistema:
     - `ventas`: Planilla interactiva de ventas diarias y facturación.
     - `presupuestos`: Módulo de presupuestos oficiales y presupuestador AFIP.
     - `clientes`: Directorio de clientes, historial de compras y fichas de contacto.
     - `catalogo`: Catálogo de productos y sincronización con WooCommerce.
     - `encargos`: Gestión de demanda, encargos de repuestos/productos y compras a proveedores.
     - `estadisticas`: Gráficos, métricas financieras y análisis de rentabilidad.
     - `configuracion`: Parámetros de canales de venta, métodos de pago, datos de empresa y Google Maps.
     - `seguridad`: Gestión de cuentas de usuario, políticas y matriz de permisos.
     - `backups`: Generación, descarga y restauración de copias de seguridad.
     - `logs`: Visor de eventos de auditoría y errores del sistema.
   - Cada herramienta define si admite el modo "Solo Lectura" (ej: ver ventas sin editar, o ver catálogo sin modificar precios ni stock).

2. **Panel de Matriz de Permisos (Solo Admin):**
   - El Administrador accede a la pestaña *"Permisos & Accesos"* dentro del panel de Configuración.
   - Visualiza una tabla matricial interactiva:
     - Filas: Las herramientas registradas en el `TOOL_REGISTRY`.
     - Columnas: Perfiles / Roles configurados (ej: `OPERADOR`, perfiles personalizados futuros; el rol `ADMIN` siempre mantiene acceso total de seguridad).
     - Valores seleccionables:
       - 🔴 **Sin Acceso (`none`):** El usuario no ve el botón en el Header ni puede abrir la herramienta.
       - 🟡 **Solo Lectura (`read`):** El usuario puede ingresar a ver la información, pero todos los botones de acción (`+ Nuevo`, `Guardar`, `Editar`, `Eliminar`, `Importar`, `Exportar`, `Sincronizar`) se ocultan o quedan deshabilitados en modo visualización.
       - 🟢 **Acceso Total (`full`):** Control operativo y de edición completo.
   - Al guardar los cambios, la matriz se actualiza y aplica inmediatamente para todas las sesiones.

3. **Enforcement en la Interfaz y en Hooks de Control:**
   - El componente de barra superior [`Header.tsx`](file:///d:/ProyectosDual/Ventas/Registro-de-ventas/src/components/Header.tsx) evalúa los permisos antes de renderizar cada botón. Si una herramienta tiene nivel `none`, el botón no se dibuja en pantalla.
   - Si una herramienta está en nivel `read`, los modales y grillas reciben la bandera `isReadOnly={true}` o renderizan sus controles envueltos en componentes de guardia de permisos (`<PermissionGate resource="..." action="write">`).
   - El acceso a `configuracion` y `seguridad` queda estrictamente denegado a cualquier usuario sin rol Administrador o permiso explícito.

### Alternative Flows
- **AF-01 (Incorporación de un Nuevo Feat Futuro):**
  - Un desarrollador crea una nueva funcionalidad en el sistema $\rightarrow$ Agrega una entrada en el archivo del registro (`src/config/toolRegistry.ts`) con su ID, nombre, icono y capacidades.
  - La nueva herramienta aparece de inmediato en la matriz de permisos de configuración sin tener que reescribir la lógica de seguridad.
- **AF-02 (Intento de Invocación Directa):**
  - Si un operador intenta abrir un modal mediante atajos de teclado o eventos en consola $\rightarrow$ El hook `usePermissions` bloquea la apertura, emite un aviso visual "Acceso Denegado por Política de Seguridad" y registra un log de advertencia en auditoría.

## Business Rules
- **BR-RBAC-001:** El rol `ADMIN` siempre tiene garantizado acceso `full` a todas las herramientas y no puede ser deshabilitado de la herramienta `seguridad`, evitando bloqueos accidentales permanentes.
- **BR-RBAC-002:** Por defecto, los operadores nuevos o sin configuración personalizada tienen permiso `full` en `ventas`, `presupuestos`, `clientes` y `encargos`; permiso `read` en `catalogo` y `estadisticas`; y `none` en `configuracion`, `seguridad`, `backups` y `logs`.
- **BR-RBAC-003:** En modo `read` (Solo Lectura), queda terminantemente prohibida cualquier mutación del estado local o de `localStorage` para esa entidad.
- **BR-RBAC-004:** La matriz de permisos se persiste en `localStorage` bajo la clave `app_rbac_permissions_v1` y se incluye automáticamente en las copias de seguridad del sistema.
- **BR-RBAC-005:** Toda la interfaz de configuración de permisos debe respetar la paleta de colores y estilos Tailwind de SalesHub, incluyendo soporte completo para tema claro y tema oscuro (`dark:`).

## Acceptance Criteria
- **AC-RBAC-001:** GIVEN un usuario con rol Operador WHEN la herramienta "Configuración" tiene permiso `none` THEN el botón de Configuración no se muestra en el Header y el modal no puede abrirse.
- **AC-RBAC-002:** GIVEN un usuario con permiso `read` en "Catálogo" WHEN abre el catálogo THEN puede buscar y ver los productos y precios pero los botones "Agregar Producto", "Editar", "Eliminar" y "Sincronizar con WooCommerce" están ocultos o deshabilitados.
- **AC-RBAC-003:** GIVEN el panel de configuración de permisos WHEN un Admin cambia el acceso de "Encargos" para Operadores de `full` a `read` y guarda THEN los operadores ven la lista de encargos sin los botones de editar o borrar.
- **AC-RBAC-004:** GIVEN un desarrollador agregando una nueva herramienta en `toolRegistry.ts` WHEN se abre la matriz de permisos THEN la nueva herramienta se lista automáticamente con sus 3 opciones configurables.
- **AC-RBAC-005:** GIVEN la suite de validación WHEN se ejecutan los tests de permisos THEN el hook y los componentes de guardia responden correctamente a combinaciones de `none`, `read` y `full` sin regresiones.

## Entities Affected
- `src/config/toolRegistry.ts`: Definición tipada de los módulos/herramientas del sistema y sus metadatos.
- `src/types.ts`: Tipos `PermissionLevel` (`'none' | 'read' | 'full'`), `ResourcePermissionMap`, `RolePermissions`.
- `src/services/permissionService.ts`: Lógica de resolución de permisos, persistencia y matriz predeterminada.
- `src/hooks/usePermissions.ts`: Hook para componentes (`canRead`, `canWrite`, `hasAccess`).
- `src/components/common/PermissionGate.tsx`: Componente wrapper condicional para UI.
- `src/components/config/ConfigPermissionsTab.tsx`: Interfaz interactiva de la matriz de permisos para el Admin.
- `src/components/Header.tsx`: Filtrado dinámico de botones según permisos del usuario activo.
- `src/components/SpreadsheetGrid.tsx`, `BudgetModal.tsx`, `EncargosModal.tsx`, `WooCommerceModal.tsx`: Aplicación del modo Solo Lectura (`isReadOnly`).
- `src/__tests__/permissionService.test.ts`: Pruebas unitarias de resolución y restricciones de permisos.

## Ambiguity Log
- [x] ¿Cómo se maneja un usuario que necesita ver estadísticas pero no modificar ventas?  
      *Decisión:* Se configura `estadisticas: full`, `ventas: read`. Podrá ver la planilla y los reportes pero no podrá alterar ventas.
- [x] ¿Qué ocurre si se agrega un nuevo módulo al código?  
      *Decisión:* Se declara en `toolRegistry.ts`; si una matriz guardada no lo contiene aún, hereda automáticamente la política por defecto según el rol.

## Completion Map
# generated: 2026-10-17T10:00:00Z
# Tarea 1: Registro maestro toolRegistry.ts y tipos de permisos en src/types.ts|BR-RBAC-001,BR-RBAC-002|✅
# Tarea 2: Servicio permissionService.ts con resolución de permisos y defaults seguros|BR-RBAC-002,BR-RBAC-004|✅
# Tarea 3: Hook usePermissions.ts y componente wrapper PermissionGate.tsx|AC-RBAC-001,AC-RBAC-002|✅
# Tarea 4: Pestaña visual ConfigPermissionsTab.tsx con matriz interactiva en ConfigModal|AC-RBAC-003,BR-RBAC-005|✅
# Tarea 5: Adaptación de Header.tsx y componentes principales con soporte isReadOnly|AC-RBAC-001,AC-RBAC-002,BR-RBAC-003|✅
# Tarea 6: Pruebas unitarias en src/__tests__/permissionService.test.ts y validación|AC-RBAC-005|✅
