# Especificación de Diseño: Mejoras Visuales y Funcionales en Registro de Ventas

**Fecha**: 2026-08-26  
**Estatus**: Aprobado por el usuario  

---

## 1. Cambios en Modelos y Datos (`src/types.ts`)
* Agregar la propiedad opcional `descuento` a la interfaz `SaleProductItem`:
  ```typescript
  export interface SaleProductItem {
    id: string;
    nombre: string;
    sku?: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    imagenUrl?: string;
    descuento?: number; // Porcentaje de descuento (0 a 100)
  }
  ```

---

## 2. Cambios Visuales en la Planilla (`src/components/SpreadsheetGrid.tsx`)

### 2.1 Canal de Venta (`getChannelBadge`)
Asignación de colores y tags con íconos para cada canal registrado:
* **Local**: `bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700` | Ícono: `Store`
* **MercadoLibre**: `bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80` | Ícono: `ShoppingBag`
* **WooCommerce / Web / Woo / Web**: `bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80` | Ícono: `ExternalLink`
* **WhatsApp**: `bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800` | Ícono: `MessageSquare`
* **Instagram**: `bg-pink-50 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800` | Ícono: `Instagram`
* **Venta Telefónica / Teléfono**: `bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800` | Ícono: `Phone`
* **Cualquier otro personalizado**: Seleccionado dinámicamente mediante una función hash para consistencia de color.

### 2.2 Método de Pago (`getPaymentMethodBadge`)
Asignación de colores y tags con íconos para cada método de pago registrado:
* **Efectivo / Efectivo contra entrega / Contra entrega**: `bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80` | Ícono: `DollarSign`
* **Transferencia / Banco**: `bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/80` | Ícono: `Building2`
* **Tarjeta de Débito / Débito**: `bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80` | Ícono: `CreditCard`
* **Tarjeta de Crédito / Crédito**: `bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80` | Ícono: `CreditCard`
* **MercadoPago**: `bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/80` | Ícono: `ExternalLink`
* **Cheque / eCheq**: `bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80` | Ícono: `FileText`
* **Cualquier otro personalizado**: Seleccionado dinámicamente mediante una función hash para consistencia de color.

---

## 3. Cambios en Formulario de Ventas (`src/components/SaleFormModal.tsx`)

### 3.1 Comportamiento de Tipo y Número de Factura
* **Inicialización**: Si es venta nueva, por defecto será `Factura B` con el formato `B-0003-0000xxxx` (donde `xxxx` son 4 dígitos aleatorios).
* **Cambio en el Selector**:
  * Si se cambia a `Sin Factura`, se borra el valor del número de factura (`""`) y se deshabilita el campo de texto (con estilos deshabilitados: color de fondo gris suave, cursor no permitido y placeholder `"Sin comprobante"`).
  * Si se cambia a `Factura A`, se autocompleta el número de factura con el formato `A-0003-00000xxx` (5 ceros, 3 dígitos aleatorios).
  * Si se cambia a `Factura B`, `Factura C` o `Ticket`, se autocompleta el número de factura con el formato `B-0003-0000xxxx` (o el prefijo correspondiente `C-` o `T-` con 4 ceros y 4 dígitos aleatorios).

### 3.2 Descuento y Layout de Fila de Producto
* **Agregar entrada de Descuento**: Añadir un input numérico `descuento` al lado de `precioUnitario`, con valor inicial `0` y rango `0` a `100`.
* **Cálculo de Subtotal**: Modificar la lógica para calcular `subtotal = cantidad * precioUnitario * (1 - descuento / 100)`.
* **Ajuste de Columnas (Tailwind)**:
  * Producto: `col-span-12 sm:col-span-5`
  * Cantidad: `col-span-3 sm:col-span-1` (ancho reducido al 50%, centrado)
  * Precio Unitario: `col-span-3 sm:col-span-2`
  * Descuento: `col-span-3 sm:col-span-2`
  * Subtotal y Borrar: `col-span-3 sm:col-span-2`

### 3.3 Autocompletar de Clientes Mejorado
* **Mostrar dropdown al enfocar**: El dropdown de clientes aparecerá inmediatamente al enfocar el buscador (aún si está vacío), mostrando los primeros 20 clientes registrados.
* **Autocompletar Datos**: Al seleccionar un cliente de la lista, se completarán:
  * ID Cliente (`clienteId`)
  * Nombre (`clienteNombre`)
  * Apellido (`clienteApellido`)
  * CUIT / DNI (`clienteDniCuit`)
  * Teléfono (`clienteTelefono`)
  * Además, el campo del buscador `customerSearch` se sincronizará con el nombre completo del cliente seleccionado (`${c.nombre} ${c.apellido}`).
* **Cerrar al hacer click afuera**: Se agregará un `useEffect` que monitoree el click en el documento para cerrar el dropdown si el usuario hace click fuera del contenedor de búsqueda.

---

## 4. Verificación
* Ejecutar la compilación local (`npm run build`) para comprobar que todos los tipos y propiedades de TypeScript sean consistentes.
* Validar que la creación de ventas manuales con descuentos y selección de comprobantes se registre correctamente en la base de datos de local.
