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
  AlertCircle,
  Truck,
  ClipboardList,
  Building2,
  Image as ImageIcon,
  Upload,
  FileText
} from 'lucide-react';
import { AppConfig, SecurityConfig, CompanyConfig } from '../types';
import { INITIAL_COMPANY_CONFIG } from '../data/initialData';
import { hashPin } from '../utils/security';
import { BackupItem, listAllBackups, runBackup, restoreBackup, deleteFromIndexedDb } from '../utils/backupService';
import { addSystemLog } from '../utils/logger';

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
  const [activeTab, setActiveTab] = useState<'general' | 'empresa' | 'security' | 'backups'>('general');

  const defaultEmpresa: CompanyConfig = config.empresa || INITIAL_COMPANY_CONFIG || {
    nombre: 'DUAL S.R.L.',
    subtitulo: 'Para Comercio y Hogar',
    logoUrl: '',
    mostrarLogo: false,
    domicilio: 'ESTANISLAO ZEBALLOS 3825, SANTA FE.',
    telefono: '0342-4883135',
    email: 'dualdesantafe@hotmail.com',
    cuit: '30710642857',
    iibb: '0111353853',
    condicionIva: 'I.V.A. Responsable Inscripto',
    inicioActividades: '01/07/2008',
    puntoVentaVenta: '0003',
    puntoVentaPresupuesto: '0001'
  };

  const [nombreEmpresa, setNombreEmpresa] = useState(defaultEmpresa.nombre);
  const [subtituloEmpresa, setSubtituloEmpresa] = useState(defaultEmpresa.subtitulo || '');
  const [logoUrl, setLogoUrl] = useState(defaultEmpresa.logoUrl || '');
  const [mostrarLogo, setMostrarLogo] = useState(defaultEmpresa.mostrarLogo ?? false);
  const [domicilioEmpresa, setDomicilioEmpresa] = useState(defaultEmpresa.domicilio);
  const [telefonoEmpresa, setTelefonoEmpresa] = useState(defaultEmpresa.telefono);
  const [emailEmpresa, setEmailEmpresa] = useState(defaultEmpresa.email);
  const [cuitEmpresa, setCuitEmpresa] = useState(defaultEmpresa.cuit);
  const [iibbEmpresa, setIibbEmpresa] = useState(defaultEmpresa.iibb);
  const [condicionIvaEmpresa, setCondicionIvaEmpresa] = useState(defaultEmpresa.condicionIva);
  const [inicioActividadesEmpresa, setInicioActividadesEmpresa] = useState(defaultEmpresa.inicioActividades || '');
  const [pvVenta, setPvVenta] = useState(defaultEmpresa.puntoVentaVenta || '0003');
  const [pvPresupuesto, setPvPresupuesto] = useState(defaultEmpresa.puntoVentaPresupuesto || config.puntoVentaPresupuesto || '0001');

  const [canales, setCanales] = useState<string[]>(config.canales || []);
  const [metodosPago, setMetodosPago] = useState<string[]>(config.metodosPago || []);
  const [metodosEnvio, setMetodosEnvio] = useState<string[]>(config.metodosEnvio || ['Retiro en Local', 'Correo Argentino', 'Andreani', 'OCA', 'Cadetería / Moto', 'Mercado Envíos', 'Otro']);
  const [estadosEnvio, setEstadosEnvio] = useState<string[]>(config.estadosEnvio || ['Pendiente', 'Enviado', 'Entregado', 'No Requiere']);
  const [puntoVenta, setPuntoVenta] = useState<string>(config.puntoVentaPresupuesto || defaultEmpresa.puntoVentaPresupuesto || '0001');
  const [ultimoNumero, setUltimoNumero] = useState<number>(config.ultimoNumeroPresupuesto || 311);
  const [andreaniHash, setAndreaniHash] = useState<string>(config.andreaniHash || '');

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

  // Logo upload handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setLogoUrl(base64);
        setMostrarLogo(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setMostrarLogo(false);
  };

  // Sync state on open/config update
  useEffect(() => {
    if (isOpen) {
      const emp = config.empresa || INITIAL_COMPANY_CONFIG;
      setNombreEmpresa(emp.nombre || 'DUAL S.R.L.');
      setSubtituloEmpresa(emp.subtitulo || '');
      setLogoUrl(emp.logoUrl || '');
      setMostrarLogo(emp.mostrarLogo ?? false);
      setDomicilioEmpresa(emp.domicilio || '');
      setTelefonoEmpresa(emp.telefono || '');
      setEmailEmpresa(emp.email || '');
      setCuitEmpresa(emp.cuit || '');
      setIibbEmpresa(emp.iibb || '');
      setCondicionIvaEmpresa(emp.condicionIva || 'I.V.A. Responsable Inscripto');
      setInicioActividadesEmpresa(emp.inicioActividades || '');
      setPvVenta(emp.puntoVentaVenta || '0003');
      const pvPres = emp.puntoVentaPresupuesto || config.puntoVentaPresupuesto || '0001';
      setPvPresupuesto(pvPres);
      setPuntoVenta(pvPres);
      setUltimoNumero(config.ultimoNumeroPresupuesto || 311);
      setCanales(config.canales || []);
      setMetodosPago(config.metodosPago || []);
      setMetodosEnvio(config.metodosEnvio || ['Retiro en Local', 'Correo Argentino', 'Andreani', 'OCA', 'Cadetería / Moto', 'Mercado Envíos', 'Otro']);
      setEstadosEnvio(config.estadosEnvio || ['Pendiente', 'Enviado', 'Entregado', 'No Requiere']);
      setAndreaniHash(config.andreaniHash || '');
      setSecConfig(config.seguridad || defaultSec);
      setAutoBackup(config.backup?.autoBackup ?? false);
      setPeriodicity(config.backup?.periodicity ?? 'daily');
    }
  }, [isOpen, config]);

  // New items state
  const [newChannel, setNewChannel] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newShippingMethod, setNewShippingMethod] = useState('');
  const [newShippingStatus, setNewShippingStatus] = useState('');

  // Editing items state
  const [editingChannelIdx, setEditingChannelIdx] = useState<number | null>(null);
  const [editingChannelText, setEditingChannelText] = useState('');

  const [editingPaymentIdx, setEditingPaymentIdx] = useState<number | null>(null);
  const [editingPaymentText, setEditingPaymentText] = useState('');

  const [editingShippingMethodIdx, setEditingShippingMethodIdx] = useState<number | null>(null);
  const [editingShippingMethodText, setEditingShippingMethodText] = useState('');

  const [editingShippingStatusIdx, setEditingShippingStatusIdx] = useState<number | null>(null);
  const [editingShippingStatusText, setEditingShippingStatusText] = useState('');

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

  // Add Shipping Method
  const handleAddShippingMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShippingMethod.trim()) return;
    if (metodosEnvio.includes(newShippingMethod.trim())) {
      alert('Este método de envío ya existe.');
      return;
    }
    const updated = [...metodosEnvio, newShippingMethod.trim()];
    setMetodosEnvio(updated);
    setNewShippingMethod('');
  };

  // Remove Shipping Method
  const handleRemoveShippingMethod = (index: number) => {
    if (metodosEnvio.length <= 1) {
      alert('Debe haber al menos un método de envío.');
      return;
    }
    const updated = metodosEnvio.filter((_, i) => i !== index);
    setMetodosEnvio(updated);
  };

  // Save Shipping Method Edit
  const handleSaveShippingMethodEdit = (index: number) => {
    if (!editingShippingMethodText.trim()) return;
    const updated = [...metodosEnvio];
    updated[index] = editingShippingMethodText.trim();
    setMetodosEnvio(updated);
    setEditingShippingMethodIdx(null);
  };

  // Add Shipping Status
  const handleAddShippingStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShippingStatus.trim()) return;
    if (estadosEnvio.includes(newShippingStatus.trim())) {
      alert('Este estado de envío ya existe.');
      return;
    }
    const updated = [...estadosEnvio, newShippingStatus.trim()];
    setEstadosEnvio(updated);
    setNewShippingStatus('');
  };

  // Remove Shipping Status
  const handleRemoveShippingStatus = (index: number) => {
    if (estadosEnvio.length <= 1) {
      alert('Debe haber al menos un estado de envío.');
      return;
    }
    const updated = estadosEnvio.filter((_, i) => i !== index);
    setEstadosEnvio(updated);
  };

  // Save Shipping Status Edit
  const handleSaveShippingStatusEdit = (index: number) => {
    if (!editingShippingStatusText.trim()) return;
    const updated = [...estadosEnvio];
    updated[index] = editingShippingStatusText.trim();
    setEstadosEnvio(updated);
    setEditingShippingStatusIdx(null);
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
    try {
      const newPin = pinChangeInput.trim();
      // Persist only a hash of the PIN, never the plain value. Empty input keeps
      // the already-stored hash untouched.
      const pinAcceso = newPin
        ? await hashPin(newPin)
        : (secConfig.pinAcceso || await hashPin('1234'));
      onSaveConfig({
        canales,
        metodosPago,
        metodosEnvio,
        estadosEnvio,
        puntoVentaPresupuesto: pvPresupuesto.trim() || puntoVenta.trim() || '0001',
        ultimoNumeroPresupuesto: Number(ultimoNumero) || 1,
        andreaniHash: andreaniHash.trim(),
        empresa: {
          nombre: nombreEmpresa.trim() || 'DUAL S.R.L.',
          subtitulo: subtituloEmpresa.trim(),
          logoUrl,
          mostrarLogo,
          domicilio: domicilioEmpresa.trim(),
          telefono: telefonoEmpresa.trim(),
          email: emailEmpresa.trim(),
          cuit: cuitEmpresa.trim(),
          iibb: iibbEmpresa.trim(),
          condicionIva: condicionIvaEmpresa.trim(),
          inicioActividades: inicioActividadesEmpresa.trim(),
          puntoVentaVenta: pvVenta.trim() || '0003',
          puntoVentaPresupuesto: (pvPresupuesto || puntoVenta || '0001').trim()
        },
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
      addSystemLog('INFO', 'Configuración', 'Configuración general, empresa y seguridad guardada exitosamente');
      onClose();
    } catch (err: any) {
      console.error('Error al guardar configuración:', err);
      addSystemLog('ERROR', 'Configuración', `Error al guardar configuración del sistema: ${err?.message || err}`);
      alert('Ocurrió un error al guardar la configuración.');
    }
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
                Personaliza Canales, Métodos de Pago, Empresa / Firma, Seguridad y Copias de Seguridad
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
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-1.5 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>General & Ventas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('empresa')}
            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'empresa'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Empresa / Firma</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Seguridad & PIN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
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

              {/* 2b. Métodos de Envío */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Métodos de Envío
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {metodosEnvio.length} configurados
                  </span>
                </div>

                <form onSubmit={handleAddShippingMethod} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar nuevo método de envío (Ej: Motomensajería, Retiro en Depósito, etc.)..."
                    value={newShippingMethod}
                    onChange={(e) => setNewShippingMethod(e.target.value)}
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
                  {metodosEnvio.map((m, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      {editingShippingMethodIdx === index ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingShippingMethodText}
                            onChange={(e) => setEditingShippingMethodText(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-350 dark:border-slate-650 rounded px-1.5 py-0.5 text-xs focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveShippingMethodEdit(index)}
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
                              setEditingShippingMethodIdx(index);
                              setEditingShippingMethodText(m);
                            }}
                            className="text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveShippingMethod(index)}
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

              {/* 2c. Estados de Envío */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Estados de Envío
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {estadosEnvio.length} configurados
                  </span>
                </div>

                <form onSubmit={handleAddShippingStatus} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Agregar nuevo estado de envío (Ej: Empaquetado, Preparando, etc.)...."
                    value={newShippingStatus}
                    onChange={(e) => setNewShippingStatus(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 dark:bg-purple-600 hover:bg-slate-800 dark:hover:bg-purple-500 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-1">
                  {estadosEnvio.map((status, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      {editingShippingStatusIdx === index ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingShippingStatusText}
                            onChange={(e) => setEditingShippingStatusText(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-350 dark:border-slate-650 rounded px-1.5 py-0.5 text-xs focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveShippingStatusEdit(index)}
                            className="text-emerald-600 hover:text-emerald-800 p-0.5"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium">{status}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingShippingStatusIdx(index);
                              setEditingShippingStatusText(status);
                            }}
                            className="text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveShippingStatus(index)}
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

              {/* 2d. Integración con Andreani (Seguimiento) */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <Truck className="w-4 h-4 text-red-600 dark:text-red-400" />
                    Integración con Andreani (Seguimiento de Envíos)
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    andreaniHash ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300' : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-850 dark:border-slate-750 dark:text-slate-400'
                  }`}>
                    {andreaniHash ? 'Configurado' : 'No Configurado'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-650 dark:text-slate-400 font-medium">Hash de Autenticación de Andreani (HASH_ANDREANI)</label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Ingrese el hash de cuenta de Andreani provisto..."
                      value={andreaniHash}
                      onChange={(e) => setAndreaniHash(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-red-500 shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    Hash provisto por Andreani para la integración. Se utiliza para obtener tokens de sesión y actualizar el estado de tus envíos de forma automática.
                  </p>
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

          {activeTab === 'empresa' && (
            <div className="space-y-5">
              {/* 1. Identidad Visual & Logotipo */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Identidad Visual & Logotipo de la Empresa
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Encabezados en Presupuestos, Remitos y Facturación
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Razón Social / Nombre Comercial *
                    </label>
                    <input
                      type="text"
                      value={nombreEmpresa}
                      onChange={(e) => setNombreEmpresa(e.target.value)}
                      placeholder="Ej: DUAL S.R.L."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Slogan o Subtítulo Institucional
                    </label>
                    <input
                      type="text"
                      value={subtituloEmpresa}
                      onChange={(e) => setSubtituloEmpresa(e.target.value)}
                      placeholder="Ej: Para Comercio y Hogar"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Logo Upload & Preview Section */}
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3.5 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-36 h-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center overflow-hidden shrink-0 relative">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo Empresa"
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 text-[10px]">
                        <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                        <span>Sin Logotipo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        Logotipo para Documentos Impresos
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Formatos recomendados: PNG transparente o JPG. Tamaño máx: 2 MB.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <label className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{logoUrl ? 'Cambiar Imagen' : 'Subir Logotipo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer justify-center sm:justify-start">
                      <input
                        type="checkbox"
                        checked={mostrarLogo}
                        onChange={(e) => setMostrarLogo(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                        Mostrar logotipo gráfico en comprobantes y presupuestos
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. Datos Fiscales & Impositivos */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Datos Fiscales & Impositivos (AFIP / ARCA)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      C.U.I.T. de la Empresa
                    </label>
                    <input
                      type="text"
                      value={cuitEmpresa}
                      onChange={(e) => setCuitEmpresa(e.target.value)}
                      placeholder="Ej: 30710642857"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Ingresos Brutos (IIBB)
                    </label>
                    <input
                      type="text"
                      value={iibbEmpresa}
                      onChange={(e) => setIibbEmpresa(e.target.value)}
                      placeholder="Ej: 0111353853"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Condición frente al I.V.A.
                    </label>
                    <input
                      type="text"
                      value={condicionIvaEmpresa}
                      onChange={(e) => setCondicionIvaEmpresa(e.target.value)}
                      placeholder="Ej: I.V.A. Responsable Inscripto"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Fecha Inicio de Actividades
                    </label>
                    <input
                      type="text"
                      value={inicioActividadesEmpresa}
                      onChange={(e) => setInicioActividadesEmpresa(e.target.value)}
                      placeholder="Ej: 01/07/2008"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Domicilio & Contacto Comercial */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Ubicación & Contacto Comercial
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Domicilio Comercial / Dirección
                    </label>
                    <input
                      type="text"
                      value={domicilioEmpresa}
                      onChange={(e) => setDomicilioEmpresa(e.target.value)}
                      placeholder="Ej: ESTANISLAO ZEBALLOS 3825, SANTA FE."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      value={telefonoEmpresa}
                      onChange={(e) => setTelefonoEmpresa(e.target.value)}
                      placeholder="Ej: 0342-4883135"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Email Comercial
                    </label>
                    <input
                      type="email"
                      value={emailEmpresa}
                      onChange={(e) => setEmailEmpresa(e.target.value)}
                      placeholder="Ej: dualdesantafe@hotmail.com"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Puntos de Venta (PV) */}
              <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Puntos de Venta (Prefijos de Facturas y Presupuestos)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Punto de Venta Predeterminado (Ventas / Facturas)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={pvVenta}
                      onChange={(e) => setPvVenta(e.target.value)}
                      placeholder="0003"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Utilizado como punto de venta por defecto en comprobantes fiscales (ej. FC-B-<strong>{pvVenta.padStart(4, '0')}</strong>-...).
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Punto de Venta (Presupuestos)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={pvPresupuesto}
                      onChange={(e) => {
                        setPvPresupuesto(e.target.value);
                        setPuntoVenta(e.target.value);
                      }}
                      placeholder="0001"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Prefijo impreso en cotizaciones y presupuestos (ej. P<strong>{pvPresupuesto.padStart(4, '0')}</strong>-...).
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
