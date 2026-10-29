# CONTRACT: Cuenta Corriente por Cliente (extracto de deuda y pagos)
# ID: FEAT-PAY-003
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: STRICT
# Depende de: FEAT-PAY-001 (libro de pagos y saldo derivado)

## Intent

El libro de pagos (FEAT-PAY-001) sabe cuánto debe **una venta**. Falta la otra mitad del
requisito de cuenta corriente: cuánto debe **un cliente**, sumando todas sus ventas, y el
extracto de qué pagó y cuándo. Hoy esa pregunta se responde sumando a mano en la planilla.

## Use Case

**Actor:** Administrador / Operador con acceso a `ventas` o `clientes`
**Goal:** abrir la ficha de un cliente y ver de un vistazo su deuda total y el detalle.

### Main Flow

1. Desde el listado de cobros pendientes o desde el directorio de clientes se abre
   **"Cuenta corriente"** de un cliente.
2. El encabezado muestra: nombre, y tres totales —**facturado**, **cobrado** y **saldo**— más la
   cantidad de ventas con deuda y la **antigüedad de la deuda más vieja**.
3. El cuerpo lista, de la más vieja a la más nueva, cada venta con saldo: fecha, comprobante,
   total, cobrado, saldo, estado y los pagos recibidos (fecha, monto, medio).
4. El botón **Exportar extracto PDF** genera un A4 con el membrete de la empresa, los totales del
   cliente y el detalle de ventas y pagos.

### Alternative Flows

- **AF-01 (Cliente sin deuda):** se muestra el estado vacío "Sin saldo pendiente" y el PDF queda
  deshabilitado.
- **AF-02 (Cliente sin ventas):** estado vacío informativo; no se rompe el modal.
- **AF-03 (Desde el directorio):** el acceso aparece en la ficha del cliente si tiene saldo.
- **AF-04 (Solo lectura):** la vista es de consulta; no registra ni borra pagos desde acá (eso se
  hace en la venta, para no perder el vínculo con el comprobante).

## Business Rules

- **BR-PAY-016:** Los totales del cliente son **derivados**: suma de `montoTotal`, de
  `totalCobrado` y de `saldo` de todas sus ventas. Nunca se persiste un saldo por cliente.
- **BR-PAY-017:** El listado es **cross-mes**: incluye todas las ventas del cliente con saldo > 0,
  sin importar el mes ni el filtro global de la planilla.
- **BR-PAY-018:** La identidad del cliente se resuelve por `clienteId`; si una venta vieja no
  tiene `clienteId`, se agrupa por nombre normalizado (`normalizePersonName`) y se marca en el
  extracto como "sin identificar" para que se pueda corregir a mano.
- **BR-PAY-019:** El extracto **no incluye teléfono ni otros datos de contacto** (decisión del
  dueño: es un PDF que circula). Sólo identificación comercial y montos.
- **BR-PAY-020:** El PDF se genera con `jspdf` vectorial, con el mismo patrón que el listado de
  cobros pendientes (`BR-PAY-012`), paginado y con encabezado repetido.
- **BR-PAY-021:** El acceso respeta RBAC: requiere `ventas` o `clientes` con `read` o superior.

## Acceptance Criteria

- **AC-001:** GIVEN un cliente con dos ventas de $100.000 una con $40.000 cobrados WHEN abro su
  cuenta corriente THEN el saldo total es $160.000 y el cobrado $40.000.
- **AC-002:** GIVEN ese cliente WHEN registro un pago en una de sus ventas THEN al reabrir la
  cuenta corriente el saldo total se reduce y coincide con la suma de los saldos de venta.
- **AC-003:** GIVEN ventas del cliente en tres meses distintos WHEN abro la cuenta corriente THEN
  aparecen las tres, aunque la planilla esté filtrada por el mes en curso.
- **AC-004:** GIVEN la cuenta corriente WHEN exporto el extracto THEN el PDF trae membrete,
  totales del cliente, detalle de ventas y pagos, y **no** incluye teléfono.
- **AC-005:** GIVEN un cliente sin deuda WHEN abro la cuenta corriente THEN veo el estado vacío y
  el botón de PDF deshabilitado.
- **AC-006:** GIVEN la suite WHEN corro `npm test` THEN hay tests de agrupación por cliente,
  totales derivados y armado de filas del extracto.

## Entities Affected

- `src/utils/cuentaCorriente.ts` (nuevo) — puras: agrupar ventas por cliente, totales, antigüedad
  de deuda, filas del extracto.
- `src/components/payments/CuentaCorrienteModal.tsx` (nuevo) — vista, totales y export.
- `src/utils/pdfCuentaCorriente.ts` (nuevo) — PDF del extracto con `jspdf`.
- `src/components/CustomerDirectoryModal.tsx` — acceso a la cuenta corriente desde la ficha.
- `src/components/CobrosPendientesModal.tsx` — acceso por fila (depende de FEAT-PAY-002).
- `src/App.tsx` — estado de apertura y lazy load del modal.
- `src/__tests__/cuentaCorriente.test.ts` (nuevo).

## Ambiguity Log

- [x] *¿El extracto incluye teléfono para cobrar?*
      **No.** Decisión del dueño (2026-10-24). Sólo montos e identificación comercial.
- [x] *¿Se pueden registrar pagos desde la cuenta corriente?*
      No. Se registran en la venta, para que el pago quede atado a un comprobante concreto.
- [ ] *¿La antigüedad de deuda se cuenta en días o en meses?*
      Propuesta: **días** desde la fecha de la venta más vieja con saldo.

## Completion Map

# generated: 2026-10-24T00:00:00Z
# Tarea 1: Utilidades de agrupación y totales por cliente|BR-PAY-016,BR-PAY-018|coder-agent|✅
# Tarea 2: Modal de cuenta corriente con encabezado de totales|AC-001,AC-002,AC-003,AC-005|coder-agent|✅
# Tarea 3: Extracto PDF vectorial sin datos de contacto|BR-PAY-019,BR-PAY-020,AC-004|coder-agent|✅
# Tarea 4: Acceso desde cobros pendientes (directorio queda pendiente)|AF-03|coder-agent|◐
# Tarea 5: Gating RBAC y lazy load|BR-PAY-021|coder-agent|✅
# Tarea 6: Tests de agrupación, totales y extracto|AC-006|coder-agent|✅
