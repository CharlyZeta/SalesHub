# CONTRACT: Sistema de Cuentas de Usuario, Autenticación Híbrida (Pass + PIN Rápido) y Autobloqueo

# ID: FEAT-AUTH-002

# Status: APPROVED

# Mode: LOOP

# Gate-Mode: FULL

## Intent

Reemplazar el esquema de PIN único global con auto-selección de rol por un sistema integral de **Cuentas de Usuario y Autenticación Híbrida**. Permite crear operadores y administradores con nombre, usuario y contraseña segura, habilitando opcionalmente un **PIN rápido de acceso personal** para terminales de mostrador. El modo de autenticación es configurable globalmente (híbrido con PIN rápido vs. estricto solo usuario/contraseña para escalar a otras organizaciones) e incorpora **autobloqueo por inactividad configurable**, asegurando el puesto si el operador se ausenta.

## Use Case

**Actor:** Administrador / Operadores de mostrador  
**Goal:** Garantizar autenticación real por identidad de usuario, permitiendo inicio rápido en el local mediante PIN o autenticación tradicional por contraseña, con bloqueo automático del puesto por inactividad.

### Main Flow

1. **Configuración de Usuarios y Política de Acceso (Solo Admin):**
   - El Administrador ingresa al panel "Usuarios & Sesiones" en Configuración.
   - Crea cuentas de usuario asignando: Nombre completo, Usuario único (`username`), Rol base (`ADMIN` | `OPERADOR`), Contraseña principal y opcionalmente un PIN personal de acceso rápido (4 a 6 dígitos).
   - Configura la política de ingreso global:
     - `Híbrido (PIN Rápido o Contraseña)`: Ideal para computadoras compartidas en local comercial con alta velocidad de despacho.
     - `Estricto (Solo Usuario y Contraseña)`: Para empresas con puestos individuales o mayor rigor de acceso.
   - Configura el temporizador de auto-bloqueo por inactividad (ej: 2, 5, 10, 15, 30 minutos o desactivado).

2. **Inicio de Sesión y Desbloqueo (Terminal):**
   - Si la política es `Híbrido`: El modal de acceso ofrece selector de usuario o ingreso directo de PIN numérico. Al validar el PIN, el sistema identifica directamente al usuario correspondiente y carga sus permisos reales sin que el usuario elija su propio rol. También ofrece toggle para "Ingresar con Contraseña".
   - Si la política es `Estricto`: El modal exige Nombre de Usuario y Contraseña.
   - Se mantiene la protección de bloqueo temporal escalonado ante múltiples intentos fallidos (3 intentos = 5s, 5 intentos = 30s, etc.).

3. **Autobloqueo por Inactividad:**
   - La aplicación monitorea actividad del teclado, mouse, foco y eventos táctiles.
   - Al cumplirse el tiempo configurado sin actividad, la pantalla se bloquea inmediatamente protegiendo los datos visibles y exigiendo reingreso del usuario actual (o cambio de usuario).
   - Botón de bloqueo manual instantáneo disponible en la barra superior.

### Alternative Flows

- **AF-01 (Primer Inicio / Migración sin usuarios previos):** Si no existen usuarios creados, el sistema crea automáticamente un usuario inicial `admin` con la clave predeterminada configurada, requiriendo su personalización inmediata antes de habilitar la seguridad.
- **AF-02 (Usuario Olvida su PIN Rápido):** Puede pulsar "Ingresar con contraseña" e iniciar sesión con su contraseña maestra de cuenta, o solicitar al Administrador el restablecimiento desde el panel de usuarios.
- **AF-03 (Desactivación de Cuenta):** El Administrador puede suspender temporalmente a un usuario sin eliminar su historial de operaciones en los logs de auditoría.

## Business Rules

- **BR-AUTH-001:** Las contraseñas y PINs nunca se almacenan en texto plano en `localStorage`; se persisten exclusivamente mediante hashes SHA-256 con salt criptográfico individual.
- **BR-AUTH-002:** El rol de una sesión activa lo determina estrictamente el usuario autenticado por sus credenciales válidas; se elimina por completo la selección arbitraria de rol por parte del operador.
- **BR-AUTH-003:** El PIN de acceso rápido debe ser único por usuario activo para permitir identificación unívoca instantánea en el mostrador.
- **BR-AUTH-004:** Toda acción registrada en el sistema de logs (`src/utils/logger.ts`) debe incluir el `username` y `userId` del usuario activo en lugar de una etiqueta genérica.
- **BR-AUTH-005:** Siempre debe existir al menos un usuario activo con rol `ADMIN`. No se permite eliminar ni degradar al último administrador existente.
- **BR-AUTH-006:** El temporizador de inactividad debe cancelarse cuando la ventana/pestaña no tiene foco (`document.hidden`) y reprogramarse al retomar la atención.

## Acceptance Criteria

- **AC-AUTH-001:** GIVEN el panel de configuración de usuarios WHEN un admin crea un nuevo operador con contraseña y PIN rápido opcional THEN el usuario queda guardado con credenciales hasheadas y listo para operar.
- **AC-AUTH-002:** GIVEN el modo Híbrido activo WHEN un operador ingresa su PIN personal THEN el sistema valida su identidad, le asigna su sesión y desbloquea la interfaz sin preguntar el rol.
- **AC-AUTH-003:** GIVEN el modo Estricto activo WHEN se abre la pantalla de acceso THEN no se ofrece opción de PIN numérico y se exige usuario y contraseña.
- **AC-AUTH-004:** GIVEN un puesto inactivo por el tiempo configurado (ej: 5 min) WHEN vence el temporizador THEN la pantalla se bloquea automáticamente mostrando el modal de acceso.
- **AC-AUTH-005:** GIVEN un operador que intenta cambiar a Administrador WHEN ingresa credenciales THEN solo obtiene perfil Administrador si introduce credenciales válidas de una cuenta Admin.
- **AC-AUTH-006:** GIVEN la suite de validación WHEN se ejecutan los tests unitarios THEN el 100% de las pruebas de hashing, verificación y timeout pasan limpiamente sin errores de TypeScript.

## Entities Affected

- `src/types.ts`: Definición de interfaces `AppUser`, `UserRole`, `AuthMode`, `SecurityPolicyConfig`.
- `src/utils/security.ts`: Funciones de hashing con salt, verificación de contraseñas y PINs, validación de unicidad.
- `src/services/userService.ts`: Módulo de gestión CRUD de cuentas de usuario, sesión activa y persistencia local protegida.
- `src/hooks/useSecurityRole.ts`: Hook de control de sesión activa, temporizador de autobloqueo y eventos de usuario.
- `src/components/AuthModal.tsx`: Rediseño visual del modal de acceso con soporte de PIN rápido y usuario/contraseña.
- `src/components/config/ConfigUsersTab.tsx`: Pestaña de administración de usuarios y política de autenticación (solo admin).
- `src/__tests__/userService.test.ts`: Pruebas unitarias de autenticación, roles y expiración de sesión.

## Ambiguity Log

- [x] ¿Cómo garantizar velocidad máxima en mostrador con operadores rotativos?  
      _Decisión:_ Con el modo Híbrido, el operador solo digita su PIN personal de 4 dígitos y el sistema lo reconoce al instante sin escribir usuario ni contraseña.
- [x] ¿Cómo permitir escalar la aplicación a entornos corporativos o multi-terminal?  
      _Decisión:_ Con un switch configurable por el Admin en `ConfigModal` para apagar el modo PIN y forzar usuario + contraseña estándar.

## Completion Map

# generated: 2026-10-17T10:00:00Z

# Tarea 1: Modelado de tipos AppUser, AuthPolicy y sesión en src/types.ts|BR-AUTH-001,BR-AUTH-002|coder-agent|✅

# Tarea 2: Servicio desacoplado userService.ts (CRUD usuarios, hashing, persistencia app_users_v1)|BR-AUTH-001,BR-AUTH-003,BR-AUTH-005|coder-agent|✅

# Tarea 3: Rediseño de AuthModal.tsx con soporte dual (PIN rápido vs Usuario/Password) y detección de rol|AC-AUTH-002,AC-AUTH-003,AC-AUTH-005|coder-agent|✅

# Tarea 4: Hook de autobloqueo mejorado useSecurityRole.ts y vinculación con username en logs|BR-AUTH-004,BR-AUTH-006,AC-AUTH-004|coder-agent|✅

# Tarea 5: Pestaña visual de Gestión de Usuarios y Políticas en ConfigModal|AC-AUTH-001|coder-agent|✅

# Tarea 6: Suite de pruebas automatizadas src/**tests**/userService.test.ts|AC-AUTH-006|tester-agent|✅
