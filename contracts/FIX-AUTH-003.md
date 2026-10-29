# CONTRACT: Acceso a Gestión de Usuarios y Cambio de PIN efectivo
# ID: FIX-AUTH-003
# Status: APPROVED
# Mode: LOOP
# Gate-Mode: STRICT
# Depende de: FEAT-AUTH-002 (entregado), FEAT-RBAC-001 (entregado)

## Intent

Hoy **ningún usuario, ni siquiera un ADMIN autenticado, puede abrir el panel de gestión de
usuarios**, y el cambio de PIN disponible en la UI **no tiene efecto sobre el login**. Los dos
síntomas comparten una sola causa raíz y un campo fantasma.

Síntomas reportados por el dueño del producto:

1. "No puedo crear usuarios nuevos."
2. "No puedo hacer efectivo el cambio de PIN."

## Current Behavior (verificado por lectura de código)

### Causa raíz del síntoma 1 — el gate de seguridad se evalúa con un rol que nunca se pasa

- `src/App.tsx:670` renderiza `<ConfigModal … />` **sin pasar `currentRole`**.
- `src/components/ConfigModal.tsx:40-41`:
  ```ts
  const { canWrite } = usePermissions(currentRole ?? 'OPERADOR');
  const canManageSecurity = currentRole === 'ADMIN' || canWrite('seguridad');
  ```
  Con `currentRole === undefined`, `usePermissions` evalúa como **OPERADOR**, y por BR-RBAC-002
  el permiso por defecto de OPERADOR sobre `seguridad` es `none`. Por lo tanto
  `canWrite('seguridad') === false` y `canManageSecurity === false` **siempre**.
- `canManageSecurity` esconde el botón de la pestaña (`ConfigModal.tsx:428,443`) y el contenido
  (`:546,554`). El panel "Usuarios & Sesión" es **inalcanzable para todos**, incluido el ADMIN.

### El campo fantasma que agrava el problema

`src/types.ts:229` declara `rolActual?: UserRole` dentro de `SecurityConfig`, y
`ConfigModal.tsx:550` lo lee con `currentRole={config.seguridad?.rolActual}`. Un `grep` de
`rolActual` en todo `src/` devuelve **2 coincidencias: la declaración del tipo y esa lectura**.
Nadie lo escribe nunca, así que siempre es `undefined`.

El rol real vive en la sesión autenticada (`useSecurityRole.currentUser.rol`, persistido en
`sessionStorage` por `setActiveSessionUser`), pero `ConfigModal` no lo recibe.

### Causa raíz del síntoma 2 — quedaron dos sistemas de PIN y el que se puede editar está muerto

- El PIN que valida el login es **por usuario**: `AppUser.pinHash` (`userService.authenticateWithPin`).
- `src/components/AuthModal.tsx:180-203` tiene **comentado** el fallback al PIN legado global
  (`securityConfig.pinAcceso`), con el comentario explícito de que un PIN compartido no debe
  conceder ADMIN. Correcto desde lo conceptual.
- Pero `src/components/ConfigSecurityTab.tsx:27,68` sigue **editando `secConfig.pinAcceso`** y
  presentándolo como "el PIN" del sistema.

Consecuencia: el único campo de PIN accesible desde la UI escribe un dato que el login ignora.
El PIN real (`pinHash` por usuario) sólo se edita desde la pestaña "Usuarios & Sesión", que está
inaccesible por el síntoma 1.

### Defecto latente adicional (no es la causa)

`src/components/config/ConfigUsersTab.tsx:291` usa `z-60`. Verificado contra el CSS construido:
sólo existe `.z-\[60\]` y **no existe la regla `.z-60`**, así que la clase no hace nada y el modal
anidado queda con `z-index: auto` sobre un padre `z-50`. `SystemLogsModal.tsx:380` usa el valor
correcto. Debe corregirse para que el modal de alta quede siempre por encima.

## Use Case

**Actor:** Administrador autenticado · **Goal:** administrar cuentas y credenciales del local.

### Main Flow

1. El ADMIN inicia sesión con usuario y contraseña o PIN.
2. Abre Configuración → ve las pestañas "Usuarios & Sesión" y "Permisos & Herramientas".
3. Crea un operador con usuario, contraseña y PIN rápido opcional.
4. El operador recién creado puede ingresar con su PIN en el mostrador.
5. El ADMIN edita el PIN de un usuario; el PIN anterior deja de funcionar y el nuevo entra.

### Alternative Flows

- **AF-01 (Operador):** al abrir Configuración **no** ve las pestañas de usuarios ni de permisos.
- **AF-02 (Seguridad desactivada):** sin seguridad habilitada no hay sesión; se aplica el rol
  efectivo que determine `useSecurityRole` y el panel queda alcanzable sólo con rol ADMIN.
- **AF-03 (Cambio de PIN en "Seguridad & PIN"):** la pestaña deja de ofrecer un campo muerto y
  explica que el PIN es por usuario, con acceso directo a la pestaña de usuarios.

## Business Rules

- **BR-AUTH-007:** El rol para decidir accesos debe provenir de la **sesión autenticada**
  (`useSecurityRole`), nunca de `config.seguridad`. Se elimina `rolActual` del tipo
  `SecurityConfig` para que el error no pueda repetirse.
- **BR-AUTH-008:** Un ADMIN autenticado siempre puede administrar seguridad (alineado con
  BR-RBAC-001). El gate no puede depender de la matriz de permisos para el propio ADMIN.
- **BR-AUTH-009:** Una sola fuente de verdad del PIN: `AppUser.pinHash`. El campo legado
  `secConfig.pinAcceso` no se ofrece más como editable; si existe, se migra o se ignora
  explícitamente y se documenta en la UI.
- **BR-AUTH-010:** Al modificar el PIN de un usuario, el PIN anterior debe fallar de inmediato en
  el próximo intento de login (sin caché de sesión).
- **BR-AUTH-011:** Los modales anidados dentro de un modal abierto deben usar valores de z-index
  existentes (`z-[60]` o superior), nunca clases inexistentes.

## Acceptance Criteria

- **AC-001:** GIVEN un ADMIN autenticado WHEN abre Configuración THEN ve las pestañas
  "Usuarios & Sesión" y "Permisos & Herramientas" y puede entrar a ambas.
- **AC-002:** GIVEN el panel de usuarios WHEN el ADMIN crea un operador con contraseña y PIN
  THEN el usuario aparece en la tabla y puede iniciar sesión con ese PIN.
- **AC-003:** GIVEN un usuario con PIN `1111` WHEN el ADMIN lo cambia a `2222` THEN el login con
  `1111` falla y con `2222` entra.
- **AC-004:** GIVEN un OPERADOR autenticado WHEN abre Configuración THEN no ve las pestañas
  "Usuarios & Sesión" ni "Permisos & Herramientas".
- **AC-005:** GIVEN la pestaña "Seguridad & PIN" WHEN se abre THEN no muestra un campo editable
  de PIN legado y ofrece ir a la gestión de usuarios.
- **AC-006:** GIVEN el modal de alta de usuario WHEN se abre sobre Configuración THEN se dibuja
  por encima del modal padre (z-index verificado en el CSS construido).
- **AC-007:** GIVEN la suite WHEN se corre `npm test` THEN hay tests nuevos que fijan la
  resolución de rol (ADMIN vs OPERADOR) y el cambio efectivo de PIN.

## Entities Affected

- `src/App.tsx` — pasar `currentUser`/`currentRole` a `ConfigModal`.
- `src/components/ConfigModal.tsx` — gate por sesión; eliminar lectura de `rolActual`.
- `src/types.ts` — quitar `rolActual` de `SecurityConfig`.
- `src/components/ConfigSecurityTab.tsx` — retirar el campo de PIN legado, agregar derivación.
- `src/components/config/ConfigUsersTab.tsx` — `z-[60]`, recibir y usar `currentRole` si aplica.
- `src/hooks/useSecurityRole.ts` — exponer el rol de sesión de forma inequívoca.
- `src/__tests__/` — tests de gate de rol y de cambio de PIN.

## Ambiguity Log

- [x] *¿Se puede simplemente pasar el rol desde `config.seguridad.rolActual`?*
      **No.** Ese campo nunca se escribe (2 coincidencias de `grep`, ambas de lectura/declaración).
      Se elimina el campo en lugar de "hacerlo funcionar", porque la sesión ya es la fuente real.
- [x] *¿Se borra el PIN legado `pinAcceso`?*
      Se deja de editar en la UI y se documenta. No se borra el dato almacenado para no romper
      backups existentes; el login ya lo ignora por diseño (AuthModal:180-203).
- [ ] *¿La pestaña "Seguridad & PIN" conserva el control de inactividad y el bloqueo?*
      Propuesta: sí, sólo se retira el campo muerto de PIN. **Aplicado:** la pestaña conserva el
      toggle de habilitación, el tiempo de inactividad y las restricciones de rol.
- [x] **Hallazgo durante el loop: `INITIAL_CONFIG` fijaba `rolActual: 'ADMIN'`.**
      Por eso el panel de usuarios sí aparecía en una instalación nueva y **no** en la del local:
      la config guardada del local no tiene ese campo y `rolActual` era `undefined`. Se eliminó
      también de `src/data/initialData.ts`.
- [x] **Se eliminó además `usuarioActivo`, otro campo fantasma** de `SecurityConfig` (un solo
      `grep`: su propia declaración). Se quitó para que nadie repita el error.
- [x] **El guard de "habilitar seguridad" se reescribió.** Dependía del PIN legado, que ya no
      otorga acceso. Ahora exige que exista al menos un ADMIN activo con **contraseña y PIN
      distintos** de los predeterminados. Se verifican de verdad (SHA-256 contra `'1234'`), no por
      un flag: `mustChangeCredentials` se escribe en `userService` pero **nunca se lee**, así que
      confiar en él habría bloqueado siempre.
- [x] **Decisión sobre el gate sin seguridad:** con el control de acceso desactivado no hay
      autenticación, así que `canManageSecurity` devuelve `true`. Si no, una instalación nueva no
      podría crear nunca el primer usuario. Queda fijado en tests.
- [x] **El criterio de credenciales seguras es AND, no OR.** Cambiar sólo la contraseña dejando el
      PIN `1234` sigue permitiendo entrar con el PIN; los tests lo fijan explícitamente.

## Completion Map

# generated: 2026-10-24T00:00:00Z
# Tarea 1: Pasar la sesión real a ConfigModal y reescribir el gate|BR-AUTH-007,BR-AUTH-008,AC-001,AC-004|coder-agent|✅
# Tarea 2: Eliminar rolActual de SecurityConfig y su lectura|BR-AUTH-007,AC-001|coder-agent|✅
# Tarea 3: Retirar el campo de PIN legado en ConfigSecurityTab con derivación a usuarios|BR-AUTH-009,AC-005|coder-agent|✅
# Tarea 4: Corregir z-60 → z-[60] en el modal de alta|BR-AUTH-011,AC-006|coder-agent|✅
# Tarea 5: Tests de gate de rol y de cambio efectivo de PIN|AC-002,AC-003,AC-007|tester-agent|✅
# Tarea 6: Verificación manual del flujo completo (crear usuario y cambiarlo de PIN)|AC-002,AC-003|humano|❌
