# CONTRACT: Gestión de Encargos, Backlog de Demanda y Lista de Compras para Proveedores

# ID: FEAT-ENCARGOS-001

# Status: RESOLVED

# Mode: LOOP

# Gate-Mode: FULL

## Intent

Implementar un módulo integral y ágil de **"Encargos y Lista de Compras"** para gestionar la demanda de productos y repuestos que no se encuentran actualmente en el catálogo ni en stock de la tienda. El módulo permite registrar rápidamente encargos de clientes (agendados o prospectos), visualizar el tablero de demanda consolidada, generar la lista de compras agrupada para proveedores (con copia a WhatsApp/exportación), notificar a los clientes al recibir la mercadería e incorporar automáticamente los productos y clientes al catálogo y ventas del sistema.

## Use Case

**Actor:** Operador de mostrador / Encargado de compras / Vendedor  
**Goal:** Capturar en segundos solicitudes de artículos no disponibles, consolidar las compras para los distribuidores/proveedores y convertir ágilmente los encargos recibidos en stock de catálogo y ventas concretadas.

### Main Flow

1. **Captura de Encargo (1 solo paso):**
   - El operador abre "Nuevo Encargo" desde el Header (o atajo en tablero).
   - Identifica al cliente: mediante búsqueda sensible en clientes agendados existentes O ingresando datos mínimos de un prospecto (Nombre + Teléfono requeridos).
   - Define el ítem solicitado: Categoría (`Repuesto` | `Producto`), Nombre/descripción del repuesto o producto, Modelo/Marca compatible, Cantidad solicitada, Precio estimado acordado y Seña recibida (si aplica).
   - Guarda el encargo; el sistema genera ID correlativo (`ENC-YYYYMM-XXX`), fecha de registro y estado inicial `pendiente_compra`.

2. **Tablero de Control de Demanda:**
   - Visualiza métricas en tiempo real: _Pendientes de Pedir_, _En Camino (Pedidos)_ y _Recibidos en Local_.
   - Grilla interactiva con filtros por estado (`Todos`, `Pendientes`, `En Camino`, `Recibidos`, `Entregados`), categoría (`Repuestos` / `Productos`) y buscador por texto.
   - Badge de estado con transiciones directas con un clic.

3. **Consolidación y Lista de Compras a Proveedores:**
   - La herramienta agrupa automáticamente los encargos pendientes con el mismo nombre/descripción sumando sus cantidades (ej: 2 clientes piden el mismo repuesto $\rightarrow$ total 3 unidades).
   - Permite filtrar por proveedor sugerido o rubro.
   - Permite copiar el listado formateado para enviar por WhatsApp/Email al proveedor o imprimir orden de compra.
   - Permite marcar en lote los ítems incluidos como `pedido_proveedor`.

4. **Recepción e Incorporación al Sistema:**
   - Al arribar la mercadería, el operador cambia el estado a `recibido`.
   - **Aviso por WhatsApp:** Botón con enlace `https://wa.me/...` y mensaje precargado personalizado para avisar al cliente que su encargo ya está disponible para retirar.
   - **Incorporación al Catálogo:** Botón de 1 clic para crear el producto en el catálogo (`CatalogProduct`) con el precio y categoría del encargo.
   - **Venta / Presupuesto Directo:** Botón de 1 clic para abrir el formulario de venta o presupuesto precompletado con los datos del cliente y el producto.
   - El encargo finaliza en estado `entregado`.

### Alternative Flows

- **AF-01 (Cliente Existente vs Prospecto):** Si se selecciona un cliente agendado, se toman sus datos de contacto automáticamente sin duplicar el cliente en la base. Si es un prospecto nuevo, se le puede dar de alta formalmente en la base de clientes con un clic.
- **AF-02 (Cancelación de Encargo):** El cliente desiste del encargo $\rightarrow$ Se marca como `cancelado` manteniendo historial o se elimina.
- **AF-03 (Encargo sin Seña):** La seña es opcional (default 0); el sistema muestra claramente si existe saldo pendiente a cobrar.

## Business Rules

- **BR-001:** Todo encargo debe contener obligatoriamente: Nombre del cliente, teléfono de contacto y nombre del producto/repuesto.
- **BR-002:** La categoría es estrictamente `'repuesto' | 'producto'`, permitiendo clasificar y filtrar repuestos de taller/servicio técnico versus productos comerciales de reventa.
- **BR-003:** Los estados válidos son: `'pendiente_compra'`, `'pedido_proveedor'`, `'recibido'`, `'entregado'`, `'cancelado'`.
- **BR-004:** La persistencia se realiza en `localStorage` bajo la clave `app_encargos_v1`, integrándose con la estructura de estado general y backups del sistema.
- **BR-005:** Al incorporar un producto al catálogo, se valida que no exista un producto con el mismo nombre; si no existe, se inserta en `CatalogProduct` con fecha de alta y precio correspondiente.
- **BR-006:** Toda la interfaz debe respetar la guía visual de SalesHub, con Tailwind CSS completo para tema claro y tema oscuro (`dark:`).
- **BR-007:** El acceso en el Header debe incluir un badge con el conteo de encargos pendientes de compra para alerta visual del operador.

## Acceptance Criteria

- **AC-001:** GIVEN el Header principal WHEN existan encargos pendientes THEN se visualiza el botón "Encargos & Compras" con el badge numérico de pendientes.
- **AC-002:** GIVEN el modal de Nuevo Encargo WHEN se completan los datos en 1 solo paso y se guarda THEN se registra el encargo con estado `pendiente_compra` y se refleja en el tablero.
- **AC-003:** GIVEN el Tablero de Encargos WHEN se pulsa "Generar Lista de Compras" THEN se presenta la lista consolidada agrupando cantidades por ítem para el proveedor, con opción de copiar al portapapeles y marcar como pedidos.
- **AC-004:** GIVEN un encargo en estado `recibido` WHEN se pulsa el botón de WhatsApp THEN se abre el chat directo con mensaje de notificación personalizado.
- **AC-005:** GIVEN un encargo WHEN se pulsa "Incorporar a Catálogo" THEN el ítem se agrega al catálogo de productos de la tienda.
- **AC-006:** GIVEN la suite de validación WHEN se ejecutan `npm run lint` y `npm test` THEN no existen errores de TypeScript ni fallos de pruebas.

## Entities Affected

- `src/types.ts`: Definición de `EncargoItem`, `EncargoEstado`, `EncargoTipo`.
- `src/services/encargosService.ts`: Lógica de persistencia, agrupación para compras, consolidación y métricas.
- `src/components/encargos/EncargosModal.tsx`: Tablero general de encargos, filtros, métricas y vista de lista de compras.
- `src/components/encargos/EncargoFormModal.tsx`: Formulario ágil de 1 paso para nuevo encargo / edición.
- `src/components/Header.tsx`: Botón de acceso rápido con badge de pendientes.
- `src/App.tsx`: Integración del modal con `React.lazy` y paso de props (`catalog`, `customers`, `onUpdateCatalog`, `onNewSale`).
- `src/__tests__/encargosService.test.ts`: Suite de pruebas unitarias cubriendo CRUD, agrupación de compras y métricas.

## Ambiguity Log

- [x] ¿Dónde se almacenan los encargos?  
      _Decisión:_ En `localStorage` bajo `app_encargos_v1` con repositorio desacoplado para soportar exportación en backup.
- [x] ¿El botón de compra agrupa productos idénticos?  
      _Decisión:_ Sí, agrupa por nombre normalizado sumando cantidades para facilitar el pedido al distribuidor.

## Completion Map

# generated: 2026-10-15T17:15:00Z

# Tarea 1: Modelado de tipos e interfaces en src/types.ts|BR-001,BR-002,BR-003|coder-agent|✅

# Tarea 2: Servicio desacoplado encargosService.ts con agrupación de compras y persistencia|BR-004,BR-005|coder-agent|✅

# Tarea 3: Componentes de UI: EncargoFormModal.tsx y EncargosModal.tsx (Tablero y Lista de Compras)|BR-006,AC-002,AC-003,AC-004,AC-005|coder-agent|✅

# Tarea 4: Integración en Header.tsx y App.tsx con carga diferida (lazy)|AC-001,BR-007|coder-agent|✅

# Tarea 5: Suite de pruebas unitarias src/**tests**/encargosService.test.ts|AC-006|tester-agent|✅

# Tarea 6: Verificación completa de calidad (lint, tests, circular, build)|AC-006|reviewer-agent|✅
