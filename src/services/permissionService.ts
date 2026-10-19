import { PermissionLevel, RolePermissions, UserRole } from '../types';
import { TOOL_REGISTRY, getDefaultOperadorPermissions, getDefaultAdminPermissions } from '../config/toolRegistry';
import { addSystemLog } from '../utils/logger';

export const PERMISSIONS_STORAGE_KEY = 'app_rbac_permissions_v1';

/**
 * Lee la matriz de permisos configurada desde localStorage.
 * Combina con el Tool Registry para asegurar que herramientas nuevas agregadas
 * al código tengan permisos por defecto sin romper configuraciones preexistentes.
 */
export function getRolePermissions(): RolePermissions {
  let stored: RolePermissions | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      if (raw) {
        stored = JSON.parse(raw);
      }
    }
  } catch (err) {
    console.error('Error al leer permisos de localStorage:', err);
  }

  const defaultOperador = getDefaultOperadorPermissions();
  const defaultAdmin = getDefaultAdminPermissions();

  const operadorPermissions = {
    ...defaultOperador,
    ...(stored?.OPERADOR || {}),
  };

  const adminPermissions = {
    ...defaultAdmin,
    // Admin siempre full
  };

  return {
    OPERADOR: operadorPermissions,
    ADMIN: adminPermissions,
  };
}

/**
 * Persiste la matriz de permisos de roles en localStorage.
 */
export function saveRolePermissions(permissions: RolePermissions): void {
  try {
    // Asegurar que ADMIN nunca pierda full
    const safePermissions: RolePermissions = {
      ...permissions,
      ADMIN: getDefaultAdminPermissions(),
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(safePermissions));
    }
    addSystemLog('INFO', 'Permisos', 'Matriz de permisos de roles actualizada');
  } catch (err) {
    console.error('Error al guardar permisos en localStorage:', err);
  }
}

/**
 * Resuelve el nivel de permiso de un rol para una herramienta dada.
 * - ADMIN siempre tiene 'full' (BR-RBAC-001).
 * - Para otros roles, busca en la matriz configurada o usa el default del registro.
 */
export function resolveUserPermission(role: UserRole, toolId: string): PermissionLevel {
  if (role === 'ADMIN') {
    return 'full';
  }

  const permissions = getRolePermissions();
  const roleMap = permissions[role] || permissions.OPERADOR;

  if (roleMap && roleMap[toolId]) {
    return roleMap[toolId];
  }

  const toolDef = TOOL_REGISTRY.find((t) => t.id === toolId);
  return toolDef ? toolDef.defaultOperador : 'none';
}

/**
 * Helper para verificar si un rol puede al menos ver o consultar una herramienta.
 */
export function canViewTool(role: UserRole, toolId: string): boolean {
  const level = resolveUserPermission(role, toolId);
  return level === 'read' || level === 'full';
}

/**
 * Helper para verificar si un rol tiene permiso de escritura/modificación total en una herramienta.
 */
export function canModifyTool(role: UserRole, toolId: string): boolean {
  return resolveUserPermission(role, toolId) === 'full';
}
