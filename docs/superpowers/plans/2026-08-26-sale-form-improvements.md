# Plan de Implementación: Mejoras Visuales y Funcionales en Registro de Ventas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement UI improvements and form rules for sales channels, payment methods, invoice numbering formats, product line discounts, and client dropdown selection in the Sales Hub application.

**Architecture:** 
- Extend `SaleProductItem` to support a line-level percentage discount.
- Create dynamic badge rendering utilities in the spreadsheet grid for both sales channels and payment methods.
- Update form fields in the sales modal to conditionally disable the invoice number input, auto-format POS-specific invoice patterns, recalculate item subtotals using discounts, and improve customer dropdown selection.

**Tech Stack:** React (TypeScript), Tailwind CSS, Lucide React icons.

## Global Constraints
- Do not introduce external state management libraries (use React hooks).
- Ensure all styled elements support dark mode using `dark:` Tailwind classes.
- Follow existing patterns in the codebase for form validation and display formats.
- Retain existing code structure and imports unless explicitly instructed.

---

### Task 1: Actualizaciones de Modelos y Badges de Colores en Planilla

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/SpreadsheetGrid.tsx`

**Interfaces:**
- Consumes: `Sale` and `SaleProductItem` interface definitions.
- Produces: `descuento` field on `SaleProductItem`, functions `getChannelBadge` and `getPaymentMethodBadge` in `SpreadsheetGrid.tsx`.

- [ ] **Step 1: Extender la interfaz SaleProductItem**
  Add `descuento?: number;` to the `SaleProductItem` interface in `src/types.ts`:
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

- [ ] **Step 2: Importar nuevos íconos en SpreadsheetGrid.tsx**
  Add `MessageSquare`, `Instagram`, `Phone`, and `FileText` to the imports from `'lucide-react'` in `src/components/SpreadsheetGrid.tsx`.

- [ ] **Step 3: Actualizar getChannelBadge en SpreadsheetGrid.tsx**
  Rewrite `getChannelBadge` to add green badges for WhatsApp, pink for Instagram, blue for phone sales, and dynamic hash-based fallback colors:
  ```typescript
  const getChannelBadge = (canal: SaleChannel) => {
    const canalClean = canal.trim();
    const canalLower = canalClean.toLowerCase();
    
    let colorClasses = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    let icon = null;
    
    if (canalLower === 'local') {
      colorClasses = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      icon = <Store className="w-3 h-3 text-slate-500 dark:text-slate-400" />;
    } else if (canalLower === 'mercadolibre') {
      colorClasses = "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80";
      icon = <ShoppingBag className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
    } else if (canalLower === 'woocommerce' || canalLower === 'web' || canalLower === 'woo / web') {
      colorClasses = "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80";
      icon = <ExternalLink className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
    } else if (canalLower === 'whatsapp') {
      colorClasses = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      icon = <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
    } else if (canalLower === 'instagram') {
      colorClasses = "bg-pink-50 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800";
      icon = <Instagram className="w-3 h-3 text-pink-600 dark:text-pink-400" />;
    } else if (canalLower === 'venta telefónica' || canalLower === 'venta telefonica' || canalLower === 'telefono') {
      colorClasses = "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      icon = <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
    } else {
      const colors = [
        "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
        "bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        "bg-lime-50 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 border-lime-200 dark:border-lime-800",
        "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
        "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
        "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800",
        "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        "bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
        "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
      ];
      let hash = 0;
      for (let i = 0; i < canalLower.length; i++) {
        hash = canalLower.charCodeAt(i) + ((hash << 5) - hash);
      }
      colorClasses = colors[Math.abs(hash) % colors.length];
    }
    
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium border ${colorClasses}`}>
        {icon}
        {canalClean}
      </span>
    );
  };
  ```

- [ ] **Step 4: Crear getPaymentMethodBadge en SpreadsheetGrid.tsx**
  Implement `getPaymentMethodBadge` above `getShippingBadge` in `src/components/SpreadsheetGrid.tsx`:
  ```typescript
  const getPaymentMethodBadge = (metodo: PaymentMethod) => {
    const metodoClean = metodo.trim();
    const metodoLower = metodoClean.toLowerCase();
    
    let colorClasses = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    let icon = <CreditCard className="w-3 h-3 text-slate-400" />;
    
    if (metodoLower === 'efectivo') {
      colorClasses = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80";
      icon = <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
    } else if (metodoLower === 'transferencia' || metodoLower === 'banco') {
      colorClasses = "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/80";
      icon = <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
    } else if (metodoLower === 'tarjeta de débito' || metodoLower === 'debito' || metodoLower === 'débito' || metodoLower === 'tarjeta debito') {
      colorClasses = "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80";
      icon = <CreditCard className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />;
    } else if (metodoLower === 'tarjeta de crédito' || metodoLower === 'credito' || metodoLower === 'crédito' || metodoLower === 'tarjeta credito') {
      colorClasses = "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80";
      icon = <CreditCard className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />;
    } else if (metodoLower === 'mercadopago' || metodoLower === 'mp') {
      colorClasses = "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/80";
      icon = <ExternalLink className="w-3 h-3 text-sky-600 dark:text-sky-400" />;
    } else if (metodoLower === 'efectivo contra entrega' || metodoLower === 'contra entrega') {
      colorClasses = "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/80";
      icon = <DollarSign className="w-3 h-3 text-teal-600 dark:text-teal-400" />;
    } else if (metodoLower === 'cheque / ejeq' || metodoLower === 'cheque' || metodoLower === 'echeq') {
      colorClasses = "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80";
      icon = <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
    } else {
      const colors = [
        "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
        "bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        "bg-lime-50 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 border-lime-200 dark:border-lime-800",
        "bg-violet-50 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
        "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
      ];
      let hash = 0;
      for (let i = 0; i < metodoLower.length; i++) {
        hash = metodoLower.charCodeAt(i) + ((hash << 5) - hash);
      }
      colorClasses = colors[Math.abs(hash) % colors.length];
    }
    
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium border ${colorClasses}`}>
        {icon}
        {metodoClean}
      </span>
    );
  };
  ```

- [ ] **Step 5: Usar getPaymentMethodBadge en la celda correspondiente**
  Modify the cell render for `metodoPago` (around line 830) in `src/components/SpreadsheetGrid.tsx`:
  ```typescript
                      {/* Método Pago */}
                      {visibleColumns.metodoPago && (
                        <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {getPaymentMethodBadge(sale.metodoPago)}
                        </td>
                      )}
  ```

- [ ] **Step 6: Verificar y commitear**
  Run: `npx tsc --noEmit` to verify type safety.
  Commit:
  ```bash
  git add src/types.ts src/components/SpreadsheetGrid.tsx
  git commit -m "feat: agregar badges de colores para canales y metodos de pago"
  ```

---

### Task 2: Implementación de Descuento por Línea y Layout Reducido en Formulario

**Files:**
- Modify: `src/components/SaleFormModal.tsx`

**Interfaces:**
- Consumes: `SaleProductItem` with `descuento`.
- Produces: Updated subtotal calculation and grid columns inside `SaleFormModal`.

- [ ] **Step 1: Mapear descuento en la inicialización de productos**
  Modify the state initialization for `productos` in `src/components/SaleFormModal.tsx` (around line 46):
  ```typescript
    const [productos, setProductos] = useState<SaleProductItem[]>(
      existingSale && existingSale.productos.length > 0
        ? existingSale.productos.map(p => ({ ...p, descuento: p.descuento ?? 0 }))
        : [{ id: '1', nombre: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0 }]
    );
  ```

- [ ] **Step 2: Modificar handleProductChange para calcular descuento**
  Update the calculation logic inside `handleProductChange` (around line 76):
  ```typescript
    const handleProductChange = (index: number, field: keyof SaleProductItem, value: any) => {
      const updated = [...productos];
      const current = { ...updated[index], [field]: value };

      if (field === 'cantidad' || field === 'precioUnitario' || field === 'descuento') {
        const qty = field === 'cantidad' ? parseFloat(value) || 0 : current.cantidad;
        const price = field === 'precioUnitario' ? parseFloat(value) || 0 : current.precioUnitario;
        const desc = field === 'descuento' ? parseFloat(value) || 0 : (current.descuento || 0);
        current.subtotal = qty * price * (1 - desc / 100);
      }

      updated[index] = current;
      setProductos(updated);
    };
  ```

- [ ] **Step 3: Modificar handleSelectCatalogProduct para heredar descuento**
  Update `handleSelectCatalogProduct` (around line 90):
  ```typescript
    const handleSelectCatalogProduct = (index: number, catProd: CatalogProduct) => {
      const updated = [...productos];
      const desc = updated[index].descuento || 0;
      updated[index] = {
        ...updated[index],
        id: catProd.id,
        nombre: catProd.nombre,
        sku: catProd.sku,
        precioUnitario: catProd.precio,
        subtotal: updated[index].cantidad * catProd.precio * (1 - desc / 100),
        imagenUrl: catProd.imagenUrl
      };
      setProductos(updated);
    };
  ```

- [ ] **Step 4: Actualizar handleAddProductLine**
  Initialize `descuento` as `0` in `handleAddProductLine` (around line 104):
  ```typescript
    const handleAddProductLine = () => {
      setProductos([
        ...productos,
        { id: String(Date.now()), nombre: '', cantidad: 1, precioUnitario: 0, descuento: 0, subtotal: 0 }
      ]);
    };
  ```

- [ ] **Step 5: Ajustar el Grid y agregar el campo Descuento en el JSX**
  Replace the rendering block for products rows (around lines 343 to 403) with the new layout column spans and the new `descuento` input:
  ```typescript
                {productos.map((prod, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                    
                    {/* Búsqueda Sensitiva de Producto con Imagen */}
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Producto (Búsqueda sensible con imagen)</label>
                      <ProductSearchPicker
                        catalog={catalog}
                        value={prod.nombre}
                        onChangeText={(text) => handleProductChange(idx, 'nombre', text)}
                        onSelectProduct={(catProd) => handleSelectCatalogProduct(idx, catProd)}
                        selectedImageUrl={prod.imagenUrl}
                        placeholder="Buscar producto por nombre, SKU o categoría..."
                      />
                    </div>

                    {/* Cantidad (reducido al 50%) */}
                    <div className="col-span-3 sm:col-span-1">
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-center">Cant.</label>
                      <input
                        type="number"
                        min="1"
                        value={prod.cantidad}
                        onChange={(e) => handleProductChange(idx, 'cantidad', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-1 py-1 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    {/* Precio Unitario */}
                    <div className="col-span-3 sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-right">Precio Unit. ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={prod.precioUnitario}
                        onChange={(e) => handleProductChange(idx, 'precioUnitario', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-right focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    {/* Descuento (%) */}
                    <div className="col-span-3 sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-center">Desc. (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={prod.descuento ?? 0}
                        onChange={(e) => handleProductChange(idx, 'descuento', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="col-span-3 sm:col-span-2 flex items-center justify-between gap-1 pl-1">
                      <div>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">Subtotal</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(prod.subtotal)}
                        </span>
                      </div>

                      {productos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProductLine(idx)}
                          className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer"
                          title="Eliminar fila de producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                ))}
  ```

- [ ] **Step 6: Verificar y commitear**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/components/SaleFormModal.tsx
  git commit -m "feat: agregar campo de descuento por linea y ajustar layout"
  ```

---

### Task 3: Facturación Condicional y Autocompletado de Clientes en Formulario

**Files:**
- Modify: `src/components/SaleFormModal.tsx`

**Interfaces:**
- Consumes: None.
- Produces: State behavior for billing disable rules, default invoice patterns, customer select synchronization, and focus/click-outside UI handlers.

- [ ] **Step 1: Agregar helper para generar números de factura**
  Add the `generateDefaultInvoiceNumber` helper function inside the `SaleFormModal` component definition (e.g. above `handleSubmit`):
  ```typescript
  const generateDefaultInvoiceNumber = (type: InvoiceType) => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const rand3 = Math.floor(100 + Math.random() * 900);
    switch (type) {
      case 'Factura A':
        return `A-0003-00000${rand3}`;
      case 'Factura B':
        return `B-0003-0000${rand}`;
      case 'Factura C':
        return `C-0003-0000${rand}`;
      case 'Ticket':
        return `T-0003-0000${rand}`;
      case 'Sin Factura':
      default:
        return '';
    }
  };
  ```

- [ ] **Step 2: Cambiar la inicialización de numeroFactura**
  Update `numeroFactura` default state (around line 53):
  ```typescript
    const [numeroFactura, setNumeroFactura] = useState(() => {
      if (existingSale) return existingSale.numeroFactura;
      return `B-0003-0000${Math.floor(1000 + Math.random() * 9000)}`;
    });
  ```

- [ ] **Step 3: Agregar lógica condicional en el cambio de Tipo de Factura**
  Update the `tipoFactura` select element `onChange` handler (around line 430):
  ```typescript
                <select
                  value={tipoFactura}
                  onChange={(e) => {
                    const val = e.target.value as InvoiceType;
                    setTipoFactura(val);
                    if (val === 'Sin Factura') {
                      setNumeroFactura('');
                    } else {
                      setNumeroFactura(generateDefaultInvoiceNumber(val));
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none shadow-xs"
                >
  ```

- [ ] **Step 4: Deshabilitar el input de Nº Factura si es "Sin Factura"**
  Update the `numeroFactura` input rendering block (around line 445):
  ```typescript
                <input
                  type="text"
                  placeholder={tipoFactura === 'Sin Factura' ? 'Sin comprobante' : 'B-0003-00001234'}
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  disabled={tipoFactura === 'Sin Factura'}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono shadow-xs disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                />
  ```

- [ ] **Step 5: Modificar handleSelectCustomer para sincronizar el buscador**
  Update `handleSelectCustomer` (around line 66) to sync the autocomplete search text:
  ```typescript
    const handleSelectCustomer = (c: Customer) => {
      setClienteId(c.clienteId);
      setClienteNombre(c.nombre);
      setClienteApellido(c.apellido);
      setClienteDniCuit(c.dniCuit || '');
      setClienteTelefono(c.telefono || '');
      setCustomerSearch(`${c.nombre} ${c.apellido}`);
      setShowCustomerDropdown(false);
    };
  ```

- [ ] **Step 6: Actualizar el dropdown de clientes para mostrarse siempre al enfocar**
  Update the outer container of the customer search to add the `customer-search-container` class:
  ```typescript
              <div className="relative customer-search-container">
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Buscar Cliente Existente</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o DNI..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
                </div>

                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-20 max-h-40 overflow-y-auto">
                    {customers
                      .filter((c) => {
                        if (customerSearch.trim() === '') return true;
                        return `${c.nombre} ${c.apellido} ${c.clienteId} ${c.dniCuit}`
                          .toLowerCase()
                          .includes(customerSearch.toLowerCase());
                      })
                      .slice(0, 20)
                      .map((c) => (
                        <div
                          key={c.clienteId}
                          onClick={() => handleSelectCustomer(c)}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{c.nombre} {c.apellido}</span>
                            <span className="ml-2 font-mono text-blue-600 dark:text-blue-400 text-[10px]">{c.clienteId}</span>
                          </div>
                          <span className="text-slate-400 text-[10px]">{c.dniCuit}</span>
                        </div>
                      ))}
                    {customers.filter((c) => {
                      if (customerSearch.trim() === '') return true;
                      return `${c.nombre} ${c.apellido} ${c.clienteId} ${c.dniCuit}`
                        .toLowerCase()
                        .includes(customerSearch.toLowerCase());
                    }).length === 0 && (
                      <div className="p-2 text-center text-xs text-slate-500 dark:text-slate-400">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
              </div>
  ```

- [ ] **Step 7: Agregar click-outside listener en SaleFormModal.tsx**
  Add a `useEffect` inside `SaleFormModal` to capture outside clicks and close the customer search dropdown:
  ```typescript
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);
  ```

- [ ] **Step 8: Verificar y commitear**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/components/SaleFormModal.tsx
  git commit -m "feat: condicional de facturacion y buscador de clientes con autofill de dni y tel"
  ```
