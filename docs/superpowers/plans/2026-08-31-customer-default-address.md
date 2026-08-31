# Plan de Implementación: Domicilio por Defecto del Cliente y Localización

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow creating/managing default customer addresses (Dirección, Localidad, Provincia) in both the customer directory and sales forms, and use these default fields as the primary geocoding search targets in the interactive map.

**Architecture:**
- Extend the `Customer` and `Sale` interfaces in `src/types.ts` to include structure fields for `direccion`, `localidad`, and `provincia`.
- Update WooCommerce customer transform parsing to extract structured `localidad` and `provincia` values.
- Add address inputs to the Customer Creation Drawer in `CustomerDirectoryModal.tsx`.
- Add address inputs to the Customer Information section in `SaleFormModal.tsx`.
- Configure `SaleLocationMap` address parameter inputs to select client default address properties when alternate shipping toggles are inactive.

**Tech Stack:** React, TypeScript, Leaflet.

---

### Task 1: Extender interfaces y adaptadores de WooCommerce

**Files:**
- Modify: `src/types.ts`
- Modify: `src/utils/wooCommerceApi.ts`
- Modify: `src/__tests__/wooCommerceApi.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Agregar campos a las interfaces en types.ts**
  Add `localidad?: string;` and `provincia?: string;` to `Customer` interface.
  Add `clienteDireccion?: string;`, `clienteLocalidad?: string;`, and `clienteProvincia?: string;` to `Sale` interface:
  ```typescript
  export interface Customer {
    // ...
    direccion?: string;
    localidad?: string;
    provincia?: string;
    // ...
  }

  export interface Sale {
    // ...
    clienteDniCuit?: string;
    clienteDireccion?: string;
    clienteLocalidad?: string;
    clienteProvincia?: string;
    // ...
  }
  ```

- [ ] **Step 2: Actualizar transformWooCustomer en wooCommerceApi.ts**
  Extract city and state values individually from WooCommerce API response:
  ```typescript
  export const transformWooCustomer = (item: WooCustomerDTO): Customer => {
    const billing = item.billing || {};
    const nombre = billing.first_name || item.first_name || 'Cliente';
    const apellido = billing.last_name || item.last_name || 'WooCommerce';
    const razonSocial = billing.company || `${nombre} ${apellido}`.trim();
    const address = [billing.address_1, billing.city, billing.state].filter(Boolean).join(', ');

    // Extract DNI/CUIT ...
    // Extract Phone ...

    return {
      id: `woo-cust-${item.id}`,
      clienteId: `WC-${item.id}`,
      nombre: nombre,
      apellido: apellido,
      razonSocialNombre: razonSocial,
      dniCuit: dniCuit,
      telefono: telefono,
      email: item.email || billing.email || `cliente${item.id}@tienda.com`,
      direccion: billing.address_1 || '',
      localidad: billing.city || '',
      provincia: billing.state || '',
      canalHabitual: 'WooCommerce',
      origen: 'WooCommerce'
    };
  };
  ```

- [ ] **Step 3: Actualizar datos simulados (mock data) en App.tsx**
  Add `localidad` and `provincia` properties to default customers in `src/App.tsx`.

- [ ] **Step 4: Actualizar pruebas unitarias en wooCommerceApi.test.ts**
  Update the expectations in tests to match the new `direccion`, `localidad`, and `provincia` properties.

- [ ] **Step 5: Verificar y commit**
  Run: `npx tsc --noEmit` and `npm test`
  Commit:
  ```bash
  git add src/types.ts src/utils/wooCommerceApi.ts src/__tests__/wooCommerceApi.test.ts src/App.tsx
  git commit -m "feat: extender modelos para soportar direccion, localidad y provincia del cliente"
  ```

---

### Task 2: Formulario de Creación de Clientes con Domicilio por Defecto

**Files:**
- Modify: `src/components/CustomerDirectoryModal.tsx`

- [ ] **Step 1: Agregar variables de estado en CustomerDirectoryModal**
  Inside `CustomerDirectoryModal` (around line 28):
  ```typescript
  const [newDireccion, setNewDireccion] = useState('');
  const [newLocalidad, setNewLocalidad] = useState('');
  const [newProvincia, setNewProvincia] = useState('Buenos Aires');
  ```

- [ ] **Step 2: Asignar campos en handleCreateCustomer**
  Include address properties in the created customer object, and reset state variables:
  ```typescript
      const created: Customer = {
        // ...
        direccion: newDireccion,
        localidad: newLocalidad,
        provincia: newProvincia,
        // ...
      };
  ```

- [ ] **Step 3: Renderizar los nuevos inputs en el formulario**
  Add input fields inside the creation form grid layout:
  ```typescript
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Dirección de Entrega por Defecto</label>
                    <input
                      type="text"
                      placeholder="Calle y número"
                      value={newDireccion}
                      onChange={(e) => setNewDireccion(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Localidad</label>
                    <input
                      type="text"
                      placeholder="Ej: Rosario"
                      value={newLocalidad}
                      onChange={(e) => setNewLocalidad(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-0.5">Provincia</label>
                    <input
                      type="text"
                      placeholder="Ej: Santa Fe"
                      value={newProvincia}
                      onChange={(e) => setNewProvincia(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
  ```

- [ ] **Step 4: Verificar y commit**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/components/CustomerDirectoryModal.tsx
  git commit -m "feat: agregar inputs de domicilio por defecto en creacion de clientes"
  ```

---

### Task 3: Formulario de Ventas con Domicilio del Cliente y Mapa

**Files:**
- Modify: `src/components/SaleFormModal.tsx`

- [ ] **Step 1: Agregar variables de estado en SaleFormModal**
  Define and initialize state hooks (around line 60):
  ```typescript
  const [clienteDireccion, setClienteDireccion] = useState(existingSale?.clienteDireccion || '');
  const [clienteLocalidad, setClienteLocalidad] = useState(existingSale?.clienteLocalidad || '');
  const [clienteProvincia, setClienteProvincia] = useState(existingSale?.clienteProvincia || 'Buenos Aires');
  ```

- [ ] **Step 2: Guardar los nuevos campos en handleSubmit**
  Add the new fields to `candidateSale` in `handleSubmit` (around line 185):
  ```typescript
      const candidateSale: Sale = {
        // ...
        clienteDireccion,
        clienteLocalidad,
        clienteProvincia,
        // ...
      };
  ```

- [ ] **Step 3: Autocompletar la dirección del cliente en handleSelectCustomer**
  Update `handleSelectCustomer` (around line 80):
  ```typescript
    const handleSelectCustomer = (c: Customer) => {
      setClienteId(c.clienteId);
      setClienteNombre(c.nombre);
      setClienteApellido(c.apellido);
      setClienteDniCuit(c.dniCuit || '');
      setClienteTelefono(c.telefono || '');
      setClienteDireccion(c.direccion || '');
      setClienteLocalidad(c.localidad || '');
      setClienteProvincia(c.provincia || 'Buenos Aires');
      setCustomerSearch(`${c.nombre} ${c.apellido}`);
      setShowCustomerDropdown(false);
    };
  ```

- [ ] **Step 4: Renderizar inputs de Domicilio del Cliente en el modal**
  Add address inputs to the general customer inputs section:
  ```typescript
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Domicilio del Cliente</label>
                <input
                  type="text"
                  placeholder="Calle y altura"
                  value={clienteDireccion}
                  onChange={(e) => setClienteDireccion(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Localidad Cliente</label>
                <input
                  type="text"
                  placeholder="Localidad"
                  value={clienteLocalidad}
                  onChange={(e) => setClienteLocalidad(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Provincia Cliente</label>
                <input
                  type="text"
                  placeholder="Provincia"
                  value={clienteProvincia}
                  onChange={(e) => setClienteProvincia(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>
            </div>
  ```

- [ ] **Step 5: Sincronizar direccion en SaleLocationMap**
  Update the component properties passed to `SaleLocationMap` (around line 680):
  ```typescript
              <SaleLocationMap
                address={envioDomicilioDiferente ? entregaDireccion : clienteDireccion}
                city={envioDomicilioDiferente ? entregaLocalidad : clienteLocalidad}
                province={envioDomicilioDiferente ? entregaProvincia : clienteProvincia}
                coordinates={entregaCoordenadas}
                onChangeCoordinates={setEntregaCoordenadas}
              />
  ```

- [ ] **Step 6: Verificar y commit**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/components/SaleFormModal.tsx
  git commit -m "feat: habilitar inputs de direccion por defecto del cliente y sincronizar con mapa"
  ```
