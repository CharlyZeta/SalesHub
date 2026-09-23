# CONTRACT: Parseo Inteligente de Clientes WooCommerce: Nº Interno CLI, Nombre/Apellido y Dirección Combinada
# ID: FEAT-CUST-003
# Status: RESOLVED
# Mode: LOOP
# Gate-Mode: EXPRESS

## Intent
Resolver el problema de clientes importados o sincronizados desde WooCommerce que traen el número de cliente embebido al inicio del apellido o nombre (ej: "325 Prai Nestor", "3861 Morales Sergio") extrayéndolo automáticamente al formato `CLI-[NÚMERO]` y separando el Apellido ("Prai") y el Nombre ("Nestor"); asimismo, desglosar las direcciones que vienen concatenadas por coma en un único campo (ej: "TTE. LOZA 6900, SANTA FE, S") asignando limpiamente Domicilio, Localidad y traduciendo códigos de provincia (ej: 'S' -> 'Santa Fe').

## Use Case
**Actor:** Operador / Sincronizador de catálogo y clientes
**Goal:** Disponer de los clientes de WooCommerce perfectamente estructurados con su Nº de cliente interno correlacionado con el ERP/Tango/Dragonfish, sus nombres y apellidos separados en sus campos propios, y sus domicilios desdoblados en calle, localidad y provincia normalizada.

### Main Flow
1. Durante la transformación de clientes de WooCommerce (en `transformWooCustomer` y `server-woo.js`), el sistema analiza los campos de nombre y apellido (`first_name`, `last_name`, `company` o concatenación de nombres).
2. Si detecta un prefijo numérico al inicio (ej: `"325 Prai Nestor"` o `last_name: "325 Prai"`, `first_name: "Nestor"`):
   - Extrae el número (`325`) y asigna `clienteId: "CLI-325"`.
   - Separa el resto en Apellido (primer término post-número, ej: `"Prai"`) y Nombre (términos subsiguientes o el `first_name` si ya venía separado, ej: `"Nestor"`).
   - Aplica `normalizePersonName` a ambos campos.
3. El sistema examina el campo de dirección (`address_1` / `direccion`):
   - Si contiene partes separadas por coma (ej: `"TTE. LOZA 6900, SANTA FE, S"`):
     - La primera parte se asigna a `direccion` (ej: `"Tte. Loza 6900"`).
     - La segunda parte se asigna a `localidad` (ej: `"Santa Fe"`), siempre que no esté ya especificada.
     - La tercera parte se analiza como provincia: si es una letra o código provincial argentino (ej: `'S'` para Santa Fe, `'B'` para Buenos Aires, `'X'` para Córdoba, etc.) o nombre abreviado, se mapea a su nombre oficial completo en `provincia`.
4. El cliente resultante se guarda y sincroniza con todos sus atributos desagregados y tipados.

### Alternative Flows
- AF-01: El cliente no trae número al inicio → Conserva el `clienteId` habitual (`WC-[ID]`) y preserva nombre y apellido en sus campos normalizados.
- AF-02: La dirección no tiene comas → Se conserva la dirección tal como viene y se respeta `city` y `state` provistos por WooCommerce.
- AF-03: La dirección tiene sólo 2 partes (ej: `"San Martín 500, Rosario"`) → Asigna domicilio y localidad, manteniendo la provincia de WooCommerce o por defecto.

## Business Rules
- BR-001: Todo prefijo numérico que comience en el apellido o nombre de cliente de WooCommerce (patrón `^(\d+)\s+(.+)$`) debe ser extraído como identificador interno y asignado a `clienteId` con el formato `CLI-[NÚMERO]`.
- BR-002: Tras extraer el identificador numérico, el remanente debe dividirse asignando el primer bloque al Apellido y el resto al Nombre (ej: `"3861 Morales Sergio"` -> `clienteId: CLI-3861`, `apellido: Morales`, `nombre: Sergio`). Ambos se procesan con `normalizePersonName`.
- BR-003: Toda dirección con comas del tipo `[Calle y altura], [Localidad], [Provincia/Código]` debe desglosarse automáticamente en `direccion`, `localidad` y `provincia`.
- BR-004: Debe existir un diccionario oficial de códigos de jurisdicción argentina (ISO 3166-2:AR / AFIP / patentes) donde `'S'` se traduzca a `'Santa Fe'`, `'B'` a `'Buenos Aires'`, `'C'` a `'Ciudad Autónoma de Buenos Aires'`, `'X'` a `'Córdoba'`, `'E'` a `'Entre Ríos'`, etc.
- BR-005: Esta normalización debe ser idempotente y aplicarse de forma gemela en frontend (`src/utils/wooCommerceApi.ts`), backend (`server-woo.js`) y utilitarios compartidos (`src/utils/formatters.ts`).

## Acceptance Criteria
- AC-001: GIVEN un cliente con `last_name: "325 Prai Nestor"` y `first_name: ""` WHEN es procesado THEN genera `clienteId: "CLI-325"`, `apellido: "Prai"`, `nombre: "Nestor"`.
- AC-002: GIVEN un cliente con `last_name: "3861 Morales"` y `first_name: "Sergio"` WHEN es procesado THEN genera `clienteId: "CLI-3861"`, `apellido: "Morales"`, `nombre: "Sergio"`.
- AC-003: GIVEN una dirección `"TTE. LOZA 6900, SANTA FE, S"` WHEN se analiza THEN genera `direccion: "Tte. Loza 6900"`, `localidad: "Santa Fe"`, `provincia: "Santa Fe"`.
- AC-004: GIVEN diferentes códigos de provincia de 1 letra (ej: `'S'`, `'X'`, `'B'`, `'E'`) WHEN son evaluados THEN se resuelven a sus provincias completas (`"Santa Fe"`, `"Córdoba"`, `"Buenos Aires"`, `"Entre Ríos"`).
- AC-005: GIVEN la ejecución de `npm run lint` y `npm test` THEN no debe arrojar advertencias, errores de TypeScript ni fallas en los tests unitarios.

## Entities Affected
- `src/utils/formatters.ts`: Nuevas funciones `parseCustomerIdentityFromWoo(rawFirst, rawLast)` y `parseCombinedAddress(rawAddress, rawCity, rawState)` con el diccionario de códigos de provincia.
- `src/utils/wooCommerceApi.ts`: Uso de las funciones de parseo en `transformWooCustomer`.
- `server-woo.js`: Uso de las funciones de parseo equivalentes en `mapCustomer`.
- `src/__tests__/customerNormalization.test.ts`: Tests unitarios para las nuevas reglas de negocio AC-001 a AC-004.

## Ambiguity Log
- [x] ¿Qué ocurre si el cliente ya tiene un `clienteId` manual en la base de datos local?
      *Decisión:* Si se sincroniza desde WooCommerce con un prefijo numérico como `325 Prai Nestor`, el ID `CLI-325` representa el código unívoco de cliente del comercio/ERP, por lo que tiene precedencia sobre el `WC-[ID]` numérico autogenerado de WordPress.

## Completion Map
# generated: 2026-09-22T19:15:00Z
# Funciones parseCustomerIdentityFromWoo y parseCombinedAddress con mapa de provincias|AC-001,AC-002,AC-003,AC-004,BR-001,BR-002,BR-003,BR-004|coder-agent|✅
# Integración en transformWooCustomer en frontend|AC-001,AC-002,AC-003|coder-agent|✅
# Integración en mapCustomer en server-woo.js backend|AC-001,AC-002,AC-003|coder-agent|✅
# Cobertura de tests unitarios en customerNormalization.test.ts|AC-001,AC-002,AC-003,AC-004|tester-agent|✅
# Verificación técnica integral (lint, test, build)|AC-005|reviewer-agent|✅
