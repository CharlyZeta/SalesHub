import React from 'react';
import { UserRole } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

export interface PermissionGateProps {
  resource: string;
  action?: 'read' | 'write';
  currentRole?: UserRole;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Componente declarativo para ocultar o reemplazar secciones según los permisos del usuario activo.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  resource,
  action = 'read',
  currentRole = 'OPERADOR',
  fallback = null,
  children,
}) => {
  const { canAccess, canWrite } = usePermissions(currentRole as UserRole);

  const hasPermission = action === 'write' ? canWrite(resource) : canAccess(resource);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
