import { AppUser, UserRole } from '../types';
import { hashPassword, hashPin, verifyPassword, verifyPin } from '../utils/security';
import { addSystemLog } from '../utils/logger';

export const USERS_STORAGE_KEY = 'app_users_v1';
export const USERS_STORAGE_KEY_CORRUPT = 'app_users_v1_corrupt';
export const ACTIVE_USER_SESSION_KEY = 'saleshub_active_user_v1';
export const ACTIVE_USER_SESSION_KEY_LEGACY = 'saleshub_active_user_legacy_v1';

/** Credenciales iniciales del administrador por defecto (primer arranque). */
export const DEFAULT_ADMIN_CREDENTIALS = '1234';

/**
 * Lee todos los usuarios registrados en localStorage.
 * Si el JSON está corrupto, NO devuelve [] (eso haría que ensureDefaultAdminExists
 * sobrescriba a todos los usuarios): conserva el valor crudo en una clave de
 * respaldo y devuelve [] para que la UI lo reporte.
 */
export function getUsers(): AppUser[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (parseErr) {
          // JSON corrupto: preservar el dato crudo antes de perderlo
          console.error('Error al parsear usuarios de localStorage:', parseErr);
          try {
            localStorage.setItem(USERS_STORAGE_KEY_CORRUPT, raw);
            addSystemLog(
              'ERROR',
              'Usuarios',
              'Almacenamiento de usuarios corrupto: se conservó una copia de respaldo y no se sobreescribió'
            );
          } catch (backupErr) {
            console.error('Error al respaldar usuarios corruptos:', backupErr);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error al leer usuarios de localStorage:', err);
  }
  return [];
}

/**
 * Indica si el almacenamiento de usuarios quedó corrupto (quedó una copia de
 * respaldo en `app_users_v1_corrupt`).
 */
export function hasCorruptedUsers(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      return Boolean(localStorage.getItem(USERS_STORAGE_KEY_CORRUPT));
    }
  } catch (_) {
    // ignore
  }
  return false;
}

/**
 * Persiste el listado de usuarios en localStorage.
 */
export function saveUsers(users: AppUser[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  } catch (err) {
    console.error('Error al guardar usuarios en localStorage:', err);
    addSystemLog('ERROR', 'Usuarios', 'Error al persistir usuarios en almacenamiento');
  }
}

/**
 * Asegura la existencia de al menos un usuario administrador.
 * Si no hay usuarios en el sistema, crea 'admin' con clave inicial y PIN inicial '1234'.
 */
export async function ensureDefaultAdminExists(): Promise<AppUser[]> {
  const existing = getUsers();
  if (existing.length > 0) {
    return existing;
  }

  // Si el almacenamiento estaba corrupto, no sobrescribimos: avisamos y devolvemos vacío.
  // El admin existente (aunque sea corrupto) será manejado por la UI / migración manual.
  if (hasCorruptedUsers()) {
    addSystemLog(
      'WARN',
      'Usuarios',
      'No se pudo crear el admin predeterminado: usuarios anteriores estaban corruptos; consulte / respaldé los datos antes de continuar'
    );
    return [];
  }

  const defaultPasswordHash = await hashPassword(DEFAULT_ADMIN_CREDENTIALS);
  const defaultPinHash = await hashPin(DEFAULT_ADMIN_CREDENTIALS);

  const defaultAdmin: AppUser = {
    id: 'USR-001',
    username: 'admin',
    nombre: 'Administrador Principal',
    rol: 'ADMIN',
    passwordHash: defaultPasswordHash,
    pinHash: defaultPinHash,
    activo: true,
    creadoEn: new Date().toISOString(),
    mustChangeCredentials: true, // Forzar cambio en primer login
  };

  saveUsers([defaultAdmin]);
  addSystemLog(
    'INFO',
    'Seguridad',
    'Usuario administrador predeterminado inicializado (admin) - requiere cambio de credenciales'
  );
  return [defaultAdmin];
}

/**
 * Genera un ID correlativo para un nuevo usuario (USR-001, USR-002, etc.).
 */
export function generateUserId(existing: AppUser[]): string {
  const prefix = 'USR-';
  const nums = existing.map((u) => parseInt(u.id.replace(prefix, ''), 10)).filter((n) => !isNaN(n));
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

export interface CreateUserData {
  username: string;
  nombre: string;
  rol: UserRole;
  passwordPlain: string;
  pinPlain?: string;
}

/**
 * Da de alta un nuevo usuario en el sistema.
 */
export async function createUser(data: CreateUserData): Promise<AppUser> {
  const users = await ensureDefaultAdminExists();
  const cleanUsername = data.username.trim().toLowerCase();

  if (!cleanUsername) {
    throw new Error('El nombre de usuario es obligatorio');
  }
  if (!data.nombre.trim()) {
    throw new Error('El nombre completo es obligatorio');
  }
  if (!data.passwordPlain || data.passwordPlain.trim().length < 4) {
    throw new Error('La contraseña debe tener al menos 4 caracteres');
  }

  // Verificar username único
  const existsUsername = users.some((u) => u.username.toLowerCase() === cleanUsername);
  if (existsUsername) {
    throw new Error(`El usuario "${cleanUsername}" ya existe`);
  }

  // Si tiene PIN rápido, verificar que sea único entre usuarios activos
  let pinHash: string | undefined;
  if (data.pinPlain && data.pinPlain.trim()) {
    const cleanPin = data.pinPlain.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      throw new Error('El PIN rápido debe contener entre 4 y 6 dígitos numéricos');
    }
    for (const u of users) {
      if (u.activo && u.pinHash) {
        const matches = await verifyPin(cleanPin, u.pinHash);
        if (matches) {
          throw new Error('El PIN ingresado ya está en uso por otro usuario. Elige un PIN distinto.');
        }
      }
    }
    pinHash = await hashPin(cleanPin);
  }

  const passwordHash = await hashPassword(data.passwordPlain);
  const newUser: AppUser = {
    id: generateUserId(users),
    username: cleanUsername,
    nombre: data.nombre.trim(),
    rol: data.rol,
    passwordHash,
    pinHash,
    activo: true,
    creadoEn: new Date().toISOString(),
    mustChangeCredentials: true, // Forzar cambio de credenciales en primer inicio de sesión
  };

  const updated = [...users, newUser];
  saveUsers(updated);
  addSystemLog('INFO', 'Usuarios', `Nuevo usuario creado: ${newUser.username} (${newUser.rol})`);
  return newUser;
}

export interface UpdateUserData {
  nombre?: string;
  rol?: UserRole;
  activo?: boolean;
  passwordPlain?: string;
  pinPlain?: string;
}

/**
 * Actualiza los datos o credenciales de un usuario.
 */
export async function updateUser(id: string, updates: UpdateUserData): Promise<AppUser> {
  const users = await ensureDefaultAdminExists();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    throw new Error('Usuario no encontrado');
  }

  const current = users[idx];

  // Regla BR-AUTH-005: Siempre debe quedar al menos un ADMIN activo
  if (current.rol === 'ADMIN' && (updates.rol === 'OPERADOR' || updates.activo === false)) {
    const otherActiveAdmins = users.filter((u) => u.id !== id && u.rol === 'ADMIN' && u.activo);
    if (otherActiveAdmins.length === 0) {
      throw new Error('No es posible degradar o desactivar al único Administrador activo del sistema');
    }
  }

  let newPasswordHash = current.passwordHash;
  if (updates.passwordPlain && updates.passwordPlain.trim()) {
    if (updates.passwordPlain.trim().length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres');
    }
    newPasswordHash = await hashPassword(updates.passwordPlain);
  }

  let newPinHash = current.pinHash;
  if (updates.pinPlain !== undefined) {
    const cleanPin = updates.pinPlain.trim();
    if (cleanPin === '') {
      newPinHash = undefined; // Quitar PIN rápido
    } else {
      if (!/^\d{4,6}$/.test(cleanPin)) {
        throw new Error('El PIN rápido debe contener entre 4 y 6 dígitos numéricos');
      }
      for (const u of users) {
        if (u.id !== id && u.activo && u.pinHash) {
          const matches = await verifyPin(cleanPin, u.pinHash);
          if (matches) {
            throw new Error('El PIN rápido ingresado ya pertenece a otro usuario');
          }
        }
      }
      newPinHash = await hashPin(cleanPin);
    }
  }

  const updatedUser: AppUser = {
    ...current,
    nombre: updates.nombre !== undefined ? updates.nombre.trim() : current.nombre,
    rol: updates.rol !== undefined ? updates.rol : current.rol,
    activo: updates.activo !== undefined ? updates.activo : current.activo,
    passwordHash: newPasswordHash,
    pinHash: newPinHash,
  };

  users[idx] = updatedUser;
  saveUsers(users);
  addSystemLog('INFO', 'Usuarios', `Usuario actualizado: ${updatedUser.username} (${updatedUser.rol})`);
  return updatedUser;
}

/**
 * Elimina un usuario del sistema (no permitido para el último admin).
 */
export async function deleteUser(id: string): Promise<boolean> {
  const users = await ensureDefaultAdminExists();
  const target = users.find((u) => u.id === id);
  if (!target) return false;

  if (target.rol === 'ADMIN') {
    const otherAdmins = users.filter((u) => u.id !== id && u.rol === 'ADMIN' && u.activo);
    if (otherAdmins.length === 0) {
      throw new Error('No se puede eliminar al único Administrador activo');
    }
  }

  const filtered = users.filter((u) => u.id !== id);
  saveUsers(filtered);
  addSystemLog('WARN', 'Usuarios', `Usuario eliminado: ${target.username} (${target.rol})`);
  return true;
}

/**
 * Autentica un usuario mediante su Nombre de Usuario y Contraseña.
 */
export async function authenticateWithPassword(username: string, passwordPlain: string): Promise<AppUser | null> {
  const users = await ensureDefaultAdminExists();
  const cleanUsername = username.trim().toLowerCase();
  const user = users.find((u) => u.username.toLowerCase() === cleanUsername && u.activo);
  if (!user) return null;

  const valid = await verifyPassword(passwordPlain, user.passwordHash);
  if (!valid) return null;

  // Clonamos para no mutar el array original de getUsers()
  const updatedUser: AppUser = {
    ...user,
    ultimoAcceso: new Date().toISOString(),
  };
  // Actualizamos la lista completa en storage (actualiza solo el campo ultimoAcceso)
  const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
  saveUsers(updatedUsers);
  setActiveSessionUser(updatedUser);
  return updatedUser;
}

/**
 * Autentica a un usuario directamente mediante su PIN numérico rápido de 4 a 6 dígitos.
 * Busca unívocamente entre los usuarios activos qué PIN coincide.
 */
export async function authenticateWithPin(pinPlain: string): Promise<AppUser | null> {
  const users = await ensureDefaultAdminExists();
  const cleanPin = pinPlain.trim();
  if (!cleanPin) return null;

  for (const user of users) {
    if (user.activo && user.pinHash) {
      const valid = await verifyPin(cleanPin, user.pinHash);
      if (valid) {
        // Clonamos para no mutar el array original de getUsers()
        const updatedUser: AppUser = {
          ...user,
          ultimoAcceso: new Date().toISOString(),
        };
        // Actualizamos la lista completa en storage
        const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
        saveUsers(updatedUsers);
        setActiveSessionUser(updatedUser);
        return updatedUser;
      }
    }
  }
  return null;
}

/**
 * Obtiene el usuario activo actualmente en la sesión (sessionStorage).
 */
export function getActiveSessionUser(): AppUser | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(ACTIVE_USER_SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.error('Error al leer usuario de sesión:', err);
  }
  return null;
}

/**
 * Persiste o limpia el usuario activo de la sesión.
 */
export function setActiveSessionUser(user: AppUser | null): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (user) {
        sessionStorage.setItem(ACTIVE_USER_SESSION_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(ACTIVE_USER_SESSION_KEY);
      }
    }
  } catch (err) {
    console.error('Error al guardar usuario de sesión:', err);
  }
}
