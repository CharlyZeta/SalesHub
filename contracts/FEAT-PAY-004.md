# CONTRACT: Recibo de pago de una venta y de un pago parcial
# ID: FEAT-PAY-004
# Status: RESOLVED
# Mode: LOOP
# Gate-Mode: STRICT
# Approved-By: Gerardo Maidana <gerardomaidana@outlook.com>
# Approved-At: 2026-11-05T15:20:19.419Z
# Approved-Hash: a966dd0a5157
# Depends On: FEAT-PAY-001

## Intent

Una venta puede cobrarse en partes, pero el cliente no se lleva ninguna constancia de lo que
entregó ni de lo que queda debiendo. Se agrega un recibo imprimible —de la venta completa o de un
pago concreto— que documenta cliente, productos, condición de pago, parcialidad, total pagado y
saldo. Se deriva del libro de pagos existente: no crea estado nuevo.

## User Story

- Como: operador de mostrador
- Quiero: imprimir un recibo de pago de una venta o de un pago parcial
- Para: entregarle al cliente constancia de lo que pagó y del saldo que adeuda

## Use Case

**Actor:** Operador de mostrador / Administrador
**Goal:** emitir un recibo fiel al libro de pagos de la venta

### Main Flow

1. El operador abre el libro de pagos de una venta (ícono de billetera en la planilla).
2. Elige "Recibo de la venta" o "Recibo" sobre un pago del historial.
3. El sistema arma el recibo con membrete, datos del cliente, productos, condición de pago, importe
   del pago (si es parcial), total pagado y saldo.
4. El recibo se muestra en pantalla con su número y fecha.
5. El operador pulsa Imprimir o Descargar PDF y entrega el comprobante.

### Alternative Flows

- AF-01: venta histórica anterior al módulo de pagos → se emite como "Pagado", saldo $0 y leyenda
  "venta registrada antes del módulo de pagos".
- AF-02: venta sin pagos → se emite como "Pendiente de pago", pagado $0 y saldo igual al total.
- AF-03: empresa sin datos fiscales cargados → el membrete usa los valores por defecto y no bloquea
  la emisión.
- AF-04: usuario con permiso `read` sobre `ventas` → puede emitir el recibo, no puede registrar
  pagos desde el mismo modal.

## Business Rules

- BR-001: el recibo se **deriva** de `Sale.montoTotal` y del libro `Sale.pagos`; emitirlo no crea,
  modifica ni persiste ningún dato de la venta.
- BR-002: `pagado acumulado` es la suma de los pagos (o `montoTotal` si la venta es histórica) y
  `saldo` es `montoTotal − pagado`, redondeado a 2 decimales y nunca negativo.
- BR-003: la condición de pago usa las tres etiquetas del sistema —Pagado / Pago parcial / Pendiente
  de pago— y coincide siempre con `getEstadoPago`.
- BR-004: en un recibo de pago parcial se indica el importe de **ese** pago y su posición en el
  libro ("pago 2 de 3"), además del acumulado.
- BR-005: el número de recibo es determinístico: `REC-<ventaId>` para la venta y
  `REC-<ventaId>-<pagoId>` para un pago; se repite idéntico en pantalla, impresión y PDF.
- BR-006: los datos del cliente y los productos provienen de la venta; si un campo falta se muestra
  "—" y la emisión continúa.
- BR-007: el recibo muestra el medio y la nota del pago, y **no** expone hashes, tokens, PIN ni
  credenciales.

## Acceptance Criteria

- AC-001: GIVEN una venta de $100.000 con un pago de $40.000 WHEN emito el recibo de ese pago THEN
  muestra condición "Pago parcial", importe $40.000, pagado $40.000 y saldo $60.000.
- AC-002: GIVEN una venta con pagos que cubren el total WHEN emito su recibo THEN la condición es
  "Pagado" y el saldo $0.
- AC-003: GIVEN una venta sin pagos WHEN emito su recibo THEN la condición es "Pendiente de pago",
  pagado $0 y saldo igual al total.
- AC-004: GIVEN una venta sin el campo `pagos` WHEN emito su recibo THEN figura como "Pagado",
  pagado igual al total y la leyenda de venta anterior al módulo.
- AC-005: GIVEN un pago que es el segundo de tres WHEN emito su recibo THEN indica "pago 2 de 3" y
  su importe propio.
- AC-006: GIVEN el recibo en pantalla WHEN pulso Imprimir THEN se abre el diálogo de impresión con
  el recibo solo, sin la interfaz de la aplicación.
- AC-007: GIVEN el recibo en pantalla WHEN pulso Descargar PDF THEN se descarga un archivo con el
  mismo número y contenido.
- AC-008: GIVEN la utilidad del recibo WHEN la invoco dos veces con los mismos datos THEN el número
  y todos los importes son idénticos (determinismo de BR-005 y BR-002).

## Entities Affected

- `src/utils/paymentReceipt.ts` (nuevo) — modelo del recibo: número, cliente, productos, condición,
  parcialidad, pagado y saldo. Funciones puras.
- `src/utils/pdfReciboPago.ts` (nuevo) — exportación a PDF con el patrón de `RemitoModal`.
- `src/components/payments/ReciboPagoModal.tsx` (nuevo) — vista del recibo + Imprimir / PDF.
- `src/components/payments/SalePaymentsModal.tsx` — accesos "Recibo de la venta" y por pago.
- `src/components/grid/GridRow.tsx` — acción de recibo sobre la venta.
- `src/App.tsx` — apertura del recibo desde el listado de cobros.
- `src/index.css` — reglas de impresión `printing-recibo` / `#print-area-recibo`.
- `src/__tests__/paymentReceipt.test.ts` (nuevo).

## Inferred Assumptions

- [x] CONFIRMED AS-01: el número de recibo se deriva de la venta y del pago en lugar de un
      correlativo persistido → **decisión del dueño (2026-11-05): determinística**, `REC-<venta>` y
      `REC-<venta>-<pago>`.
- [x] CONFIRMED AS-02: el recibo no se guarda ni se registra su emisión → **decisión del dueño
      (2026-11-05): derivado, sin persistencia**.
- [x] CONFIRMED AS-03: se reutiliza el mecanismo de impresión del remito (área dedicada +
      `@media print`) en lugar de introducir una librería nueva.

## Ambiguity Log

- [x] ¿Numeración correlativa? → **No**: determinística (decisión del dueño, 2026-11-05).
- [x] ¿Un recibo por pago o uno solo de la venta? → **Ambos**: recibo de la venta y recibo por cada
      pago (decisión del dueño, 2026-11-05).

## Completion Map

# generated: 2026-11-05T12:00:00-03:00
# MF-1|functional|paymentReceipt.test.ts::MF-1 flujo de emisión|tester|✅
# AF-01|functional|paymentReceipt.test.ts::AF-01 venta histórica|tester|✅
# AF-02|functional|paymentReceipt.test.ts::AF-02 venta sin pagos|tester|✅
# AF-04|functional|paymentReceipt.test.ts::AF-04 sólo lectura|tester|✅
# BR-001|functional|paymentReceipt.test.ts::BR-001 no muta la venta|tester|✅
# BR-002|functional|paymentReceipt.test.ts::BR-002 pagado y saldo|tester|✅
# BR-003|functional|paymentReceipt.test.ts::BR-003 condición de pago|tester|✅
# BR-004|functional|paymentReceipt.test.ts::BR-004 parcialidad|tester|✅
# BR-005|functional|paymentReceipt.test.ts::BR-005 número determinístico|tester|✅
# BR-006|functional|paymentReceipt.test.ts::BR-006 datos faltantes|tester|✅
# BR-007|security|paymentReceipt.test.ts::BR-007 sin datos sensibles|verifier|✅
# AC-001|functional|paymentReceipt.test.ts::AC-001 recibo parcial|tester|✅
# AC-002|functional|paymentReceipt.test.ts::AC-002 recibo pagado|tester|✅
# AC-003|functional|paymentReceipt.test.ts::AC-003 recibo pendiente|tester|✅
# AC-004|functional|paymentReceipt.test.ts::AC-004 recibo histórico|tester|✅
# AC-005|functional|paymentReceipt.test.ts::AC-005 pago N de M|tester|✅
# AC-006|functional|verificacion manual: impresión|humano|✅
# AC-007|functional|verificacion manual: PDF|humano|✅
# AC-008|functional|paymentReceipt.test.ts::AC-008 determinismo|tester|✅
# static|static|npm run lint|verifier|✅
