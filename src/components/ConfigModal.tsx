import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  Edit2, 
  Sliders, 
  ShieldCheck, 
  Lock, 
  Server, 
  KeyRound, 
  Globe, 
  FileCode, 
  FileSpreadsheet,
  Database,
  Save,
  Cloud,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { AppConfig, SecurityConfig } from '../types';
import { hashPin } from '../utils/security';
import { BackupItem, listAllBackups, runBackup, restoreBackup, deleteFromIndexedDb } from '../utils/backupService';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onOpenImport?: () => void;
  onRestoreBackup: (state: any) => void;
  fullAppState: any;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenImport,
  onRestoreBackup,
  fullAppState
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'backups'>('general');

  const [canales, setCanales] = useState<string[]>(config.canales || []);
  const [metodosPago, setMetodosPago] = useState<string[]>(config.metodosPago || []);
  const [puntoVenta, setPuntoVenta] = useState<string>(config.puntoVentaPresupuesto || '0001');
  const [ultimoNumero, setUltimoNumero] = useState<number>(config.ultimoNumeroPresupuesto || 311);

  // Security config state
  const defaultSec: SecurityConfig = {
    seguridadHabilitada: true,
    pinAcceso: '1234',
    tiempoInactividadMinutos: 15,
    modoProduccionVPS: true,
    bloquearSincronizacionWooCommerce: true,
    bloquearBorradoLogs: true
  };

  const [secConfig, setSecConfig] = useState<SecurityConfig>(config.seguridad || defaultSec);
  // PIN field starts empty; the stored value is a hash and is never shown.
  const [pinChangeInput, setPinChangeInput] = useState('');

  // Backups config state
  const [autoBackup, setAutoBackup] = useState(config.backup?.autoBackup ?? false);
  const [periodicity, setPeriodicity] = useState(config.backup?.periodicity ?? 'daily');
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New items state
  const [newChannel, setNewChannel] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // Editing items state
  const [editingChannelIdx, setEditingChannelIdx] = useState<number | null>(null);
  const [editingChannelText, setEditingChannelText] = useState('');

  const [editingPaymentIdx, setEditingPaymentIdx] = useState<number | null>(null);
  const [editingPaymentText, setEditingPaymentText] = useState('');

  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const list = await listAllBackups();
      setBackups(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'backups') {
      loadBackups();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Add Channel
  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannel.trim()) return;
    if (canales.includes(newChannel.trim())) {
      alert('Este canal ya existe.');
      return;
    }
    const updated = [...canales, newChannel.trim()];
    setCanales(updated);
    setNewChannel('');
  };

  // Remove Channel
  const handleRemoveChannel = (index: number) => {
    if (canales.length <= 1) {
      alert('Debe haber al menos un canal de venta.');
      return;
    }
    const updated = canales.filter((_, i) => i !== index);
    setCanales(updated);
  };

  // Save Channel Edit
  const handleSaveChannelEdit = (index: number) => {
    if (!editingChannelText.trim()) return;
    const updated = [...canales];
    updated[index] = editingChannelText.trim();
    setCanales(updated);
    setEditingChannelIdx(null);
  };

  // Add Payment Method
  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentMethod.trim()) return;
    if (metodosPago.includes(newPaymentMethod.trim())) {
      alert('Este método de pago ya existe.');
      return;
    }
    const updated = [...metodosPago, newPaymentMethod.trim()];
    setMetodosPago(updated);
    setNewPaymentMethod('');
  };

  // Remove Payment Method
  const handleRemovePaymentMethod = (index: number) => {
    if (metodosPago.length <= 1) {
      alert('Debe haber al menos un método de pago.');
      return;
    }
    const updated = metodosPago.filter((_, i) => i !== index);
    setMetodosPago(updated);
  };

  // Save Payment Edit
  const handleSavePaymentEdit = (index: number) => {
    if (!editingPaymentText.trim()) return;
    const updated = [...metodosPago];
    updated[index] = editingPaymentText.trim();
    setMetodosPago(updated);
    setEditingPaymentIdx(null);
  };

  const handleManualBackup = async () => {
    setBackupStatus(null);
    try {
      const res = await runBackup(fullAppState);
      if (res.successServer || res.successIndexedDb) {
        setBackupStatus({
          type: 'success',
          message: `Copia manual creada con éxito: ${res.filename} (${res.successServer ? 'Disco' : ''} ${res.successIndexedDb ? 'IndexedDB' : ''})`
        });
        loadBackups();
      } else {
        setBackupStatus({
          type: 'error',
          message: 'No se pudo guardar la copia en el disco local ni en el navegador.'
        });
      }
    } catch (e: any) {
      setBackupStatus({
        type: 'error',
        message: `Error al generar copia: ${e.message}`
      });
    }
  };

  const handleRestore = async (item: BackupItem) => {
    if (confirm(`¿ATENCIÓN: Confirma restaurar la copia de seguridad "${item.filename}"?\n\nEsto reemplazará todas las ventas, clientes, catálogo y configuración actuales de forma irreversible.`)) {
      try {
        const restoredState = await restoreBackup(item);
        onRestoreBackup(restoredState);
        alert('¡Copia de seguridad restaurada correctamente! La aplicación se recargará con los nuevos datos.');
        onClose();
      } catch (e: any) {
        alert(`Error al restaurar: ${e.message}`);
      }
    }
  };

  const handleDeleteIndexedDbBackup = async (filename: string) => {
    if (confirm(`¿Confirma eliminar la copia de seguridad del navegador "${filename}"?`)) {
      try {
        await deleteFromIndexedDb(filename);
        loadBackups();
      } catch (e: any) {
        alert(`Error al eliminar: ${e.message}`);
      }
    }
  };

  const handleSaveAll = async () => {
    const newPin = pinChangeInput.trim();
    // Persist only a hash of the PIN, never the plain value. Empty input keeps
    // the already-stored hash untouched.
    const pinAcceso = newPin
      ? await hashPin(newPin)
      : (secConfig.pinAcceso || await hashPin('1234'));
    onSaveConfig({
      canales,
      metodosPago,
      puntoVentaPresupuesto: puntoVenta || '0001',
      ultimoNumeroPresupuesto: Number(ultimoNumero) || 1,
      seguridad: {
        ...secConfig,
        pinAcceso
      },
      backup: {
        autoBackup,
        periodicity,
        lastBackupDate: config.backup?.lastBackupDate,
        lastBackupFilename: config.backup?.lastBackupFilename
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-900 dark:bg-slate-800 text-white p-2 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Configuración del Sistema
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personaliza Canales, Métodos de Pago, Seguridad y Copias de Seguridad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-1.5 flex gap-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>General & Ventas</span>
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Seguridad & PIN</span>
          </button>

          <button
            onClick={() => setActiveTab('backups')}
            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'backups'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Copias de Seguridad</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-800 dark:text-slate-200">
          
          {activeTab === 'general' && (
            <>
              {/* 1. Canales de Venta */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Canales de Venta
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {canales.length} configurados
                  </span>
                </div>

                <form onSubmit={handleAddChannel} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar nuevo canal (Ej: PedidosYa, WhatsApp, etc.)..."
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-1">
                  {canales.map((c, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      {editingChannelIdx === index ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingChannelText}
                            onChange={(e) => setEditingChannelText(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-350 dark:border-slate-650 rounded px-1.5 py-0.5 text-xs focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveChannelEdit(index)}
                            className="text-emerald-600 hover:text-emerald-800 p-0.5"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium">{c}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChannelIdx(index);
                              setEditingChannelText(c);
                            }}
                            className="text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveChannel(index)}
                            className="text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Métodos de Pago */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Métodos de Pago
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {metodosPago.length} configurados
                  </span>
                </div>

                <form onSubmit={handleAddPaymentMethod} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar nuevo método de pago (Ej: Tarjeta Naranja, Bitcoin, etc.)..."
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600 shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-1">
                  {metodosPago.map((m, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      {editingPaymentIdx === index ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingPaymentText}
                            onChange={(e) => setEditingPaymentText(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-350 dark:border-slate-650 rounded px-1.5 py-0.5 text-xs focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePaymentEdit(index)}
                            className="text-emerald-600 hover:text-emerald-800 p-0.5"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium">{m}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPaymentIdx(index);
                              setEditingPaymentText(m);
                            }}
                            className="text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePaymentMethod(index)}
                            className="text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Secuencia de Presupuestos */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Correlatividad y Secuencia de Presupuestos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Punto de Venta Presupuestos</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={puntoVenta}
                      onChange={(e) => setPuntoVenta(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                      placeholder="0001"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Último Nº de Presupuesto Emitido</label>
                    <input
                      type="number"
                      value={ultimoNumero}
                      onChange={(e) => setUltimoNumero(parseInt(e.target.value) || 0)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 shadow-2xs"
                      placeholder="311"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  El próximo presupuesto se emitirá automáticamente con el formato{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">
                    P{puntoVenta.padStart(4, '0')}-{(Number(ultimoNumero) + 1).toString().padStart(8, '0')}
                  </strong>
                </p>
              </div>

              {/* 4. Importación Inicial de Datos */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Importación Inicial de Datos (Google Sheets / CSV)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Uso Único / Migración Inicial
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Herramienta de migración para cargar filas históricas en lote desde un archivo <strong>CSV</strong> o directamente pegando las celdas copiadas desde <strong>Google Sheets</strong>.
                </p>
                {onOpenImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenImport();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3.5 py-2 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Abrir Importador de Sheets / CSV</span>
                  </button>
                )}
              </div>
            </>
          )}

          {activeTab === 'security' && (
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
                  Para desplegar en <strong className="text-white font-mono">gestion.dualsrl.com.ar</strong> en el mismo VPS junto a WooCommerce:
                </p>

                <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300 font-sans">
                  <li><strong>Opción 1 (Nginx Basic Auth):</strong> Proteger el subdominio con contraseña HTTP Nginx (<code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">htpasswd</code>) antes de cargar la app.</li>
                  <li><strong>Opción 2 (Certificado SSL & Headers):</strong> Certbot Let's Encrypt para HTTPS + Headers HSTS, <code className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono">X-Frame-Options: SAMEORIGIN</code> y CORS restrictivo.</li>
                  <li><strong>Opción 3 (Filtro por IP):</strong> Limitar el acceso en Nginx a las direcciones IP del local/oficina de DUAL S.R.L.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'backups' && (
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
                        onChange={(e: any) => setPeriodicity(e.target.value)}
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
                    {config.backup?.lastBackupDate ? (
                      <>Último backup: <strong>{new Date(config.backup.lastBackupDate).toLocaleString()}</strong> ({config.backup.lastBackupFilename})</>
                    ) : (
                      'Aún no se han realizado copias de seguridad.'
                    )}
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleManualBackup}
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
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg flex gap-2.5 text-[11px] text-slate-650 dark:text-slate-400">
                <Cloud className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Sincronización en la Nube (Google Drive / OneDrive):</span>
                  <p className="mt-0.5 leading-relaxed">
                    Las copias marcadas como 💻 Disco se guardan en la carpeta <code className="bg-slate-100 dark:bg-slate-850 px-1 py-0.2 rounded font-mono font-bold text-blue-600 dark:text-blue-400">./backups</code> de este proyecto. Si instalas la aplicación oficial de Google Drive en tu computadora y configuras la sincronización de esta carpeta, tus backups locales se subirán a la nube de manera 100% transparente y segura.
                  </p>
                </div>
              </div>

              {/* Backups List Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Copias de Seguridad Disponibles ({backups.length})</span>
                  <button
                    type="button"
                    onClick={loadBackups}
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
                              <td className="p-2 text-slate-700 dark:text-slate-350 font-medium truncate max-w-[160px]" title={item.filename}>
                                {item.filename}
                              </td>
                              <td className="p-2 text-right text-slate-500 dark:text-slate-400 font-medium">
                                {(item.size / 1024).toFixed(1)} KB
                              </td>
                              <td className="p-2 text-center font-sans space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleRestore(item)}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold hover:underline cursor-pointer"
                                  title="Restaurar base de datos a esta copia"
                                >
                                  Restaurar
                                </button>
                                {item.source === 'indexedDB' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteIndexedDbBackup(item.filename)}
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
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 rounded-md text-xs transition-colors cursor-pointer shadow-2xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-5 py-2 rounded-md text-xs transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Guardar Configuración</span>
          </button>
        </div>

      </div>
    </div>
  );
};
