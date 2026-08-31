# Plan de Implementación: Personalización de Mensaje de WhatsApp y Datos del Cliente

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the WhatsApp sharing button to send a detailed location template featuring client name, phone number, default or alternate address, list of products, and the Google Maps coordinate link.

**Architecture:**
- Extend the `SaleLocationMapProps` interface to accept `clientName`, `clientPhone`, and `productsText`.
- Generate custom formatted WhatsApp template text inside `SaleLocationMap.tsx`.
- Formulate products lists and propagate client details inside `SaleFormModal.tsx`.

**Tech Stack:** React, TypeScript.

---

### Task 1: Modificar SaleLocationMap para recibir datos adicionales y formatear WhatsApp

**Files:**
- Modify: `src/components/SaleLocationMap.tsx`

- [ ] **Step 1: Extender la interfaz SaleLocationMapProps**
  Include `clientName`, `clientPhone`, and `productsText` as optional parameters:
  ```typescript
  interface SaleLocationMapProps {
    address: string;
    city: string;
    province: string;
    coordinates?: { lat: number; lng: number };
    onChangeCoordinates: (coords: { lat: number; lng: number }) => void;
    clientName?: string;
    clientPhone?: string;
    productsText?: string;
  }
  ```

- [ ] **Step 2: Recibir props en la declaración del componente**
  Destructure the new properties:
  ```typescript
  export const SaleLocationMap: React.FC<SaleLocationMapProps> = ({
    address,
    city,
    province,
    coordinates,
    onChangeCoordinates,
    clientName = '',
    clientPhone = '',
    productsText = '',
  }) => {
  ```

- [ ] **Step 3: Actualizar la generación del texto de compartir por WhatsApp**
  Construct a detailed text block for the sharing button:
  ```typescript
    const shareText = `📍 Ubicación de Entrega
👤 Cliente: ${clientName || 'Sin Nombre'}
🏠 Domicilio: ${address.trim()}, ${city.trim()}, ${province.trim()}
📞 Teléfono: ${clientPhone || 'Sin Teléfono'}
📦 Productos: ${productsText || 'Ninguno'}
🗺️ Mapa: https://www.google.com/maps?q=${currentLat},${currentLng}`;
  ```
  Pass `shareText` wrapped inside `encodeURIComponent` to the `href` attribute of the sharing button link:
  ```typescript
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-center">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="font-semibold">Compartir Ubicación por WhatsApp</span>
          </a>
        </div>
  ```

- [ ] **Step 4: Verificar y commit**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/components/SaleLocationMap.tsx
  git commit -m "feat: actualizar SaleLocationMap con nuevos props y formato detallado de WhatsApp"
  ```

---

### Task 2: Propagar parámetros desde SaleFormModal

**Files:**
- Modify: `src/components/SaleFormModal.tsx`

- [ ] **Step 1: Formatear la cadena de productos e integrarla**
  Inside `SaleFormModal.tsx`, inside the right panel map block rendering (around line 720), generate `productsText` and pass the client name, phone and product list details to `SaleLocationMap`:
  ```typescript
            {showMap && (
              <div className="w-[35%] min-w-[320px] flex flex-col">
                <SaleLocationMap
                  address={envioDomicilioDiferente ? entregaDireccion : clienteDireccion}
                  city={envioDomicilioDiferente ? entregaLocalidad : clienteLocalidad}
                  province={envioDomicilioDiferente ? entregaProvincia : clienteProvincia}
                  coordinates={entregaCoordenadas}
                  onChangeCoordinates={setEntregaCoordenadas}
                  clientName={`${clienteNombre} ${clienteApellido}`.trim()}
                  clientPhone={clienteTelefono}
                  productsText={productos
                    .filter(p => p.nombre.trim() !== '')
                    .map(p => `${p.nombre} (x${p.cantidad})`)
                    .join(', ')}
                />
              </div>
            )}
  ```

- [ ] **Step 2: Verificar la compilación completa de producción**
  Run: `npx tsc --noEmit` and `npm run build` and `npm test`
  Expected: Bundle compiles successfully with 0 errors and all tests pass.

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/SaleFormModal.tsx
  git commit -m "feat: propagar datos de cliente y productos desde SaleFormModal hacia mapa"
  ```
