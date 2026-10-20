import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ShieldAlert, User, Eye, EyeOff, Server, Timer, ShieldCheck } from 'lucide-react';
import { SecurityConfig, UserRole, AppUser, AuthMode } from '../types';
import { addSystemLog } from '../utils/logger';
import { authLockWaitMs } from '../utils/security';
import { authenticateWithPin, authenticateWithPassword, ensureDefaultAdminExists } from '../services/userService';

const LOCKOUT_KEY = 'saleshub_auth_lockout_v1';

interface LockoutState {
  count: number;
  lockedUntil: number;
}

const loadLockout = (): LockoutState => {
  try {
    const raw = sessionStorage.getItem(LOCKOUT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { count: Number(p.count) || 0, lockedUntil: Number(p.lockedUntil) || 0 };
    }
  } catch (_) {
    // sessionStorage no disponible
  }
  return { count: 0, lockedUntil: 0 };
};

const persistLockout = (state: LockoutState) => {
  try {
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
  } catch (_) {
    // fallback
  }
};

const clearLockout = () => {
  try {
    sessionStorage.removeItem(LOCKOUT_KEY);
  } catch (_) {
    // ignore
  }
};

interface AuthModalProps {
  isOpen: boolean;
  onUnlock: (role: UserRole) => void;
  onUnlockSession?: (user: AppUser) => void;
  securityConfig: SecurityConfig;
  isInitialLock?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onUnlock, onUnlockSession, securityConfig }) => {
  const authMode: AuthMode = securityConfig.modoAutenticacion || 'hibrido_pin_o_password';

  // Si el modo es solo_password, arrancar en formulario de password; si es híbrido o solo_pin, arrancar en PIN
  const [usePasswordForm, setUsePasswordForm] = useState<boolean>(() => authMode === 'solo_password');

  // Inputs
  const [pinInput, setPinInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Bloqueo progresivo ante intentos fallidos
  const [lockState, setLockState] = useState<LockoutState>(loadLockout);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const lockRemainingSec = Math.max(0, Math.ceil((lockState.lockedUntil - nowTs) / 1000));

  // Inicializar admin predeterminado si es la primera vez
  useEffect(() => {
    if (isOpen) {
      ensureDefaultAdminExists().catch((err) => console.error('Error al inicializar admin:', err));
    }
  }, [isOpen]);

  // Si cambia el modo de autenticación configurado
  useEffect(() => {
    if (authMode === 'solo_password') {
      setUsePasswordForm(true);
    } else if (authMode === 'solo_pin') {
      setUsePasswordForm(false);
    }
  }, [authMode]);

  // Cuenta regresiva mientras el login esté bloqueado
  useEffect(() => {
    if (!isOpen || lockState.lockedUntil <= Date.now()) return;
    const id = window.setInterval(() => {
      setNowTs(Date.now());
      if (Date.now() >= lockState.lockedUntil) {
        window.clearInterval(id);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [isOpen, lockState.lockedUntil]);

  if (!isOpen) return null;

  const handleSuccessUnlock = (user: AppUser) => {
    clearLockout();
    setLockState({ count: 0, lockedUntil: 0 });
    setNowTs(Date.now());
    addSystemLog('INFO', 'Seguridad', `Autenticación exitosa: ${user.username} (${user.rol})`);

    if (onUnlockSession) {
      onUnlockSession(user);
    }
    onUnlock(user.rol);

    setPinInput('');
    setPasswordInput('');
    setErrorMsg('');
  };

  const handleFailedAttempt = (contextDesc: string) => {
    const nextCount = lockState.count + 1;
    const waitMs = authLockWaitMs(nextCount);
    const nextState: LockoutState = { count: nextCount, lockedUntil: Date.now() + waitMs };
    persistLockout(nextState);
    setLockState(nextState);
    setNowTs(Date.now());

    if (waitMs > 0) {
      addSystemLog('WARN', 'Seguridad', `Bloqueo temporal por intentos fallidos (${waitMs / 1000}s)`, {
        intentos: nextCount,
      });
      setErrorMsg(`Demasiados intentos fallidos. Aplicación bloqueada temporalmente por ${waitMs / 1000} segundos.`);
    } else {
      addSystemLog('WARN', 'Seguridad', `Intento fallido de autenticación (${contextDesc})`);
      setErrorMsg('Credenciales incorrectas. Verifique el PIN o Usuario/Contraseña.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (lockRemainingSec > 0) {
      setErrorMsg(`Acceso bloqueado temporalmente. Reintenta en ${lockRemainingSec} segundos.`);
      return;
    }
    if (isVerifying) return;

    setIsVerifying(true);
    try {
      if (usePasswordForm) {
        // Autenticación por Usuario y Contraseña
        if (!usernameInput.trim()) {
          setErrorMsg('Ingrese su nombre de usuario');
          return;
        }
        if (!passwordInput) {
          setErrorMsg('Ingrese su contraseña');
          return;
        }

        const authenticatedUser = await authenticateWithPassword(usernameInput, passwordInput);
        if (authenticatedUser) {
          handleSuccessUnlock(authenticatedUser);
        } else {
          handleFailedAttempt(`Usuario ${usernameInput}`);
        }
      } else {
        // Autenticación por PIN Rápido
        const cleanPin = pinInput.trim();
        if (!cleanPin) {
          setErrorMsg('Ingrese su PIN de acceso');
          return;
        }

        // 1) Intentar autenticar contra usuarios activos con PIN
        const userByPin = await authenticateWithPin(cleanPin);
        if (userByPin) {
          handleSuccessUnlock(userByPin);
          return;
        }

        // 2) Fallback retrocompatible con securityConfig.pinAcceso legado
        // BORRADO: El PIN legado compartido otorga ADMIN sin validación unívoca.
        // Si había un usuario legacy configurado, la migración debe forzarse a crear
        // un admin real mediante FEAT-AUTH-002. Nunca se concede ADMIN desde un PIN
        // compartido.
        // const legacyPin = securityConfig.pinAcceso?.trim();
        // if (legacyPin) {
        //   const isHashed = /^[a-f0-9]{64}$/i.test(legacyPin);
        //   const legacyMatch = isHashed ? await verifyPin(cleanPin, legacyPin) : cleanPin === legacyPin;
        //   if (legacyMatch) {
        //     // Usuario sintético para fallback legacy
        //     const legacyUser: AppUser = {
        //       id: 'USR-LEGACY',
        //       username: 'admin',
        //       nombre: 'Administrador (Legacy)',
        //       rol: 'ADMIN',
        //       passwordHash: '',
        //       activo: true,
        //       creadoEn: new Date().toISOString(),
        //     };
        //     handleSuccessUnlock(legacyUser);
        //     return;
        //   }
        // }

        handleFailedAttempt('PIN Rápido');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error durante la verificación de credenciales');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 text-center relative border-b border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Acceso al Sistema</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SalesHub • Control de Acceso y Terminal de Ventas
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
            <Server className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Puesto de Atención • Sesión Protegida</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
          {usePasswordForm ? (
            /* Modo Usuario y Contraseña */
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre de Usuario:</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ej: admin o tu usuario"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contraseña:</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Modo PIN Rápido de Mostrador */
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                PIN Personal de Acceso Rápido:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingrese su PIN de 4 dígitos"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2.5 font-mono text-center tracking-widest text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                El sistema detectará automáticamente tu usuario y rol al ingresar tu PIN.
              </p>
            </div>
          )}

          {/* Selector de modo si está configurado en Híbrido */}
          {authMode === 'hibrido_pin_o_password' && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setUsePasswordForm(!usePasswordForm);
                  setErrorMsg('');
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium inline-flex items-center gap-1"
              >
                <span>{usePasswordForm ? '← Ingresar con PIN Rápido' : 'Ingresar con Usuario y Contraseña →'}</span>
              </button>
            </div>
          )}

          {/* Alertas de bloqueo o error */}
          {lockRemainingSec > 0 ? (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 p-2.5 rounded-lg flex items-center gap-2 text-xs font-medium">
              <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Bloqueo temporal por seguridad. Reintentá en{' '}
                <strong className="font-mono">{lockRemainingSec} segundos</strong>.
              </span>
            </div>
          ) : (
            errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-2.5 rounded-lg flex items-center gap-2 text-xs font-medium animate-shake">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isVerifying || lockRemainingSec > 0}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-98"
          >
            <KeyRound className="w-4 h-4" />
            <span>
              {isVerifying
                ? 'Verificando...'
                : lockRemainingSec > 0
                  ? `Bloqueado (${lockRemainingSec}s)`
                  : usePasswordForm
                    ? 'Iniciar Sesión'
                    : 'Ingresar con PIN'}
            </span>
          </button>
        </form>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-3 text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Autenticación por Hash SHA-256 • Sesión Local Protegida</span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
