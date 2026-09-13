import React, { type Dispatch, type SetStateAction } from 'react';
import { Lock, KeyRound, Server, AlertCircle } from 'lucide-react';
import { SecurityConfig } from '../types';

export interface ConfigSecurityTabProps {
  secConfig: SecurityConfig;
  setSecConfig: Dispatch<SetStateAction<SecurityConfig>>;
  pinChangeInput: string;
  setPinChangeInput: (value: string) => void;
  /** Hash del PIN predeterminado "1234", para detectar si sigue en uso (H1). */
  defaultPinHash: string;
}

/**
 * Pestaña "Seguridad & PIN" del modal de configuración: control de acceso por
 * PIN, auto-bloqueo por inactividad, restricciones de rol del operador y
 * recomendaciones de despliegue en VPS.
 */
export const ConfigSecurityTab: React.FC<ConfigSecurityTabProps> = ({
  secConfig,
  setSecConfig,
  pinChangeInput,
  setPinChangeInput,
  defaultPinHash,
}) => {
  const storedPinIsDefault =
    secConfig.pinAcceso?.trim() === '1234' ||
    (defaultPinHash && secConfig.pinAcceso === defaultPinHash);

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

        {secConfig.seguridadHabilitada && storedPinIsDefault && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 text-amber-800 dark:text-amber-200 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>PIN predeterminado sin cambiar.</strong> Estás usando «1234». No se permite activar el control de acceso con el PIN
              predeterminado: ingresá un PIN nuevo en el campo de abajo antes de habilitar la seguridad.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Cambiar PIN de Acceso (4 dígitos)
            </label>
            <input
              type="password"
              maxLength={4}
              value={pinChangeInput}
              onChange={(e) => setPinChangeInput(e.target.value.replace(/\D/g, ''))}
              placeholder="**** (Dejar vacío para no cambiar)"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-950 dark:text-slate-50 focus:outline-none focus:border-purple-500 shadow-2xs font-mono font-bold"
            />
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
          Para desplegar en <strong className="text-white font-mono">gestion.miempresa.com.ar</strong> en el mismo VPS junto a la tienda WooCommerce:
        </p>

        <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300 font-sans">
          <li><strong>Opción 1 (Nginx Basic Auth):</strong> Proteger el subdominio con contraseña HTTP Nginx (<code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">htpasswd</code>) antes de cargar la app.</li>
          <li><strong>Opción 2 (Certificado SSL & Headers):</strong> Certbot Let's Encrypt para HTTPS + Headers HSTS, <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">X-Frame-Options: SAMEORIGIN</code> y CORS restrictivo.</li>
          <li><strong>Opción 3 (Filtro por IP):</strong> Limitar el acceso en Nginx a las direcciones IP del local/oficina de la empresa.</li>
        </ul>
      </div>
    </div>
  );
};

export default ConfigSecurityTab;
