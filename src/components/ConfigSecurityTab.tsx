import React, { type Dispatch, type SetStateAction } from 'react';
import { Lock, KeyRound, Server, Users } from 'lucide-react';
import { SecurityConfig } from '../types';

export interface ConfigSecurityTabProps {
  secConfig: SecurityConfig;
  setSecConfig: Dispatch<SetStateAction<SecurityConfig>>;
  /** Navega a la pestaña "Usuarios & Sesión", dueña real de las credenciales. */
  onGoToUsers: () => void;
  /** false cuando la sesión activa no puede administrar usuarios. */
  puedeGestionarUsuarios: boolean;
}

/**
 * Pestaña "Seguridad & PIN" del modal de configuración: control de acceso por
 * PIN, auto-bloqueo por inactividad, restricciones de rol del operador y
 * recomendaciones de despliegue en VPS.
 */
export const ConfigSecurityTab: React.FC<ConfigSecurityTabProps> = ({
  secConfig,
  setSecConfig,
  onGoToUsers,
  puedeGestionarUsuarios,
}) => {
  return (
    <div className="space-y-4">
      {/* App Lock Toggle & PIN */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
            <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Control de Acceso & Bloqueo por PIN</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={secConfig.seguridadHabilitada}
              onChange={(e) => setSecConfig({ ...secConfig, seguridadHabilitada: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Habilitar PIN</span>
          </label>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 text-blue-800 dark:text-blue-200 text-[11px]">
          <KeyRound className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            <strong>El PIN es personal, no global.</strong> Cada usuario tiene su propio PIN rápido y se administra en
            «Usuarios &amp; Sesión». El PIN único compartido de versiones anteriores ya no otorga acceso.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <button
              type="button"
              onClick={onGoToUsers}
              disabled={!puedeGestionarUsuarios}
              className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Administrar usuarios y PIN</span>
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {puedeGestionarUsuarios
                ? 'Alta de operadores, cambio de contraseña y PIN por usuario.'
                : 'Requiere una sesión de Administrador.'}
            </p>
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Tiempo de Auto-Bloqueo por Inactividad
            </label>
            <select
              value={secConfig.tiempoInactividadMinutos}
              onChange={(e) => setSecConfig({ ...secConfig, tiempoInactividadMinutos: Number(e.target.value) })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 shadow-2xs cursor-pointer font-medium"
            >
              <option value={5}>5 Minutos</option>
              <option value={10}>10 Minutos</option>
              <option value={15}>15 Minutos</option>
              <option value={30}>30 Minutos</option>
              <option value={60}>1 Hora</option>
              <option value={0}>Nunca bloquear (Desactivado)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roles configuration settings */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
          <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Restricciones del Rol de Operador</span>
        </div>

        <div className="space-y-2 pt-1 font-semibold text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={secConfig.modoProduccionVPS}
              onChange={(e) => setSecConfig({ ...secConfig, modoProduccionVPS: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span>Ocultar Consola de Logs e Importador/Exportador a Operadores</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={secConfig.bloquearSincronizacionWooCommerce}
              onChange={(e) => setSecConfig({ ...secConfig, bloquearSincronizacionWooCommerce: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span>Bloquear edición de API Keys WooCommerce a Operadores</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={secConfig.bloquearBorradoLogs}
              onChange={(e) => setSecConfig({ ...secConfig, bloquearBorradoLogs: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span>Bloquear purga de logs de auditoría a Operadores</span>
          </label>
        </div>
      </div>

      {/* VPS Subdomain Deployment Recommendations */}
      <div className="bg-slate-900 dark:bg-slate-950 text-slate-200 rounded-xl p-4 space-y-2 border border-slate-800">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <Server className="w-4 h-4" />
          <span>Opciones Recomendadas para Producción en VPS (Subdominio WooCommerce)</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Para desplegar en <strong className="text-white font-mono">gestion.miempresa.com.ar</strong> en el mismo VPS
          junto a la tienda WooCommerce:
        </p>

        <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300 font-sans">
          <li>
            <strong>Opción 1 (Nginx Basic Auth):</strong> Proteger el subdominio con contraseña HTTP Nginx (
            <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">htpasswd</code>) antes de
            cargar la app.
          </li>
          <li>
            <strong>Opción 2 (Certificado SSL & Headers):</strong> Certbot Let's Encrypt para HTTPS + Headers HSTS,{' '}
            <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">
              X-Frame-Options: SAMEORIGIN
            </code>{' '}
            y CORS restrictivo.
          </li>
          <li>
            <strong>Opción 3 (Filtro por IP):</strong> Limitar el acceso en Nginx a las direcciones IP del local/oficina
            de la empresa.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ConfigSecurityTab;
