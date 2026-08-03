import React, { useState, useEffect } from 'react';
import { X, Terminal, Trash2, Download, Filter, Search, RefreshCw, AlertCircle, Info, AlertTriangle, ShieldCheck, Database, ShoppingBag, FileText, CheckCircle2 } from 'lucide-react';
import { LogEntry, LogLevel, getSystemLogs, clearSystemLogs, filterSystemLogs, exportLogsJSON, exportLogsCSV } from '../utils/logger';
import { formatDate } from '../utils/formatters';

import { UserRole } from '../types';

interface SystemLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: UserRole;
}

export const SystemLogsModal: React.FC<SystemLogsModalProps> = ({ isOpen, onClose, currentRole = 'OPERADOR' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);
  const [restrictionMsg, setRestrictionMsg] = useState<string | null>(null);

  const loadLogs = () => {
    setLogs(getSystemLogs());
  };

  useEffect(() => {
    loadLogs();

    const handleLogAdded = () => loadLogs();
    const handleLogCleared = () => {
      setLogs([]);
      setSelectedLog(null);
    };

    window.addEventListener('app-system-log-added', handleLogAdded);
    window.addEventListener('app-system-log-cleared', handleLogCleared);

    return () => {
      window.removeEventListener('app-system-log-added', handleLogAdded);
      window.removeEventListener('app-system-log-cleared', handleLogCleared);
    };
  }, []);

  if (!isOpen) return null;

  const handleClearRequest = () => {
    if (currentRole !== 'ADMIN') {
      setRestrictionMsg('🔒 Restricción de Seguridad: Solamente los usuarios con perfil de ADMINISTRADOR pueden purgar los logs de auditoría.');
      return;
    }
    setRestrictionMsg(null);
    setClearConfirmOpen(true);
  };

  const handleConfirmClear = () => {
    clearSystemLogs();
    setClearConfirmOpen(false);
    setRestrictionMsg(null);
  };

  const handleDownloadJSON = () => {
    const jsonStr = exportLogsJSON(filtered);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-sistema-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const csvStr = exportLogsCSV(filtered);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-sistema-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filterSystemLogs(logs, {
    level: levelFilter,
    category: categoryFilter,
    search: searchQuery
  });

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'ERROR':
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> ERROR</span>;
      case 'WARN':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> WARN</span>;
      case 'API':
      case 'SYNC':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><Database className="w-3 h-3" /> {level}</span>;
      case 'SALE':
      case 'BUDGET':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {level}</span>;
      default:
        return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><Info className="w-3 h-3" /> INFO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-100 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-400 p-2 rounded-lg border border-cyan-200 dark:border-cyan-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Logs y Auditoría del Sistema
                <span className="text-xs bg-slate-200 dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono">
                  {filtered.length} registros
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Historial completo de eventos, llamadas API a WooCommerce, registros de ventas, errores y sincronizaciones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Actualizar Logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Level Selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">Nivel:</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Todos los niveles</option>
                <option value="INFO" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">INFO</option>
                <option value="WARN" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">WARN</option>
                <option value="ERROR" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ERROR</option>
                <option value="SYNC" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">SYNC</option>
                <option value="API" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">API</option>
                <option value="SALE" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">SALE</option>
                <option value="BUDGET" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">BUDGET</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar en logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 w-48 sm:w-64"
              />
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Exportar JSON</span>
            </button>

            <button
              onClick={handleClearRequest}
              className="bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar Logs</span>
            </button>
          </div>

        </div>

        {/* Restriction / Status Message */}
        {restrictionMsg && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 px-5 py-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-amber-800 dark:text-amber-300">{restrictionMsg}</span>
            <button
              onClick={() => setRestrictionMsg(null)}
              className="ml-auto text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-1 rounded transition-colors cursor-pointer"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body Content - Dual Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden flex-1">
          
          {/* Left: Log Entries Table */}
          <div className="lg:col-span-7 overflow-y-auto max-h-[55vh] lg:max-h-[65vh] p-2 space-y-1.5">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <Terminal className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
                <p>No se encontraron registros de log con los filtros seleccionados.</p>
              </div>
            ) : (
              filtered.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                    selectedLog?.id === log.id
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-500/50 text-slate-900 dark:text-slate-100'
                      : 'bg-slate-50/60 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getLevelBadge(log.level)}
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{log.category}</span>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                        {new Date(log.timestamp).toLocaleTimeString('es-AR')}
                      </span>
                    </div>

                    <p className="font-sans font-medium text-slate-800 dark:text-slate-200 truncate leading-snug">
                      {log.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Selected Log Inspector */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950 p-4 overflow-y-auto max-h-[40vh] lg:max-h-[65vh] space-y-3 font-mono text-xs">
            {selectedLog ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 font-sans flex items-center gap-1.5">
                    Inspección de Registro
                  </h3>
                  {getLevelBadge(selectedLog.level)}
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500">ID Evento:</span> <span className="text-cyan-600 dark:text-cyan-400 font-bold">{selectedLog.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Marca Temporal:</span> {new Date(selectedLog.timestamp).toLocaleString('es-AR')}
                  </div>
                  <div>
                    <span className="text-slate-500">Categoría:</span> <span className="text-purple-600 dark:text-purple-400 font-bold">{selectedLog.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Mensaje:</span>
                    <p className="font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded mt-1">
                      {selectedLog.message}
                    </p>
                  </div>
                </div>

                {selectedLog.details && (
                  <div className="space-y-1 pt-2">
                    <span className="text-slate-500 text-[11px]">Detalles Payload (JSON):</span>
                    <pre className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded text-[10px] text-emerald-700 dark:text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                      {typeof selectedLog.details === 'object'
                        ? JSON.stringify(selectedLog.details, null, 2)
                        : selectedLog.details}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-6 text-center space-y-2 font-sans">
                <Terminal className="w-10 h-10 text-slate-400 dark:text-slate-700" />
                <p className="text-xs">Selecciona un registro de la lista para ver los detalles e inspección técnica completas.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Confirm Clear Dialog */}
      {clearConfirmOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/30 px-5 py-3.5 flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 p-2 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Purgar Logs de Auditoría</h3>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">Esta acción es irreversible</p>
              </div>
              <button
                onClick={() => setClearConfirmOpen(false)}
                className="ml-auto text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Se eliminarán de forma permanente <strong>todos los registros de auditoría</strong> almacenados en este dispositivo
                (<span className="font-mono text-xs">{filtered.length} visibles</span>). Esta operación no se puede deshacer.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setClearConfirmOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmClear}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sí, purgar todo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
