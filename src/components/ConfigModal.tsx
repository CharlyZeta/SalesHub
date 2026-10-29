import React, { useState, useEffect } from 'react';
import { X, Settings, Sliders, Building2, ShieldCheck, Database, Check, Users, Shield } from 'lucide-react';
import { AppConfig, SecurityConfig, GoogleMapsUsage, UserRole } from '../types';
import { INITIAL_COMPANY_CONFIG } from '../data/initialData';
import { hashPin, isHashedPin, verifyPin, verifyPassword } from '../utils/security';
import { BackupItem, listAllBackups, runBackup, restoreBackup, deleteFromIndexedDb } from '../utils/backupService';
import { addSystemLog } from '../utils/logger';
import { canManageSecurity, hayAdminConCredencialesSeguras } from '../utils/securityAccess';
import { DEFAULT_ADMIN_CREDENTIALS, ensureDefaultAdminExists } from '../services/userService';
import { ConfigGeneralTab } from './ConfigGeneralTab';
import { ConfigEmpresaTab } from './ConfigEmpresaTab';
import { ConfigSecurityTab } from './ConfigSecurityTab';
import { ConfigBackupsTab } from './ConfigBackupsTab';
import { ConfigUsersTab } from './config/ConfigUsersTab';
import { ConfigPermissionsTab } from './config/ConfigPermissionsTab';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onOpenImport?: () => void;
  onRestoreBackup: (state: any) => void;
  fullAppState: any;
  currentRole?: UserRole;
}

type ConfigTab = 'general' | 'empresa' | 'users' | 'permissions' | 'security' | 'backups';

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenImport,
  onRestoreBackup,
  fullAppState,
  currentRole,
}) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('general');
  // FIX-AUTH-003: el rol proviene de la sesión autenticada (prop `currentRole`).
  // Antes se leía `config.seguridad.rolActual`, un campo que nunca se escribía,
  // por lo que el panel de usuarios quedaba inaccesible incluso para un ADMIN.
  const puedeGestionarSeguridad = canManageSecurity(currentRole, Boolean(config.seguridad?.seguridadHabilitada));

  const defaultEmpresa = config.empresa ||
    INITIAL_COMPANY_CONFIG || {
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
      puntoVentaPresupuesto: '0001',
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
  const [pvPresupuesto, setPvPresupuesto] = useState(
    defaultEmpresa.puntoVentaPresupuesto || config.puntoVentaPresupuesto || '0001'
  );

  const [canales, setCanales] = useState<string[]>(config.canales || []);
  const [metodosPago, setMetodosPago] = useState<string[]>(config.metodosPago || []);
  const [metodosEnvio, setMetodosEnvio] = useState<string[]>(
    config.metodosEnvio || [
      'Retiro en Local',
      'Correo Argentino',
      'Andreani',
      'OCA',
      'Cadetería / Moto',
      'Mercado Envíos',
      'Otro',
    ]
  );
  const [estadosEnvio, setEstadosEnvio] = useState<string[]>(
    config.estadosEnvio || [
      'Pendiente',
      'Pendiente de ingreso',
      'En camino',
      'Listo para retirar',
      'Entregado',
      'No entregado',
      'Enviado',
      'No Requiere',
    ]
  );
  const [puntoVenta, setPuntoVenta] = useState<string>(
    config.puntoVentaPresupuesto || defaultEmpresa.puntoVentaPresupuesto || '0001'
  );
  const [ultimoNumero, setUltimoNumero] = useState<number>(config.ultimoNumeroPresupuesto || 311);
  const [andreaniHash, setAndreaniHash] = useState<string>(config.andreaniHash || '');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>(config.googleMapsApiKey || '');
  const [googleMapsMonthlyLimit, setGoogleMapsMonthlyLimit] = useState<number>(
    typeof config.googleMapsMonthlyLimit === 'number' ? config.googleMapsMonthlyLimit : 2500
  );
  const [googleMapsUsage, setGoogleMapsUsage] = useState<GoogleMapsUsage | undefined>(config.googleMapsUsage);

  // Security config state
  const defaultSec: SecurityConfig = {
    seguridadHabilitada: true,
    pinAcceso: '1234',
    tiempoInactividadMinutos: 15,
    modoAutenticacion: 'solo_pin',
    modoProduccionVPS: true,
    bloquearSincronizacionWooCommerce: true,
    bloquearBorradoLogs: true,
  };

  const [secConfig, setSecConfig] = useState<SecurityConfig>(config.seguridad || defaultSec);
  // FIX-AUTH-003: el PIN legado ya no se edita desde esta pestaña. El PIN real es
  // por usuario (`AppUser.pinHash`) y se administra en "Usuarios & Sesión".

  // Sync only the non-credential field tiempoInactividadMinutos live to config.seguridad
  // so the auto-lock timer (useSecurityRole) respects the admin's configured timeout
  // without waiting for "Guardar Configuración" to be clicked.
  // Credential fields (pinAcceso, modoAutenticacion, etc.) are NEVER synced here;
  // they are only persisted through handleSaveAll, which hashes the PIN and enforces
  // the default-PIN-on-enable check (H1).
  useEffect(() => {
    if (isOpen && config.seguridad) {
      const currentTimeout = config.seguridad.tiempoInactividadMinutos;
      const newTimeout = secConfig.tiempoInactividadMinutos;
      if (currentTimeout !== newTimeout) {
        onSaveConfig({
          ...config,
          seguridad: {
            ...config.seguridad,
            tiempoInactividadMinutos: newTimeout,
          },
        });
      }
    }
  }, [isOpen, secConfig.tiempoInactividadMinutos, config, onSaveConfig]);

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
      setMetodosEnvio(
        config.metodosEnvio || [
          'Retiro en Local',
          'Correo Argentino',
          'Andreani',
          'OCA',
          'Cadetería / Moto',
          'Mercado Envíos',
          'Otro',
        ]
      );
      setEstadosEnvio(
        config.estadosEnvio || [
          'Pendiente',
          'Pendiente de ingreso',
          'En camino',
          'Listo para retirar',
          'Entregado',
          'No entregado',
          'Enviado',
          'No Requiere',
        ]
      );
      setAndreaniHash(config.andreaniHash || '');
      setGoogleMapsApiKey(config.googleMapsApiKey || '');
      setGoogleMapsMonthlyLimit(
        typeof config.googleMapsMonthlyLimit === 'number' ? config.googleMapsMonthlyLimit : 2500
      );
      setGoogleMapsUsage(config.googleMapsUsage);
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
          message: `Copia manual creada con éxito: ${res.filename} (${res.successServer ? 'Disco' : ''} ${res.successIndexedDb ? 'IndexedDB' : ''})`,
        });
        loadBackups();
      } else {
        setBackupStatus({
          type: 'error',
          message: 'No se pudo guardar la copia en el disco local ni en el navegador.',
        });
      }
    } catch (e: any) {
      setBackupStatus({
        type: 'error',
        message: `Error al generar copia: ${e.message}`,
      });
    }
  };

  const handleRestore = async (item: BackupItem) => {
    if (
      confirm(
        `¿ATENCIÓN: Confirma restaurar la copia de seguridad "${item.filename}"?\n\nEsto reemplazará todas las ventas, clientes, catálogo y configuración actuales de forma irreversible.`
      )
    ) {
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
      // H1 - Endurecimiento de PIN: persistir SIEMPRE solo el hash, nunca texto
      // plano. El PIN legado ya no se edita desde la UI (FIX-AUTH-003): se conserva
      // el valor existente y, si estaba en claro, se migra a hash al guardar.
      const pinAcceso = isHashedPin(secConfig.pinAcceso)
        ? secConfig.pinAcceso
        : await hashPin(secConfig.pinAcceso || DEFAULT_ADMIN_CREDENTIALS);

      // 2) FIX-AUTH-003: para HABILITAR la seguridad tiene que existir al menos un
      //    ADMIN con credenciales propias. El guard anterior miraba el PIN legado
      //    (`pinAcceso`), que ya no otorga acceso; ahora se verifica contra las
      //    cuentas reales de usuario.
      const wasSecurityEnabled = !!config.seguridad?.seguridadHabilitada;
      const willEnableSecurity = secConfig.seguridadHabilitada && !wasSecurityEnabled;
      if (willEnableSecurity) {
        const usuarios = await ensureDefaultAdminExists();
        const adminsActivos = usuarios.filter((u) => u.rol === 'ADMIN' && u.activo);
        const credenciales = await Promise.all(
          adminsActivos.map(async (u) => ({
            passwordEsDefault: await verifyPassword(DEFAULT_ADMIN_CREDENTIALS, u.passwordHash),
            pinEsDefault: u.pinHash ? await verifyPin(DEFAULT_ADMIN_CREDENTIALS, u.pinHash) : false,
          }))
        );
        if (!hayAdminConCredencialesSeguras(credenciales)) {
          alert(
            'Para HABILITAR el control de acceso necesitás al menos un administrador con credenciales propias.\n\n' +
              'Andá a "Usuarios & Sesión" y cambiá la contraseña y el PIN del administrador (no pueden ser los predeterminados).'
          );
          setActiveTab('users');
          return; // No se guarda nada hasta que haya credenciales seguras
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
        googleMapsApiKey: googleMapsApiKey.trim(),
        googleMapsMonthlyLimit: Number(googleMapsMonthlyLimit) >= 0 ? Number(googleMapsMonthlyLimit) : 2500,
        googleMapsUsage: googleMapsUsage,
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
          puntoVentaPresupuesto: (pvPresupuesto || puntoVenta || '0001').trim(),
        },
        seguridad: {
          ...secConfig,
          pinAcceso,
        },
        backup: {
          autoBackup,
          periodicity,
          lastBackupDate: config.backup?.lastBackupDate,
          lastBackupFilename: config.backup?.lastBackupFilename,
        },
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
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Configuración del Sistema</h2>
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

          {puedeGestionarSeguridad && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Usuarios & Sesión</span>
            </button>
          )}

          {puedeGestionarSeguridad && (
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'permissions'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Permisos & Herramientas</span>
            </button>
          )}

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

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Seguridad VPS</span>
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
              googleMapsApiKey={googleMapsApiKey}
              setGoogleMapsApiKey={setGoogleMapsApiKey}
              googleMapsMonthlyLimit={googleMapsMonthlyLimit}
              setGoogleMapsMonthlyLimit={setGoogleMapsMonthlyLimit}
              googleMapsUsage={googleMapsUsage}
              setGoogleMapsUsage={setGoogleMapsUsage}
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

          {activeTab === 'users' && puedeGestionarSeguridad && (
            <ConfigUsersTab secConfig={secConfig} setSecConfig={setSecConfig} currentRole={currentRole} />
          )}

          {activeTab === 'permissions' && puedeGestionarSeguridad && <ConfigPermissionsTab />}

          {activeTab === 'security' && (
            <ConfigSecurityTab
              secConfig={secConfig}
              setSecConfig={setSecConfig}
              onGoToUsers={() => setActiveTab('users')}
              puedeGestionarUsuarios={puedeGestionarSeguridad}
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
