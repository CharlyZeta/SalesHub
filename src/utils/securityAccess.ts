import { UserRole } from '../types';

/**
 * Decide si el usuario de la sesión activa puede administrar seguridad
 * (pestañas "Usuarios & Sesión" y "Permisos & Herramientas").
 *
 * Reglas (FIX-AUTH-003 / BR-AUTH-007, BR-AUTH-008):
 * - Con el control de acceso DESACTIVADO no hay autenticación: no tiene sentido
 *   restringir la administración por rol, y además bloquearía la creación del
 *   primer usuario en una instalación nueva.
 * - Con el control de acceso ACTIVADO solo un ADMIN administra seguridad.
 *
 * El rol SIEMPRE proviene de la sesión autenticada (`useSecurityRole`); jamás de
 * `config.seguridad` (se eliminaron `rolActual` y `usuarioActivo` del tipo porque
 * nunca se escribían y hacían que el gate fallara en silencio).
 */
export function canManageSecurity(role: UserRole | undefined, seguridadHabilitada: boolean): boolean {
  if (!seguridadHabilitada) return true;
  return role === 'ADMIN';
}

export interface AdminCredencialInput {
  /** true si la contraseña sigue siendo la predeterminada del sistema. */
  passwordEsDefault: boolean;
  /** true si el usuario tiene PIN rápido y ese PIN sigue siendo el predeterminado. */
  pinEsDefault: boolean;
}

/**
 * Indica si existe al menos un administrador con credenciales propias, condición
 * para poder habilitar el control de acceso (reemplaza el viejo guard basado en
 * el PIN legado `config.seguridad.pinAcceso`, que ya no otorga acceso).
 */
export function hayAdminConCredencialesSeguras(admins: AdminCredencialInput[]): boolean {
  return admins.some((a) => !a.passwordEsDefault && !a.pinEsDefault);
}
