# CONTRACT: Un error aislado no debe tumbar la app ni el servidor, y debe dejar rastro
# ID: FIX-ROBUST-001
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: EXPRESS
# Approved-By: Gerardo Maidana <gerardomaidana@outlook.com>
# Approved-At: 2026-11-05T22:14:06.749Z
# Approved-Hash: cf9662ceac61

## Intent

La aplicación mostró una excepción no controlada y el servidor dejó de responder. Las dos piezas
están sin red de contención: el cliente renderiza `<App />` sin `ErrorBoundary`, así que **cualquier**
excepción de render desmonta toda la interfaz; y `server.js` no escucha `uncaughtException` ni
`unhandledRejection`, así que un error asíncrono termina el proceso. Tampoco quedó rastro: no hay
log del que sacar el stack.

## User Story

- Como: operador del local
- Quiero: que un error aislado no me deje sin sistema y que quede registrado
- Para: no perder la venta en curso ni volver a quedarme sin diagnóstico

## Use Case

**Actor:** Operador / Administrador
**Goal:** sobrevivir a un error aislado y poder diagnosticarlo después

### Main Flow

1. Un error ocurre en un componente de la interfaz.
2. La app muestra una pantalla de recuperación con el detalle técnico y un botón para recargar; los
   datos guardados no se tocan.
3. El error queda registrado en el log de auditoría de la app.
4. Si el error ocurrió en el servidor, se anota en `logs/server-error.log` y el proceso **sigue
   escuchando**.
5. El operador recarga y continúa trabajando.

### Alternative Flows

- AF-01: se repite el mismo error en bucle → el registro se limita (una entrada por minuto y por
  mensaje) para no inundar el log ni llenar el disco.
- AF-02: el error ocurre al servir un archivo estático (lectura fallida o socket cortado) → responde
  500 y el proceso continúa.
- AF-03: la pantalla de recuperación no puede montarse → se deja constancia en consola y se ofrece
  recargar igual.

## Business Rules

- BR-001: toda la aplicación se monta dentro de un `ErrorBoundary`; un error de render no deja la
  pantalla en blanco.
- BR-002: todo error capturado en el cliente se registra con `addSystemLog('ERROR', …)` incluyendo
  mensaje y stack recortado.
- BR-003: `server.js` registra excepciones y rechazos no manejados en `logs/server-error.log` con
  fecha, origen (`uncaughtException` / `unhandledRejection`) y stack.
- BR-004: el servidor **no termina** por un error no manejado: registra y sigue atendiendo.
- BR-005: `serveStatic` maneja el evento `error` del stream de lectura y del socket, de modo que un
  archivo ilegible o un cliente que corta no tumban el proceso.
- BR-006: `logs/` no se versiona.

## Acceptance Criteria

- AC-001: GIVEN un componente que lanza al renderizar WHEN la app monta THEN se ve la pantalla de
  recuperación en lugar de una pantalla en blanco.
- AC-002: GIVEN un error de render WHEN ocurre THEN queda una entrada `ERROR` en el log de auditoría.
- AC-003: GIVEN una excepción no manejada en el servidor WHEN ocurre THEN se escribe en
  `logs/server-error.log` y el puerto sigue respondiendo.
- AC-004: GIVEN un rechazo de promesa sin `catch` WHEN ocurre THEN se registra igual.
- AC-005: GIVEN un archivo servido que falla al leerse WHEN el stream emite `error` THEN la
  petición termina en 500 y el proceso sigue vivo.
- AC-006: GIVEN la carpeta `logs/` WHEN miro `git status` THEN no aparece como versión.

## Entities Affected

- `src/components/common/ErrorBoundary.tsx` (nuevo) — captura de render + pantalla de recuperación.
- `src/main.tsx` — montaje dentro del boundary y escuchas de `error` / `unhandledrejection`.
- `server-error-log.js` (nuevo) — escritura del log del servidor (testeable).
- `server.js` — manejadores globales y errores de stream en `serveStatic`.
- `.gitignore` — `logs/`.
- `src/__tests__/serverErrorLog.test.ts` (nuevo).

## Inferred Assumptions

- [x] CONFIRMED AS-01: ante un `uncaughtException` se elige **seguir atendiendo** en lugar de abortar
      (la recomendación de Node para procesos de larga vida) → **decisión del dueño (2026-11-05): el
      sistema es de uso local y prefiere disponibilidad**; el log queda para decidir después. Si un
      error dejara el estado corrupto, se ve en el log y se reinicia a mano.

## Ambiguity Log

- [x] ¿Reinicio automático o seguir vivo? → **Seguir vivo + log** (decisión del dueño, 2026-11-05).

## Completion Map

# generated: 2026-11-05T19:15:00-03:00
# AC-001|functional|verificacion manual: pantalla de recuperación|humano|❌
# AC-002|functional|verificacion manual: entrada en auditoría|humano|❌
# AC-003|functional|verificacion manual: excepción y sigue vivo|coder-agent|✅
# AC-004|functional|serverErrorLog.test.ts::AC-004 rechazo registrado|tester|✅
# AC-005|functional|verificacion manual: stream con error|humano|❌
# AC-006|functional|verificacion manual: logs fuera de git|coder-agent|✅
# static|static|npm run lint|verifier|✅
