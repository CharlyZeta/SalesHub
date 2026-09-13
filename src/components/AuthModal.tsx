import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ShieldAlert, ShieldCheck, UserCheck, Eye, EyeOff, Server, Timer } from 'lucide-react';
import { SecurityConfig, UserRole } from '../types';
import { addSystemLog } from '../utils/logger';
import { verifyPin, authLockWaitMs } from '../utils/security';

// --- H1: bloqueo progresivo ante intentos fallidos de PIN --------------------
const LOCKOUT_KEY = 'saleshub_auth_lockout_v1';

interface LockoutState {
  count: number;        // intentos fallidos acumulados
  lockedUntil: number;  // epoch ms hasta el cual el login queda bloqueado
}

const loadLockout = (): LockoutState => {
  try {
    const raw = sessionStorage.getItem(LOCKOUT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { count: Number(p.count) || 0, lockedUntil: Number(p.lockedUntil) || 0 };
    }
  } catch (_) {
    // sessionStorage no disponible o dato corrupto: comenzar de cero
  }
  return { count: 0, lockedUntil: 0 };
};

const persistLockout = (state: LockoutState) => {
  try {
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
  } catch (_) {
    // sin persistencia entre recargas, el bloqueo sigue activo en memoria
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
  securityConfig: SecurityConfig;
  isInitialLock?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onUnlock,
  securityConfig
}) => {
  const [pinInput, setPinInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('OPERADOR');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // H1: estado de bloqueo progresivo (persistido en sessionStorage)
  const [lockState, setLockState] = useState<LockoutState>(loadLockout);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const lockRemainingSec = Math.max(0, Math.ceil((lockState.lockedUntil - nowTs) / 1000));

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

  const handleAttemptUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (lockRemainingSec > 0) {
      setErrorMsg(`Demasiados intentos fallidos. Reintentá en ${lockRemainingSec} segundos.`);
      return;
    }
    if (isVerifying) return;

    setIsVerifying(true);
    try {
      const storedPin = securityConfig.pinAcceso || '1234';
      // Legacy plaintext PINs (pre-hash) are verified directly; hashed ones
      // are compared via verifyPin, que acepta hashes actuales y legacy.
      const storedTrim = storedPin.trim();
      const storedIsHashed = /^[a-f0-9]{64}$/i.test(storedTrim);

      const matches = storedIsHashed
        ? await verifyPin(pinInput, storedTrim)
        : pinInput.trim() === storedTrim;

      if (matches) {
        clearLockout();
        setLockState({ count: 0, lockedUntil: 0 });
        setNowTs(Date.now());
        addSystemLog('INFO', 'Seguridad', `Autenticación exitosa como ${selectedRole}`);
        onUnlock(selectedRole);
        setPinInput('');
      } else {
        const nextCount = lockState.count + 1;
        const waitMs = authLockWaitMs(nextCount);
        const nextState: LockoutState = { count: nextCount, lockedUntil: Date.now() + waitMs };
        persistLockout(nextState);
        setLockState(nextState);
        setNowTs(Date.now());

        if (waitMs > 0) {
          addSystemLog('WARN', 'Seguridad', `Bloqueo temporal activado por intentos fallidos (${waitMs / 1000}s)`, { intentos: nextCount });
          setErrorMsg(`PIN incorrecto. Demasiados intentos: la app se bloquea por ${waitMs / 1000} segundos.`);
        } else {
          addSystemLog('WARN', 'Seguridad', `Intento fallido de autenticación (${selectedRole})`, { intento: pinInput.length });
          setErrorMsg('PIN / Clave incorrecta');
        }
      }
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
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Acceso Protegido</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SalesHub • Sistema de Gestión Comercial
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
            <Server className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Subdominio VPS / Entorno Seguro</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAttemptUnlock} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Role selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
              Seleccione el Perfil de Usuario:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setSelectedRole('OPERADOR'); setErrorMsg(''); }}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  selectedRole === 'OPERADOR'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>Operador</span>
                  <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Ventas, presupuestos y remitos diarios.
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('ADMIN'); setErrorMsg(''); }}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  selectedRole === 'ADMIN'
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-600 dark:border-purple-500 text-purple-900 dark:text-purple-100 ring-2 ring-purple-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>Administrador</span>
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Acceso total, configuración API y logs.
                </span>
              </button>
            </div>
          </div>

          {/* PIN input — required for both roles */}
          <div className="space-y-1.5 pt-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Clave / PIN de acceso:
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="Ingrese PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 focus:bg-white dark:focus:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2.5 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              💡 El PIN por defecto es <strong className="font-mono text-slate-700 dark:text-slate-200">1234</strong>. Puede cambiarlo en Configuración.
              Tras 3 intentos fallidos el acceso se bloquea temporalmente.
            </p>
          </div>

          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-blue-900 dark:text-blue-200 text-[11px]">
            ℹ️ Como <strong>Operador</strong> podrá registrar ventas, generar presupuestos y crear remitos. La edición de credenciales de WooCommerce y borrado de logs están reservadas para Administradores.
          </div>

          {lockRemainingSec > 0 ? (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 p-2.5 rounded-lg flex items-center gap-2 text-xs font-medium">
              <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Bloqueo temporal por seguridad. Reintentá en <strong className="font-mono">{lockRemainingSec} segundos</strong>.</span>
            </div>
          ) : errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-2.5 rounded-lg flex items-center gap-2 text-xs font-medium animate-shake">
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isVerifying || lockRemainingSec > 0}
            className={`w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              selectedRole === 'ADMIN'
                ? 'bg-purple-600 hover:bg-purple-700 active:scale-98'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>
              {isVerifying
                ? 'Verificando...'
                : lockRemainingSec > 0
                  ? `Bloqueado - reintentá en ${lockRemainingSec}s`
                  : `Ingresar al Sistema (${selectedRole})`}
            </span>
          </button>
        </form>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Protección SSL/TLS • VPS Subdominio E-commerce
        </div>

      </div>
    </div>
  );
};
