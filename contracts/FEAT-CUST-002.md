# CONTRACT: Normalización de Clientes, Extracción DNI WooCommerce y Distribución de Campos en Venta
# ID: FEAT-CUST-002
# Status: RESOLVED
# Mode: LOOP
# Gate-Mode: EXPRESS

## Intent
Normalizar los datos filiatorios y de localización del cliente en la base de datos (nombres/apellidos en formato Title Case), optimizar la extracción de documentos de identidad (DNI/CUIT) desde la API de WooCommerce, separar correctamente Nº de cliente, nombre y apellido al precargar ventas, e incorporar en el formulario de ventas el código postal (CP) y el selector de provincias con Santa Fe por defecto, distribuyendo la dirección completa (Domicilio, Localidad, CP y Provincia) en una sola fila compacta de 4 columnas.

## Use Case
**Actor:** Operador comercial / Facturador
**Goal:** Registrar y sincronizar clientes y ventas con datos homogéneos, prolijos y sin mezclar campos, visualizando el domicilio completo en una única fila organizada y con valores por defecto regionales (Santa Fe).

### Main Flow
1. Al registrar o editar un cliente (manualmente en el Directorio de Clientes, en la venta o al sincronizar desde WooCommerce), los nombres y apellidos se convierten automáticamente a formato Capitalizado / Title Case (primer carácter de cada palabra en mayúscula, resto en minúscula), eliminando espacios sobrantes.
2. Al sincronizar clientes de WooCommerce (tanto en cliente web como en `server-woo.js`), el sistema analiza metadatos y campos alternativos en busca de DNI/CUIT (claves `billing_dni`, `_billing_dni`, `billing_cuit`, `_billing_cuit`, `cuit`, `dni`, `cuil`, `billing_doc`, `documento`, `cedula`, `billing_identification_number`, etc., y formato numérico en campos de facturación), asignándolo al campo `dniCuit`. También extrae el código postal (`postcode`).
3. Al buscar y seleccionar un cliente registrado en el modal de nueva venta (`SaleFormModal`), el sistema desglosa los valores y ubica cada dato en su control correspondiente:
   - Nº de cliente en `clienteId`
   - Nombre en `clienteNombre`
   - Apellido en `clienteApellido` (desdoblando inteligentemente si el registro histórico contenía nombre compuesto o apellido en el mismo campo).
4. El formulario de nueva venta presenta el selector de Provincia como lista desplegable (`<select>`) con las 24 jurisdicciones de Argentina, inicializada por defecto en `"Santa Fe"`.
5. En la sección de domicilio de `SaleFormModal`, los campos de Domicilio, Localidad, Código Postal y Provincia se organizan en una única fila responsive de 4 columnas con proporciones balanceadas.
6. Al guardar la venta, los campos `clienteCodigoPostal` y la dirección normalizada se persisten en el registro de venta y en el directorio de clientes.

### Alternative Flows
- AF-01: Cliente existente en WooCommerce sin metadatos de DNI pero con número de documento en `billing.company` o notas → Extrae el valor si coincide con el patrón de DNI/CUIT.
- AF-02: Cliente con nombre y apellido ingresado en un único campo (ej. importaciones legadas sin apellido) → Al seleccionarlo en una venta, se extrae el apellido en el campo dedicado y ambos se normalizan con Title Case.
- AF-03: Venta con domicilio de entrega diferente marcado → Presenta también la opción de provincia mediante selector y código postal de entrega con el mismo estándar.

## Business Rules
- BR-001: Toda persistencia o actualización de nombre y apellido de clientes debe aplicar `normalizePersonName`, asegurando Title Case estricto y eliminación de caracteres de relleno o espacios duplicados.
- BR-002: La extracción de WooCommerce debe cubrir las variantes más frecuentes de plugins de facturación y checkout argentinos para el DNI/CUIT (plugins de AFIP, WooCommerce DNI/CUIT, campos personalizados).
- BR-003: Al autocompletar un cliente en `SaleFormModal`, `clienteId`, `clienteNombre` y `clienteApellido` deben poblarse por separado sin duplicar el apellido dentro del nombre.
- BR-004: El campo Provincia de una nueva venta debe ser un selector con las 24 provincias argentinas oficiales, preseleccionando `"Santa Fe"` cuando no exista provincia previa.
- BR-005: La sección de ubicación del cliente en `SaleFormModal` debe contener exactamente 4 columnas alineadas (`Domicilio`, `Localidad`, `Código Postal`, `Provincia`), garantizando legibilidad y rapidez de carga para operadores.

## Acceptance Criteria
- AC-001: GIVEN strings con diversas capitalizaciones (ej: `"JUAN CARLOS PÉREZ"`, `"maría  de los Ángeles"`) WHEN se invoca `normalizePersonName` THEN devuelve `"Juan Carlos Pérez"` y `"María De Los Ángeles"` sin dobles espacios.
- AC-002: GIVEN un payload de WooCommerce con DNI en `meta_data` (ej. `_billing_dni: "35123456"`) o en campos de facturación WHEN se procesa con `transformWooCustomer` (frontend) o `mapCustomer` (backend) THEN el cliente resultante tiene `dniCuit: "35123456"` y `codigoPostal` extraído.
- AC-003: GIVEN un cliente en el directorio WHEN es seleccionado en `SaleFormModal` THEN `clienteId`, `clienteNombre` y `clienteApellido` se asignan a sus inputs individuales desglosados y capitalizados.
- AC-004: GIVEN una venta nueva WHEN se abre `SaleFormModal` THEN el campo Provincia es un `<select>` con las 24 provincias argentinas y tiene seleccionado por defecto `"Santa Fe"`.
- AC-005: GIVEN el formulario `SaleFormModal` WHEN se visualiza la sección de dirección THEN los 4 campos (`Domicilio`, `Localidad`, `CP`, `Provincia`) se disponen en una única fila de 4 columnas en resoluciones de escritorio/tablet.
- AC-006: GIVEN la verificación técnica global WHEN se ejecutan `npm run lint` y `npm test` THEN no existen errores tipados, warnings de ESLint ni fallos en la suite de pruebas.

## Entities Affected
- `src/types.ts`: Incorporación de `clienteCodigoPostal` y `entregaCodigoPostal` en `Sale`, verificación de `Customer`.
- `src/utils/formatters.ts`: Función `normalizePersonName` y lista de provincias `ARGENTINE_PROVINCES` con `DEFAULT_PROVINCE = 'Santa Fe'`.
- `src/utils/wooCommerceApi.ts`: Normalización de nombres, extracción extendida de DNI/CUIT y código postal en `transformWooCustomer`.
- `server-woo.js`: Extracción extendida de DNI/CUIT y código postal + normalización en `mapCustomer`.
- `src/components/SaleFormModal.tsx`: Layout de 4 columnas para dirección, inclusión de CP, selector de provincia por defecto "Santa Fe", desglose separado de id/nombre/apellido.
- `src/components/CustomerDirectoryModal.tsx`: Inclusión de CP, normalización de nombre y apellido al dar de alta cliente, selector de provincias con default Santa Fe.
- `src/App.tsx`: Persistencia de `clienteCodigoPostal` y normalización al autocrear cliente desde una venta.
- `src/__tests__/customerNormalization.test.ts`: Batería de pruebas unitarias para todas las reglas de negocio y criterios de aceptación.

## Ambiguity Log
- [x] ¿Qué pasa si el cliente ya registrado tiene guardada otra provincia (ej. "Córdoba")?
      *Decisión:* Si la venta o cliente ya tiene una provincia existente válida, se respeta ese valor; "Santa Fe" solo se utiliza como valor por defecto cuando se crea una nueva venta o no se ha definido provincia.
- [x] ¿Debe permitirse ingresar un código postal alfanumérico (ej: "S3000") o solo numérico (ej: "3000")?
      *Decisión:* El campo de Código Postal debe permitir alfanumérico estándar para admitir tanto el formato tradicional de 4 dígitos como el CPA argentino o códigos postales limítrofes.

## Completion Map
# generated: 2026-09-22T18:50:00Z
# Normalizador de nombres y catálogo de provincias en formatters|AC-001,BR-001|coder-agent|✅
# Extracción robusta de DNI y CP en WooCommerce (frontend y backend)|AC-002,BR-002|coder-agent|✅
# Desglose de clienteId, nombre y apellido en SaleFormModal|AC-003,BR-003|coder-agent|✅
# Selector de provincia con default Santa Fe y layout 4 columnas con CP|AC-004,AC-005,BR-004,BR-005|coder-agent|✅
# Integración en CustomerDirectoryModal y App.tsx|BR-001,AC-001|coder-agent|✅
# Suite de pruebas unitarias customerNormalization.test.ts|AC-001,AC-002,AC-003,AC-004,AC-005|tester-agent|✅
# Verificación técnica y de calidad (lint, test, build)|AC-006|reviewer-agent|✅
