import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sliders,
  Building2,
  ShieldCheck,
  Database,
  Check,
} from 'lucide-react';
import { AppConfig, SecurityConfig } from '../types';
import { INITIAL_COMPANY_CONFIG } from '../data/initialData';
import { hashPin, isHashedPin } from '../utils/security';
import { BackupItem, listAllBackups, runBackup, restoreBackup, deleteFromIndexedDb } from '../utils/backupService';
import { addSystemLog } from '../utils/logger';
import { ConfigGeneralTab } from './ConfigGeneralTab';
import { ConfigEmpresaTab } from './ConfigEmpresaTab';
import { ConfigSecurityTab } from './ConfigSecurityTab';
import { ConfigBackupsTab } from './ConfigBackupsTab';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onOpenImport?: () => void;
  onRestoreBackup: (state: any) => void;
  fullAppState: any;
}

type ConfigTab = 'general' | 'empresa' | 'security' | 'backups';

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenImport,
  onRestoreBackup,
  fullAppState,
}) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('general');

  const defaultEmpresa = config.empresa || INITIAL_COMPANY_CONFIG || {
    nombre: 'Mi Empresa',
    subtitulo: '',
    logoUrl: '',
    mostrarLogo: false,
    domicilio: '',
    telefono: '',
    email: '',
    cuit: '',
    iibb: '',
    condicionIva: '',
    inicioActividades: '',
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
  const [estadosEnvio, setEstadosEnvio] = useState<string[]>(config.estadosEnvio || ['Pendiente', 'Pendiente de ingreso', 'En camino', 'Listo para retirar', 'Entregado', 'No entregado', 'Enviado', 'No Requiere']);
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
  // Hash del PIN predeterminado "1234" (H1): permite detectar si sigue en uso sin mostrar nada.
  const [defaultPinHash, setDefaultPinHash] = useState<string>('');
  useEffect(() => {
    let active = true;
    hashPin('1234').then((h) => { if (active) setDefaultPinHash(h); });
    return () => { active = false; };
  }, []);

  // Backups config state
  const [autoBackup, setAutoBackup] = useState(config.backup?.autoBackup ?? false);
  const [periodicity, setPeriodicity] = useState(config.backup?.periodicity ?? 'daily');
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state on open/config update
  useEffect(() => {
    if (isOpen) {
      const emp = config.empresa || INITIAL_COMPANY_CONFIG;
      setNombreEmpresa(emp.nombre || 'Mi Empresa');
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
      setEstadosEnvio(config.estadosEnvio || ['Pendiente', 'Pendiente de ingreso', 'En camino', 'Listo para retirar', 'Entregado', 'No entregado', 'Enviado', 'No Requiere']);
      setAndreaniHash(config.andreaniHash || '');
      setSecConfig(config.seguridad || defaultSec);
      setAutoBackup(config.backup?.autoBackup ?? false);
      setPeriodicity(config.backup?.periodicity ?? 'daily');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, config]);

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

      // H1 - Endurecimiento de PIN:
      // 1) Persistir SIEMPRE solo el hash, nunca texto plano. Un PIN legacy en
      //    claro (ej. "1234" de instalaciones previas) se migra a hash al guardar.
      let pinAcceso: string;
      if (newPin) {
        pinAcceso = await hashPin(newPin);
      } else if (isHashedPin(secConfig.pinAcceso)) {
        pinAcceso = secConfig.pinAcceso; // hash ya persistido: se mantiene intacto
      } else {
        pinAcceso = await hashPin(secConfig.pinAcceso || '1234');
      }

      // 2) No permitir HABILITAR la seguridad dejando el PIN predeterminado "1234":
      //    se exige fijar un PIN nuevo antes de activar el control de acceso.
      const wasSecurityEnabled = !!config.seguridad?.seguridadHabilitada;
      const willEnableSecurity = secConfig.seguridadHabilitada && !wasSecurityEnabled;
      if (willEnableSecurity) {
        const defaultHash = await hashPin('1234');
        const pinIsDefault =
          newPin === '1234' ||
          (!newPin && (secConfig.pinAcceso?.trim() === '1234' || pinAcceso === defaultHash));
        if (pinIsDefault) {
          alert('Para HABILITAR la seguridad primero debés establecer un PIN nuevo (no puede ser el predeterminado "1234").\n\nIngresá el nuevo PIN en "Cambiar PIN de Acceso" e intentá de nuevo.');
          setPinChangeInput('');
          return; // No se guarda nada hasta que el PIN sea seguro
        }
      }

      onSaveConfig({
        canales,
        metodosPago,
        metodosEnvio,
        estadosEnvio,
        puntoVentaPresupuesto: pvPresupuesto.trim() || puntoVenta.trim() || '0001',
        ultimoNumeroPresupuesto: Number(ultimoNumero) || 1,
        andreaniHash: andreaniHash.trim(),
        empresa: {
          nombre: nombreEmpresa.trim() || 'Mi Empresa',
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
            <ConfigGeneralTab
              canales={canales}
              setCanales={setCanales}
              metodosPago={metodosPago}
              setMetodosPago={setMetodosPago}
              metodosEnvio={metodosEnvio}
              setMetodosEnvio={setMetodosEnvio}
              estadosEnvio={estadosEnvio}
              setEstadosEnvio={setEstadosEnvio}
              andreaniHash={andreaniHash}
              setAndreaniHash={setAndreaniHash}
              puntoVenta={puntoVenta}
              setPuntoVenta={setPuntoVenta}
              ultimoNumero={ultimoNumero}
              setUltimoNumero={setUltimoNumero}
              onOpenImport={onOpenImport}
              onClose={onClose}
            />
          )}

          {activeTab === 'empresa' && (
            <ConfigEmpresaTab
              nombreEmpresa={nombreEmpresa}
              setNombreEmpresa={setNombreEmpresa}
              subtituloEmpresa={subtituloEmpresa}
              setSubtituloEmpresa={setSubtituloEmpresa}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              mostrarLogo={mostrarLogo}
              setMostrarLogo={setMostrarLogo}
              domicilioEmpresa={domicilioEmpresa}
              setDomicilioEmpresa={setDomicilioEmpresa}
              telefonoEmpresa={telefonoEmpresa}
              setTelefonoEmpresa={setTelefonoEmpresa}
              emailEmpresa={emailEmpresa}
              setEmailEmpresa={setEmailEmpresa}
              cuitEmpresa={cuitEmpresa}
              setCuitEmpresa={setCuitEmpresa}
              iibbEmpresa={iibbEmpresa}
              setIibbEmpresa={setIibbEmpresa}
              condicionIvaEmpresa={condicionIvaEmpresa}
              setCondicionIvaEmpresa={setCondicionIvaEmpresa}
              inicioActividadesEmpresa={inicioActividadesEmpresa}
              setInicioActividadesEmpresa={setInicioActividadesEmpresa}
              pvVenta={pvVenta}
              setPvVenta={setPvVenta}
              pvPresupuesto={pvPresupuesto}
              setPvPresupuesto={setPvPresupuesto}
              setPuntoVenta={setPuntoVenta}
            />
          )}

          {activeTab === 'security' && (
            <ConfigSecurityTab
              secConfig={secConfig}
              setSecConfig={setSecConfig}
              pinChangeInput={pinChangeInput}
              setPinChangeInput={setPinChangeInput}
              defaultPinHash={defaultPinHash}
            />
          )}

          {activeTab === 'backups' && (
            <ConfigBackupsTab
              autoBackup={autoBackup}
              setAutoBackup={setAutoBackup}
              periodicity={periodicity}
              setPeriodicity={setPeriodicity}
              lastBackupDate={config.backup?.lastBackupDate}
              lastBackupFilename={config.backup?.lastBackupFilename}
              backups={backups}
              isLoadingBackups={isLoadingBackups}
              backupStatus={backupStatus}
              onManualBackup={handleManualBackup}
              onLoadBackups={loadBackups}
              onRestore={handleRestore}
              onDelete={handleDeleteIndexedDbBackup}
            />
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

export default ConfigModal;
