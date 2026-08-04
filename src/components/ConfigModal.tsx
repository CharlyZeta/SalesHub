import React, { useState } from 'react';
import { X, Settings, Plus, Trash2, Check, Edit2, Sliders, ShieldCheck, Lock, Server, KeyRound, Globe, FileCode, FileSpreadsheet } from 'lucide-react';
import { AppConfig, SecurityConfig } from '../types';
import { hashPin } from '../utils/security';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onOpenImport?: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenImport
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');

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

  // New items state
  const [newChannel, setNewChannel] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // Editing items state
  const [editingChannelIdx, setEditingChannelIdx] = useState<number | null>(null);
  const [editingChannelText, setEditingChannelText] = useState('');

  const [editingPaymentIdx, setEditingPaymentIdx] = useState<number | null>(null);
  const [editingPaymentText, setEditingPaymentText] = useState('');

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
                Personaliza Canales de Venta, Métodos de Pago y Secuencia de Presupuestos
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
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Seguridad & VPS Subdominio</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-800 dark:text-slate-200">
          
          {activeTab === 'general' ? (
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {canales.map((canal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-md shadow-2xs"
                    >
                      {editingChannelIdx === idx ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingChannelText}
                            onChange={(e) => setEditingChannelText(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-blue-500 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveChannelEdit(idx)}
                            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 p-1 rounded"
                            title="Guardar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{canal}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChannelIdx(idx);
                                setEditingChannelText(canal);
                              }}
                              className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Editar nombre"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveChannel(idx)}
                              className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Eliminar canal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Métodos de Pago
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {metodosPago.length} configurados
                  </span>
                </div>

                <form onSubmit={handleAddPaymentMethod} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar nuevo método de pago (Ej: Cheque 30 días, Ualá, USD Cash...)..."
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {metodosPago.map((metodo, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-md shadow-2xs"
                    >
                      {editingPaymentIdx === idx ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingPaymentText}
                            onChange={(e) => setEditingPaymentText(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-blue-500 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePaymentEdit(idx)}
                            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 p-1 rounded"
                            title="Guardar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{metodo}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPaymentIdx(idx);
                                setEditingPaymentText(metodo);
                              }}
                              className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Editar nombre"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePaymentMethod(idx)}
                              className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Eliminar método"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Secuencia de Presupuesto */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs border-b border-slate-200 dark:border-slate-700 pb-2">
                  Numeración Secuencial de Presupuestos
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Punto de Venta (PV)</label>
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

              {/* 4. Importación Inicial de Datos (Google Sheets / CSV) */}
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
          ) : (
            /* TAB 2: Seguridad & VPS Subdominio */
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
                      Clave / PIN de Administrador
                    </label>
                    <input
                      type="password"
                      value={pinChangeInput}
                      onChange={(e) => setPinChangeInput(e.target.value)}
                      placeholder="Nuevo PIN (dejar vacío conserva el actual)"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-purple-600"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Requerido para acceder al sistema. Si deja el campo vacío se conserva el PIN actual. Se almacena en forma cifrada (hash).
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Auto-Bloqueo por Inactividad
                    </label>
                    <select
                      value={secConfig.tiempoInactividadMinutos}
                      onChange={(e) => setSecConfig({ ...secConfig, tiempoInactividadMinutos: Number(e.target.value) })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600"
                    >
                      <option value={0} className="dark:bg-slate-900">Desactivado (Sin bloqueo automático)</option>
                      <option value={5} className="dark:bg-slate-900">5 minutos de inactividad</option>
                      <option value={15} className="dark:bg-slate-900">15 minutos de inactividad (Recomendado)</option>
                      <option value={30} className="dark:bg-slate-900">30 minutos de inactividad</option>
                      <option value={60} className="dark:bg-slate-900">60 minutos de inactividad</option>
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Bloquea la pantalla automáticamente tras un tiempo sin actividad del ratón/teclado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Role Restrictions */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Restricciones de Perfil de Operador (RBAC)</span>
                </div>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
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
