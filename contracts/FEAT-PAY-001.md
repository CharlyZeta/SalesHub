# CONTRACT: Pagos parciales, saldo derivado y estado de pago por venta (libro de pagos)
# ID: FEAT-PAY-001
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: STRICT

## Intent

Hoy una venta registra **cómo** se pagó (`metodoPago`) pero no **cuánto se cobró**. El local
necesita el caso real del mostrador: el cliente entrega el pago **en partes**. Un campo único de
monto no alcanza, porque no permite saber quién pagó qué, cuándo ni cómo. Se modela un **libro de
pagos** por venta (`Sale.pagos`) del que se **derivan** el total cobrado, el saldo y el estado
(**Pagado** / **Pago parcial** / **Pendiente de pago**). El saldo nunca se persiste: se calcula.

## Use Case

**Actor:** Operador de mostrador / Administrador
**Goal:** registrar cada entrega parcial de un cliente y ver siempre el saldo real de la venta.

### Main Flow

1. El operador carga una venta. Al crearla, la venta nace con `pagos: []` → estado **Pendiente de
   pago** (si el total es > 0 y no se cobra nada en el acto).
2. Si el cliente paga todo en el acto, el operador pulsa "Registrar pago" e ingresa el total →
   estado **Pagado**.
3. Si entrega una parte, ingresa ese monto (con medio de pago y nota opcional) → estado **Pago
   parcial**, y el saldo se recalcula en vivo.
4. Más adelante el cliente vuelve con otra parte: se agrega un nuevo pago, el saldo baja y al
   cubrir el total el estado pasa a **Pagado** automáticamente.
5. El historial de pagos de la venta queda visible (fecha, monto, medio, quién lo registró).

### Alternative Flows

- **AF-01 (Venta histórica):** ventas anteriores a este módulo **no tienen el campo `pagos`**
  (es `undefined`, no `[]`) y se consideran **Pagado**. No se reescriben ni se migran.
- **AF-02 (Monto inválido):** monto ≤ 0 o mayor al saldo se rechaza con mensaje; nunca queda
  saldo negativo.
- **AF-03 (Pago cargado por error):** se puede eliminar un pago (con confirmación) y el saldo se
  recalcula; queda registro en auditoría.
- **AF-04 (Venta ya pagada):** no admite nuevos pagos; el botón queda deshabilitado.
- **AF-05 (Solo lectura):** con permiso `read` sobre `ventas` se ve el estado y el historial, pero
  no se registran ni eliminan pagos (BR-RBAC-003).

## Business Rules

- **BR-PAY-001 (retrocompatibilidad):** `Sale.pagos === undefined` ⇒ venta histórica ⇒ **Pagado**
  con saldo 0. Una venta nueva **siempre** se persiste con `pagos: []`. La distinción entre
  "ausente" y "array vacío" es lo que separa historia de venta nueva; no se reescribe el pasado.
- **BR-PAY-002:** Un pago debe cumplir `0 < monto <= saldo`. Se rechaza cualquier otro valor; el
  sistema nunca admite saldo negativo ni saldo a favor.
- **BR-PAY-003:** `totalCobrado`, `saldo` y `estadoPago` son **derivados** de `pagos` y
  `montoTotal`. No se persisten en la venta, para que no puedan desincronizarse.
- **BR-PAY-004:** Estado derivado: `saldo <= 0` ⇒ `pagado`; `totalCobrado === 0` ⇒ `pendiente`;
  en otro caso ⇒ `parcial`.
- **BR-PAY-005:** Cada pago guarda `id`, `fecha`, `monto`, `medio`, `nota?`, `registradoEn` y el
  `username` del usuario activo (alineado con BR-AUTH-004). Todo alta o baja de pago genera
  entrada en el log de auditoría (categoría `Pagos`).
- **BR-PAY-006:** Registrar o eliminar pagos modifica **sólo** `sale.pagos`; no toca `montoTotal`,
  ítems, IVA ni ningún otro cálculo existente.
- **BR-PAY-007:** El medio de pago del pago reutiliza el tipo `PaymentMethod` ya existente.
- **BR-PAY-008:** El estado se comunica con una píldora pequeña de bajo contraste (fondo tenue +
  borde + `text-[11px]`), nunca con relleno de fila entera; `parcial` y `pendiente` pueden sumar
  un acento de 3 px en el borde izquierdo de la fila. Debe respetar tema claro y oscuro.

## Acceptance Criteria

- **AC-001:** GIVEN una venta de $100.000 WHEN registro un pago de $40.000 THEN el estado es
  "Pago parcial" y el saldo muestra $60.000.
- **AC-002:** GIVEN esa venta WHEN registro otro pago de $60.000 THEN el estado pasa a "Pagado" y
  el saldo queda en $0.
- **AC-003:** GIVEN una venta con saldo $60.000 WHEN intento registrar $70.000 THEN se rechaza con
  mensaje y no se agrega el pago.
- **AC-004:** GIVEN un pago de $40.000 WHEN lo elimino THEN el saldo vuelve a $100.000 y el estado
  a "Pendiente de pago", con entrada en auditoría.
- **AC-005:** GIVEN una venta histórica sin campo `pagos` WHEN la abro THEN se muestra "Pagado" y
  saldo 0, sin modificar el dato guardado.
- **AC-006:** GIVEN una venta nueva sin pagos WHEN la guardo THEN su estado es "Pendiente de pago".
- **AC-007:** GIVEN la suite WHEN corro `npm test` THEN hay tests de derivación de saldo/estado,
  validación de rangos, eliminación de pago y retrocompatibilidad con ventas históricas.

## Entities Affected

- `src/types.ts` — `PaymentStatus`, `SalePayment`, `Sale.pagos?: SalePayment[]`.
- `src/utils/salePayments.ts` (nuevo) — puras: `getTotalCobrado`, `getSaldo`, `getEstadoPago`,
  `validarPago`, `crearPago`, `eliminarPago`.
- `src/components/payments/RegisterPaymentModal.tsx` (nuevo) — alta de pago con validación viva.
- `src/components/payments/SalePaymentsHistory.tsx` (nuevo) — historial y borrado.
- `src/components/SaleFormModal.tsx` — preservar `pagos` al editar; acceso al registro de pagos.
- `src/components/grid/GridRow.tsx` + `SpreadsheetGrid.tsx` — columna de estado (píldora + acento).
- `src/hooks/useSalesState.ts` — operaciones de alta/baja de pago sobre la venta.
- `src/utils/formatters.ts` — CSV con estado y saldo.
- `src/__tests__/salePayments.test.ts` (nuevo).

## Ambiguity Log

- [x] *¿Un monto acumulado en la venta o un libro de pagos?*
      **Libro de pagos.** El requisito es "cuenta corriente": pagos sucesivos con fecha, medio y
      responsable. Un escalar obliga a sobrescribir historia y no permite auditar.
- [x] *¿Cómo distinguir venta histórica de venta nueva impaga sin migrar datos?*
      Por la **presencia del campo**: `undefined` = histórica (pagada), `[]` = nueva (pendiente).
      Se evita cualquier migración destructiva sobre `app_sales_v1`.
- [x] *¿La fecha del pago se puede editar?*
      Propuesta: se registra al momento (no editable). Si hay que corregir, se borra y se vuelve a
      cargar, con doble registro en auditoría.
- [x] **Alta de venta: nace "Pagada" o "Pendiente"?** El riesgo detectado es que si toda venta
      nueva nace pendiente, el listado de deuda se llena de falsos positivos porque en el
      mostrador se cobra en el acto. Se agregó un check **"Cobrada en el acto"** (marcado por
      defecto) que crea un único pago por el total con el medio elegido. Destildado, la venta
      nace con `pagos: []` = pendiente.
- [x] **Las ventas importadas por CSV/Sheets quedan sin el campo `pagos`** (= pagadas). Son datos
      históricos: no corresponde marcarlas como deuda.
- [x] **No se modificó `useSalesState`.** La operación ya existía: `handleUpdateInlineSale(id, {
      pagos })`. Se usan las utilidades puras para construir el libro nuevo.
- [x] **El acento izquierdo de 3 px quedó fuera** de esta entrega: la píldora ya distingue los
      tres estados sin pintar la fila y se prefirió no sumar más ruido visual. Queda disponible
      si hace falta reforzar.
- [ ] *¿La fecha del pago debería poder elegirse?* (revisar cuando se registren pagos de días
      anteriores).

## Completion Map

# generated: 2026-10-24T00:00:00Z
# Tarea 1: Tipos PaymentStatus, SalePayment y Sale.pagos|coder-agent|✅
# Tarea 2: Utilidades puras de saldo, estado y validación|BR-PAY-002,BR-PAY-003,BR-PAY-004,AC-001|coder-agent|✅
# Tarea 3: Operaciones de alta/baja de pago (vía handleUpdateInlineSale)|BR-PAY-006|coder-agent|✅
# Tarea 4: Modal de registro de pago con validación viva|AC-001,AC-003|coder-agent|✅
# Tarea 5: Historial de pagos de la venta con borrado auditado|BR-PAY-005,AC-004|coder-agent|✅
# Tarea 6: Píldora de estado en la planilla (acento diferido)|BR-PAY-008,AC-003|coder-agent|✅
# Tarea 7: Retrocompatibilidad de ventas históricas|BR-PAY-001,AC-005,AC-006|coder-agent|✅
# Tarea 8: CSV con estado y saldo|BR-PAY-007,AC-006|coder-agent|✅
# Tarea 9: Tests de derivación, validación y migración|AC-002,AC-007|coder-agent|✅
