# CONTRACT: El recibo de pago se emite sólo desde el pago, no desde la fila del registro
# ID: FIX-UI-002
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: EXPRESS
# Approved-By: Gerardo Maidana <gerardomaidana@outlook.com>
# Approved-At: 2026-11-05T19:30:33.201Z
# Approved-Hash: b585d255b496
# Depends On: FEAT-PAY-004

## Intent

En FEAT-PAY-004 el recibo quedó accesible desde las acciones de cada fila de la planilla y desde el
encabezado del libro de pagos. Eso lo pone en el mismo nivel que "editar" o "eliminar" una venta,
cuando en realidad el recibo es un documento **de un pago**: se entrega cuando el cliente paga.
Se retira de la fila y queda únicamente junto a cada pago, dentro del modal donde se registran.

## User Story

- Como: operador de mostrador
- Quiero: imprimir el recibo de un pago desde el mismo listado donde registro ese pago
- Para: entregar el comprobante en el momento del cobro, sin salir del libro de pagos

## Use Case

**Actor:** Operador de mostrador
**Goal:** emitir el recibo del pago que acaba de registrar

### Main Flow

1. El operador abre el libro de pagos de una venta.
2. En la fila del pago que corresponde, pulsa el ícono de recibo.
3. Se abre el recibo de ese pago con su número, importe, parcialidad, pagado acumulado y saldo.
4. Lo imprime o descarga en PDF y lo entrega.

### Alternative Flows

- AF-01: la venta todavía no tiene pagos → el libro muestra "Sin pagos registrados" y no hay
  recibo que emitir.
- AF-02: usuario con permiso `read` sobre `ventas` → puede abrir el recibo del pago; el alta y la
  baja de pagos siguen ocultas.

## Business Rules

- BR-001: la fila de la planilla **no** ofrece acción de recibo; sus acciones quedan como estaban
  antes de FEAT-PAY-004.
- BR-002: el recibo se ofrece únicamente por pago, dentro del modal del libro de pagos.
- BR-003: no se modifica el modelo del recibo (`armarReciboPago`, `numeroRecibo`) ni sus pruebas;
  el cambio es de superficie de acceso, no de reglas.

## Acceptance Criteria

- AC-001: GIVEN una fila de la planilla WHEN miro sus acciones THEN no hay ícono de recibo.
- AC-002: GIVEN el libro de pagos con pagos cargados WHEN miro cada fila THEN cada pago tiene su
  ícono de recibo.
- AC-003: GIVEN el ícono de un pago WHEN lo pulso THEN se abre el recibo de **ese** pago, con
  "pago N de M" y su importe.
- AC-004: GIVEN el libro de pagos WHEN no hay pagos registrados THEN no se ofrece recibo alguno.

## Entities Affected

- `src/components/grid/GridRow.tsx` — se retira la acción y la prop de recibo.
- `src/components/SpreadsheetGrid.tsx` — se retira el estado y el modal de recibo de la fila.
- `src/components/payments/SalePaymentsModal.tsx` — se retira el acceso de venta del encabezado;
  se conserva el ícono por pago.

## Inferred Assumptions

- [x] CONFIRMED AS-01: al no haber ya acceso al "recibo de la venta", una venta histórica sin pagos
      no puede emitir recibo → **decisión del dueño (2026-11-05): el recibo pertenece al pago**. Si
      hiciera falta el estado de deuda, se usa el extracto de cuenta corriente (FEAT-PAY-003).

## Ambiguity Log

- [x] ¿Se conserva el recibo de la venta como acceso secundario o se elimina? → **Se elimina**: el
      recibo se emite por pago (decisión del dueño, 2026-11-05).

## Completion Map

# generated: 2026-11-05T16:30:00-03:00
# BR-001|functional|verificacion manual: acciones de fila|humano|❌
# BR-002|functional|verificacion manual: libro de pagos|humano|❌
# BR-003|static|paymentReceipt.test.ts::FEAT-PAY-004 suite intacta|verifier|✅
# AC-001|functional|verificacion manual: fila sin recibo|humano|❌
# AC-002|functional|verificacion manual: ícono por pago|humano|❌
# AC-003|functional|verificacion manual: recibo del pago|humano|❌
# AC-004|functional|verificacion manual: sin pagos, sin recibo|humano|❌
