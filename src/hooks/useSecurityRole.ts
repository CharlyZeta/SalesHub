import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { UserRole, SecurityConfig, AppUser } from '../types';
import { addSystemLog } from '../utils/logger';
import { getActiveSessionUser, setActiveSessionUser } from '../services/userService';

export interface UseSecurityRoleReturn {
  currentRole: UserRole;
  currentUser: AppUser | null;
  isAuthLocked: boolean;
  handleUnlockRole: (role: UserRole) => void;
  handleUnlockSession: (user: AppUser) => void;
  handleLockApp: () => void;
  handleLogout: () => void;
  setIsAuthLocked: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSecurityRole(securityConfig?: SecurityConfig): UseSecurityRoleReturn {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getActiveSessionUser());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => currentUser?.rol || 'OPERADOR');
  const [isAuthLocked, setIsAuthLocked] = useState<boolean>(() => {
    // Si la seguridad está habilitada, inicia bloqueado a menos que esté desactivada
    return Boolean(securityConfig?.seguridadHabilitada);
  });

  // Si cambia la configuración de seguridad y se activa
  useEffect(() => {
    if (securityConfig?.seguridadHabilitada && !currentUser) {
      setIsAuthLocked(true);
      addSystemLog('INFO', 'Seguridad', 'Sesión bloqueada: se requiere autenticación de usuario');
    }
  }, [securityConfig?.seguridadHabilitada, currentUser]);

  const handleLockApp = useCallback(() => {
    setIsAuthLocked(true);
    addSystemLog('INFO', 'Seguridad', `Sesión bloqueada manualmente (${currentUser?.username || currentRole})`);
  }, [currentUser, currentRole]);

  const handleLogout = useCallback(() => {
    setActiveSessionUser(null);
    setCurrentUser(null);
    setCurrentRole('OPERADOR');
    setIsAuthLocked(true);
    addSystemLog('INFO', 'Seguridad', 'Cierre de sesión de usuario');
  }, []);

  const handleUnlockSession = useCallback((user: AppUser) => {
    setCurrentUser(user);
    setCurrentRole(user.rol);
    setActiveSessionUser(user);
    setIsAuthLocked(false);
  }, []);

  const handleUnlockRole = useCallback((role: UserRole) => {
    setCurrentRole(role);
    setIsAuthLocked(false);
  }, []);

  // Temporizador de auto-bloqueo por inactividad
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

    const events = ['mousemove', 'keydown', 'click', 'focus', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, scheduleLock, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    scheduleLock();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, scheduleLock));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [securityConfig, isAuthLocked]);

  return {
    currentRole,
    currentUser,
    isAuthLocked,
    handleUnlockRole,
    handleUnlockSession,
    handleLockApp,
    handleLogout,
    setIsAuthLocked,
  };
}
