import { useState, useEffect, useCallback } from 'react';
import { PermissionLevel, UserRole } from '../types';
import { resolveUserPermission } from '../services/permissionService';

export interface UsePermissionsReturn {
  canAccess: (toolId: string) => boolean;
  canWrite: (toolId: string) => boolean;
  isReadOnly: (toolId: string) => boolean;
  getLevel: (toolId: string) => PermissionLevel;
  reloadPermissions: () => void;
}

/**
 * Hook para evaluar permisos en componentes según el rol del usuario activo.
 */
export function usePermissions(currentRole: UserRole = 'OPERADOR'): UsePermissionsReturn {
  const [version, setVersion] = useState(0);

  const reloadPermissions = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  // Escuchar cambios de storage por si otra pestaña o modal actualiza permisos
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_rbac_permissions_v1') {
        reloadPermissions();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [reloadPermissions]);

  const getLevel = useCallback(
    (toolId: string): PermissionLevel => {
      // Version se incluye para forzar re-evaluación al cambiar
      void version;
      return resolveUserPermission(currentRole, toolId);
    },
    [currentRole, version]
  );

  const canAccess = useCallback(
    (toolId: string): boolean => {
      const level = getLevel(toolId);
      return level === 'read' || level === 'full';
    },
    [getLevel]
  );

  const canWrite = useCallback(
    (toolId: string): boolean => {
      return getLevel(toolId) === 'full';
    },
    [getLevel]
  );

  const isReadOnly = useCallback(
    (toolId: string): boolean => {
      return getLevel(toolId) === 'read';
    },
    [getLevel]
  );

  return {
    canAccess,
    canWrite,
    isReadOnly,
    getLevel,
    reloadPermissions,
  };
}
