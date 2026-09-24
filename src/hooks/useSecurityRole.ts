import type React from 'react';
import { useState, useEffect } from 'react';
import { UserRole, SecurityConfig } from '../types';
import { addSystemLog } from '../utils/logger';

export interface UseSecurityRoleReturn {
  currentRole: UserRole;
  isAuthLocked: boolean;
  handleUnlockRole: (role: UserRole) => void;
  handleLockApp: () => void;
  setIsAuthLocked: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSecurityRole(securityConfig?: SecurityConfig): UseSecurityRoleReturn {
  const [currentRole, setCurrentRole] = useState<UserRole>('OPERADOR');
  const [isAuthLocked, setIsAuthLocked] = useState<boolean>(false);

  // Inicializar bloqueado si la seguridad está habilitada
  useEffect(() => {
    if (securityConfig?.seguridadHabilitada) {
      setIsAuthLocked(true);
      addSystemLog('INFO', 'Seguridad', 'Sesión iniciada bloqueada: se requiere PIN de acceso');
    }
  }, [securityConfig?.seguridadHabilitada]);

  // Temporizador de inactividad
  useEffect(() => {
    if (
      !securityConfig ||
      !securityConfig.seguridadHabilitada ||
      !securityConfig.tiempoInactividadMinutos ||
      securityConfig.tiempoInactividadMinutos <= 0
    ) {
      return;
    }

    const timeoutMs = securityConfig.tiempoInactividadMinutos * 60 * 1000;
    let timer: NodeJS.Timeout | undefined;

    const scheduleLock = () => {
      clearTimeout(timer);
      if (isAuthLocked || document.hidden) return;
      timer = setTimeout(() => {
        setIsAuthLocked(true);
        addSystemLog(
          'WARN',
          'Seguridad',
          `Bloqueo automático activado por inactividad (${securityConfig.tiempoInactividadMinutos} min)`
        );
      }, timeoutMs);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timer);
      } else {
        scheduleLock();
      }
    };

    window.addEventListener('mousemove', scheduleLock);
    window.addEventListener('keydown', scheduleLock);
    window.addEventListener('click', scheduleLock);
    window.addEventListener('focus', scheduleLock);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    scheduleLock();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', scheduleLock);
      window.removeEventListener('keydown', scheduleLock);
      window.removeEventListener('click', scheduleLock);
      window.removeEventListener('focus', scheduleLock);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [securityConfig, isAuthLocked]);

  const handleUnlockRole = (role: UserRole) => {
    setCurrentRole(role);
    setIsAuthLocked(false);
  };

  const handleLockApp = () => {
    setIsAuthLocked(true);
    addSystemLog('INFO', 'Seguridad', 'Sesión bloqueada manualmente por el usuario');
  };

  return {
    currentRole,
    isAuthLocked,
    handleUnlockRole,
    handleLockApp,
    setIsAuthLocked
  };
}
