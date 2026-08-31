# Plan de Implementación: Pestaña de Configuración de Empresa / Firma y Logo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated "Empresa / Firma" configuration tab in `ConfigModal.tsx` allowing the user to customize company name, slogan, logo (with base64 file upload and display toggles), commercial address, phone, email, CUIT, IIBB, VAT condition, and default points of sale, and dynamically propagate these settings to `RemitoModal.tsx`, `BudgetModal.tsx`, and delivery templates.

**Architecture:**
- Extend `AppConfig` in `src/types.ts` with a `CompanyConfig` interface.
- Add default values in `src/data/initialData.ts`.
- Build the 'empresa' tab in `ConfigModal.tsx` with logo image uploader (converted to data URL) and input fields.
- Bind `RemitoModal.tsx` and `BudgetModal.tsx` to read firm details dynamically from `config.empresa`.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide Icons, FileReader API.

---

### Task 1: Definir modelos y valores iniciales de Empresa

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/initialData.ts`

- [ ] **Step 1: Extender types.ts**
  Add `CompanyConfig` and extend `AppConfig`:
  ```typescript
  export interface CompanyConfig {
    nombre: string;
    subtitulo?: string;
    logoUrl?: string;
    mostrarLogo?: boolean;
    domicilio: string;
    telefono: string;
    email: string;
    cuit: string;
    iibb: string;
    condicionIva: string;
    inicioActividades?: string;
    puntoVentaVenta?: string;
    puntoVentaPresupuesto?: string;
  }
  ```
  In `AppConfig`, add `empresa?: CompanyConfig;`.

- [ ] **Step 2: Definir INITIAL_COMPANY_CONFIG en initialData.ts**
  Set default values matching DUAL S.R.L. and attach it to `INITIAL_CONFIG`.

- [ ] **Step 3: Verificar y commit**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/types.ts src/data/initialData.ts
  git commit -m "feat: extender modelos para configuracion dinamica de datos de empresa y logo"
  ```

---

### Task 2: Implementar la Pestaña "Empresa / Firma" en ConfigModal.tsx

**Files:**
- Modify: `src/components/ConfigModal.tsx`

- [ ] **Step 1: Extender los estados del modal**
  Add `activeTab` value `'empresa'` and state variables for all company properties (`nombreEmpresa`, `subtituloEmpresa`, `logoUrl`, `mostrarLogo`, `domicilioEmpresa`, `telefonoEmpresa`, `emailEmpresa`, `cuitEmpresa`, `iibbEmpresa`, `condicionIvaEmpresa`, `inicioActividadesEmpresa`, `pvVenta`, `pvPresupuesto`).

- [ ] **Step 2: Manejador de subida de imagen de logo (Base64)**
  Implement `handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>)` using `FileReader.readAsDataURL` with size limit validation (e.g. max 2MB) and clear logo button.

- [ ] **Step 3: Renderizar la pestaña en el modal**
  Add the tab button in the header bar and the full UI in the modal body (identidad visual, previsualizador de logo, datos fiscales, ubicación y puntos de venta).

- [ ] **Step 4: Guardar la configuración en onSaveConfig**
  Include `empresa` in the saved `AppConfig` payload.

- [ ] **Step 5: Verificar y commit**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/components/ConfigModal.tsx
  git commit -m "feat: agregar pestaña de configuracion de empresa y logo en ConfigModal"
  ```

---

### Task 3: Conectar RemitoModal y BudgetModal a la Configuración Dinámica

**Files:**
- Modify: `src/components/RemitoModal.tsx`
- Modify: `src/components/BudgetModal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Pasar config a RemitoModal en App.tsx**
  Update `<RemitoModal config={config} ... />`.

- [ ] **Step 2: Renderizado dinámico en RemitoModal.tsx**
  Replace static firm name, address, phone, email, CUIT, and IIBB with `config?.empresa` data (with fallback to default values), supporting logo rendering if `mostrarLogo` is enabled.

- [ ] **Step 3: Renderizado dinámico en BudgetModal.tsx**
  Replace static header values in the Budget printable view with `config?.empresa` properties.

- [ ] **Step 4: Verificar, compilar y commit**
  Run: `npx tsc --noEmit`, `npm test`, and `npm run build`.
  Commit:
  ```bash
  git add src/components/RemitoModal.tsx src/components/BudgetModal.tsx src/App.tsx
  git commit -m "feat: conectar remito y presupuesto a los datos dinamicos de la empresa"
  ```
