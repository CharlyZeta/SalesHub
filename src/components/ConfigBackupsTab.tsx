import React, { type Dispatch, type SetStateAction } from 'react';
import { Database, Cloud, RefreshCw, AlertCircle, Check, Save } from 'lucide-react';
import { BackupConfig } from '../types';
import { BackupItem } from '../utils/backupService';

export interface ConfigBackupsTabProps {
  autoBackup: boolean;
  setAutoBackup: (value: boolean) => void;
  periodicity: BackupConfig['periodicity'];
  setPeriodicity: Dispatch<SetStateAction<BackupConfig['periodicity']>>;
  lastBackupDate?: string;
  lastBackupFilename?: string;
  backups: BackupItem[];
  isLoadingBackups: boolean;
  backupStatus: { type: 'success' | 'error'; message: string } | null;
  onManualBackup: () => void;
  onLoadBackups: () => void;
  onRestore: (item: BackupItem) => void;
  onDelete: (filename: string) => void;
}

/**
 * Pestaña "Copias de Seguridad" del modal de configuración: configuración del
 * backup automático, copia manual y listado/restauración de respaldos.
 */
export const ConfigBackupsTab: React.FC<ConfigBackupsTabProps> = ({
  autoBackup,
  setAutoBackup,
  periodicity,
  setPeriodicity,
  lastBackupDate,
  lastBackupFilename,
  backups,
  isLoadingBackups,
  backupStatus,
  onManualBackup,
  onLoadBackups,
  onRestore,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Configuración de Copias de Seguridad Automáticas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => setAutoBackup(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
              <span>Habilitar copia de seguridad automática</span>
            </label>
          </div>

          {autoBackup && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Periodicidad:</span>
              <select
                value={periodicity}
                onChange={(e) => setPeriodicity(e.target.value as BackupConfig['periodicity'])}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
              >
                <option value="startup">Al iniciar la aplicación</option>
                <option value="daily">Una vez al día (Diario)</option>
                <option value="weekly">Una vez a la semana (Semanal)</option>
                <option value="ops_20">Cada 20 registros de venta</option>
                <option value="ops_50">Cada 50 registros de venta</option>
              </select>
            </div>
          )}
        </div>

        <div className="pt-3 flex flex-wrap items-center justify-between border-t border-slate-200 dark:border-slate-800 gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {lastBackupDate ? (
              <>Último backup: <strong>{new Date(lastBackupDate).toLocaleString()}</strong> ({lastBackupFilename})</>
            ) : (
              'Aún no se han realizado copias de seguridad.'
            )}
          </span>

          <button
            type="button"
            onClick={onManualBackup}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Generar Copia Manual Ahora</span>
          </button>
        </div>

        {backupStatus && (
          <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
            backupStatus.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
          }`}>
            {backupStatus.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-red-500" /> : <Check className="w-4 h-4 shrink-0 text-emerald-500" />}
            <span>{backupStatus.message}</span>
          </div>
        )}
      </div>

      {/* Google Drive alert block */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg flex gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Cloud className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Sincronización en la Nube (Google Drive / OneDrive):</span>
          <p className="mt-0.5 leading-relaxed">
            Las copias marcadas como 💻 Disco se guardan en la carpeta <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-blue-600 dark:text-blue-400">./backups</code> de este proyecto. Si instalas la aplicación oficial de Google Drive en tu computadora y configuras la sincronización de esta carpeta, tus backups locales se subirán a la nube de manera 100% transparente y segura.
          </p>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Copias de Seguridad Disponibles ({backups.length})</span>
          <button
            type="button"
            onClick={onLoadBackups}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-all cursor-pointer text-[10px]"
            title="Actualizar listado"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
          <div className="overflow-y-auto max-h-[200px]">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold select-none sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">Fecha y Hora</th>
                  <th className="p-2.5">Origen</th>
                  <th className="p-2.5">Archivo / ID</th>
                  <th className="p-2.5 text-right">Tamaño</th>
                  <th className="p-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {isLoadingBackups ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 font-sans">Cargando listado...</td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 font-sans">No se encontraron copias de seguridad. Genera una copia manual o activa el guardado automático.</td>
                  </tr>
                ) : (
                  backups.map((item) => (
                    <tr key={`${item.source}-${item.filename}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2 text-slate-600 dark:text-slate-400 font-sans">
                        {new Date(item.date).toLocaleString()}
                      </td>
                      <td className="p-2 font-sans select-none">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.source === 'server'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-sans border border-blue-200 dark:border-blue-900'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-sans border border-emerald-200 dark:border-emerald-900'
                        }`}>
                          {item.source === 'server' ? '💻 Disco' : '🌐 Navegador'}
                        </span>
                      </td>
                      <td className="p-2 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[160px]" title={item.filename}>
                        {item.filename}
                      </td>
                      <td className="p-2 text-right text-slate-500 dark:text-slate-400 font-medium">
                        {(item.size / 1024).toFixed(1)} KB
                      </td>
                      <td className="p-2 text-center font-sans space-x-2">
                        <button
                          type="button"
                          onClick={() => onRestore(item)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline cursor-pointer"
                          title="Restaurar base de datos a esta copia"
                        >
                          Restaurar
                        </button>
                        {item.source === 'indexedDB' && (
                          <button
                            type="button"
                            onClick={() => onDelete(item.filename)}
                            className="text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                            title="Eliminar esta copia local"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigBackupsTab;
