import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, ShieldCheck, UserCheck, Eye, EyeOff, Server, Globe } from 'lucide-react';
import { SecurityConfig, UserRole } from '../types';
import { addSystemLog } from '../utils/logger';

interface AuthModalProps {
  isOpen: boolean;
  onUnlock: (role: UserRole) => void;
  securityConfig: SecurityConfig;
  isInitialLock?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onUnlock,
  securityConfig,
  isInitialLock = false
}) => {
  const [pinInput, setPinInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('OPERADOR');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAttemptUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // If Operator role is chosen and security is set, operator can enter without PIN or with standard PIN
    if (selectedRole === 'OPERADOR') {
      addSystemLog('INFO', 'Seguridad', 'Acceso iniciado como OPERADOR');
      onUnlock('OPERADOR');
      setPinInput('');
      return;
    }

    // Admin role requires PIN verification
    const correctPin = securityConfig.pinAcceso || '1234';
    if (pinInput.trim() === correctPin.trim()) {
      addSystemLog('INFO', 'Seguridad', 'Autenticación exitosa como ADMINISTRADOR');
      onUnlock('ADMIN');
      setPinInput('');
    } else {
      setErrorMsg('PIN / Clave de Administrador incorrecta');
      addSystemLog('WARN', 'Seguridad', 'Intento fallido de autenticación Administrador', { intento: pinInput.length });
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
            DUAL S.R.L. • Sistema de Gestión Comercial
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

          {/* Admin PIN input if selected */}
          {selectedRole === 'ADMIN' ? (
            <div className="space-y-1.5 pt-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Clave / PIN de Administrador:
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  placeholder="Ingrese PIN (Predeterminado: 1234)"
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
                💡 El PIN de administrador por defecto es <strong className="font-mono text-slate-700 dark:text-slate-200">1234</strong>. Puede cambiarlo en Configuración.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-blue-900 dark:text-blue-200 text-[11px]">
              ℹ️ Como <strong>Operador</strong> podrá registrar ventas, generar presupuestos y crear remitos. La edición de credenciales de WooCommerce y borrado de logs están reservadas para Administradores.
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-2.5 rounded-lg flex items-center gap-2 text-xs font-medium animate-shake">
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            className={`w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
              selectedRole === 'ADMIN'
                ? 'bg-purple-600 hover:bg-purple-700 active:scale-98'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Ingresar al Sistema ({selectedRole})</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Protección SSL/TLS • VPS Subdominio E-commerce • DUAL S.R.L.
        </div>

      </div>
    </div>
  );
};
