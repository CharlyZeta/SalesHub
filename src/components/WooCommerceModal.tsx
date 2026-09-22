import React, { useState, useEffect, useRef } from 'react';
import { X, ShoppingBag, RefreshCw, Key, CheckCircle2, Users, Search, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { CatalogProduct, Customer, WooCommerceConfig, UserRole } from '../types';
import { formatCurrency } from '../utils/formatters';
import { fetchWooCommerceProducts, fetchWooCommerceCustomers } from '../utils/wooCommerceApi';
import { addSystemLog } from '../utils/logger';

interface WooCommerceModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WooCommerceConfig;
  onUpdateConfig: (newConfig: WooCommerceConfig) => void;
  catalog: CatalogProduct[];
  onAddCatalogProduct: (product: CatalogProduct) => void;
  customers?: Customer[];
  onSyncCustomers?: (newCustomers: Customer[]) => void;
  onSyncCatalog?: (newProducts: CatalogProduct[]) => void;
  currentRole?: UserRole;
  /** Fix A: la config de seguridad puede impedir que un OPERADOR edite las claves de API. */
  blockCredentialEditing?: boolean;
  /**
   * Fix D / W5: catálogo y clientes locales que se envían al servidor al sincronizar, para
   * que combine (merge) en lugar de reemplazar y no se pierdan datos locales.
   */
  localData?: { products?: any[]; customers?: any[] };
}

export const WooCommerceModal: React.FC<WooCommerceModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <WooCommerceModalInner {...props} />;
};

const WooCommerceModalInner: React.FC<WooCommerceModalProps> = ({
  onClose,
  config,
  onUpdateConfig,
  catalog,
  onAddCatalogProduct,
  customers = [],
  onSyncCustomers,
  onSyncCatalog,
  currentRole = 'OPERADOR',
  blockCredentialEditing = false,
  localData
}) => {
  // Fix A: el flag de seguridad restringe la edición de claves al Administrador
  // (ya no apaga la sincronización automática, que depende de `autoSync`).
  const credentialsLocked = blockCredentialEditing && currentRole !== 'ADMIN';

  const [url, setUrl] = useState(config.url);
  const [consumerKey, setConsumerKey] = useState(config.consumerKey);
  const [consumerSecret, setConsumerSecret] = useState(config.consumerSecret);
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [syncIntervalHours, setSyncIntervalHours] = useState(config.syncIntervalHours || 1);

  const [activeTab, setActiveTab] = useState<'products' | 'customers'>('products');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  // Fix E: estado de la sincronización del servidor (corre con la app cerrada).
  const [serverStatus, setServerStatus] = useState<{
    available: boolean;
    autoSync: boolean;
    lastSync: string | null;
    lastError: string | null;
    nextRunAt: string | null;
  }>({ available: false, autoSync: false, lastSync: null, lastError: null, nextRunAt: null });

  // W3: autoguardado. Los ajustes se persisten solos (con debounce) en cuanto cambian, así
  // nadie pierde la programación por cerrar el modal sin pulsar "Guardar Ajustes".
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<number | null>(null);
  const firstRenderRef = useRef(true);

  /** Construye la configuración con los valores actuales del formulario. */
  const buildConfig = (): WooCommerceConfig => ({
    url,
    consumerKey,
    consumerSecret,
    autoSync,
    syncIntervalHours,
    ultimoSync: config.ultimoSync,
    conectado: Boolean(url && consumerKey),
  });

  const latestConfigRef = useRef<WooCommerceConfig | null>(null);
  useEffect(() => {
    latestConfigRef.current = buildConfig();
  });

  /** Publica solo la configuración (sin sincronizar) para que el servidor programe. */
  const publishConfigToServer = async (cfg: WooCommerceConfig) => {
    try {
      const res = await fetch('/api/woo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cfg.url,
          consumerKey: cfg.consumerKey,
          consumerSecret: cfg.consumerSecret,
          autoSync: cfg.autoSync,
          intervalHours: cfg.syncIntervalHours || 1,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setServerStatus({
        available: true,
        autoSync: Boolean(data?.status?.autoSync),
        lastSync: data?.status?.lastSync ?? null,
        lastError: data?.status?.lastError ?? null,
        nextRunAt: data?.status?.nextRunAt ?? null,
      });
      addSystemLog(
        'SYNC',
        'WooCommerce',
        `Configuración publicada al servidor: la sincronización programada (cada ${cfg.syncIntervalHours || 1} h) correrá aunque la aplicación esté cerrada.`
      );
      return true;
    } catch {
      // Sin servidor (por ejemplo, build estático servido por otro medio) se sigue
      // usando la programación del navegador.
      setServerStatus(prev => ({ ...prev, available: false }));
      return false;
    }
  };

  // Autoguardado con debounce: se dispara ante cualquier cambio de los ajustes.
  useEffect(() => {
    // No guardar en el primer render (son los valores recién cargados) ni mientras el
    // usuario escribe con el teclado en un campo de texto (se espera el debounce).
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    // Sin URL no hay nada útil que publicar (evita guardar un formulario vacío).
    if (!url.trim()) return;

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    setAutoSaveState('saving');

    autoSaveTimerRef.current = window.setTimeout(() => {
      const updatedConfig = buildConfig();
      onUpdateConfig(updatedConfig);
      void publishConfigToServer(updatedConfig);
      setAutoSaveState('saved');
      addSystemLog(
        'INFO',
        'WooCommerce',
        `Ajustes guardados automáticamente (programación: ${updatedConfig.autoSync ? `cada ${updatedConfig.syncIntervalHours} h` : 'inactiva'})`
      );
      autoSaveTimerRef.current = window.setTimeout(() => setAutoSaveState('idle'), 2500);
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, consumerKey, consumerSecret, autoSync, syncIntervalHours]);

  // Al cerrar el modal, si quedó un guardado pendiente se aplica sin esperar el debounce.
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        const pending = latestConfigRef.current;
        if (pending && pending.url.trim()) {
          onUpdateConfig(pending);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al abrir el modal, consultamos el estado del servidor (si está disponible).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/woo/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const status = await res.json();
        if (cancelled) return;
        setServerStatus({
          available: true,
          autoSync: Boolean(status.autoSync),
          lastSync: status.lastSync ?? null,
          lastError: status.lastError ?? null,
          nextRunAt: status.nextRunAt ?? null,
        });
      } catch {
        if (!cancelled) setServerStatus(prev => ({ ...prev, available: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Sincroniza a través del servidor (Fix D / W5 + Fix E): publica la configuración, dispara
   * la sincronización enviando el catálogo/clientes locales y devuelve el snapshot combinado.
   * Si el servidor no está disponible, informa `available: false` para usar el modo navegador.
   */
  const syncThroughServer = async (
    cfg: WooCommerceConfig
  ): Promise<{ available: boolean; snapshot?: any }> => {
    try {
      const configRes = await fetch('/api/woo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cfg.url,
          consumerKey: cfg.consumerKey,
          consumerSecret: cfg.consumerSecret,
          autoSync: cfg.autoSync,
          intervalHours: cfg.syncIntervalHours || 1,
        }),
      });
      if (!configRes.ok) throw new Error(`HTTP ${configRes.status}`);
      const statusData = await configRes.json();
      setServerStatus({
        available: true,
        autoSync: Boolean(statusData?.status?.autoSync),
        lastSync: statusData?.status?.lastSync ?? null,
        lastError: statusData?.status?.lastError ?? null,
        nextRunAt: statusData?.status?.nextRunAt ?? null,
      });

      const syncRes = await fetch('/api/woo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localData || {}),
      });
      if (!syncRes.ok) throw new Error(`HTTP ${syncRes.status}`);

      const snapshotRes = await fetch('/api/woo/snapshot');
      const snapshotData = snapshotRes.ok ? await snapshotRes.json() : null;

      const statusAfter = await fetch('/api/woo/status');
      if (statusAfter.ok) {
        const st = await statusAfter.json();
        setServerStatus({
          available: true,
          autoSync: Boolean(st.autoSync),
          lastSync: st.lastSync ?? null,
          lastError: st.lastError ?? null,
          nextRunAt: st.nextRunAt ?? null,
        });
      }

      return { available: true, snapshot: snapshotData?.snapshot ?? null };
    } catch {
      setServerStatus(prev => ({ ...prev, available: false }));
      return { available: false };
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // WooCommerce Synced Data State
  const [wooCustomers, setWooCustomers] = useState<Customer[]>([]);

  // New manual product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newPrecio, setNewPrecio] = useState('');
  const [newStock, setNewStock] = useState('');

  const handleSaveConfigOnly = () => {
    const updatedConfig: WooCommerceConfig = {
      url,
      consumerKey,
      consumerSecret,
      autoSync,
      syncIntervalHours,
      ultimoSync: config.ultimoSync,
      conectado: Boolean(url && consumerKey)
    };
    onUpdateConfig(updatedConfig);
    setSyncStatus('Configuración de WooCommerce y automatización guardadas.');
    addSystemLog('INFO', 'WooCommerce', `Configuración actualizada (AutoSync: ${autoSync ? `Activo cada ${syncIntervalHours}h` : 'Inactivo'})`);
    // Fix E: el servidor se encarga de la programación (corre con la app cerrada)
    void publishConfigToServer(updatedConfig);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatus('Sincronizando catálogo y clientes desde WooCommerce...');

    try {
      const activeConfig: WooCommerceConfig = {
        url,
        consumerKey,
        consumerSecret,
        autoSync,
        syncIntervalHours,
        ultimoSync: new Date().toISOString(),
        conectado: true
      };

      // Fix D / W5: se intenta primero la sincronización EN EL SERVIDOR, que combina
      // (merge) lo de la tienda con el catálogo/clientes locales y evita borrados.
      // Si el servidor no está disponible, se cae al modo navegador (merge local igual).
      const serverResult = await syncThroughServer(activeConfig);

      if (serverResult.available && serverResult.snapshot) {
        const snap = serverResult.snapshot;
        if (Array.isArray(snap.products) && onSyncCatalog) onSyncCatalog(snap.products);
        if (Array.isArray(snap.customers)) {
          setWooCustomers(snap.customers);
          if (onSyncCustomers) onSyncCustomers(snap.customers);
        }
        onUpdateConfig({ ...activeConfig, ultimoSync: snap.fetchedAt || activeConfig.ultimoSync });
        const merge = snap.merge || {};
        setSyncStatus(
          `¡Sincronización exitosa en el servidor! ${snap.wooCounts?.products ?? 0} productos de la tienda ` +
            `(+${merge.productsAdded ?? 0} nuevos, ${merge.productsUpdated ?? 0} actualizados, ` +
            `${merge.productsLocalKept ?? 0} locales conservados) y ${snap.customers?.length ?? 0} clientes.`
        );
        addSystemLog('SYNC', 'WooCommerce', 'Sincronización WooCommerce ejecutada por el servidor (con merge, sin borrados)');
        return;
      }

      // --- Modo navegador (sin servidor) ---
      const fetchedProducts = await fetchWooCommerceProducts(activeConfig);
      if (onSyncCatalog) {
        onSyncCatalog(fetchedProducts); // handleSyncCatalog combina, no reemplaza (Fix D)
      }

      const fetchedCustomers = await fetchWooCommerceCustomers(activeConfig);
      setWooCustomers(fetchedCustomers);
      if (onSyncCustomers) {
        onSyncCustomers(fetchedCustomers);
      }

      onUpdateConfig(activeConfig);
      setSyncStatus(
        `¡Sincronización exitosa! ${fetchedProducts.length} productos de la tienda combinados con el catálogo local y ${fetchedCustomers.length} clientes procesados.`
      );
      addSystemLog('SYNC', 'WooCommerce', `Sincronización (navegador) exitosa: ${fetchedProducts.length} productos, ${fetchedCustomers.length} clientes`);
    } catch (error: any) {
      setSyncStatus(`Error de sincronización: ${error.message}`);
      addSystemLog('ERROR', 'WooCommerce', `Fallo al sincronizar WooCommerce: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || !newPrecio) {
      alert('Ingresa el nombre y precio del producto');
      return;
    }

    const created: CatalogProduct = {
      id: `p-cat-${Date.now()}`,
      sku: newSku || `SKU-${Math.floor(100 + Math.random() * 900)}`,
      nombre: newNombre,
      precio: parseFloat(newPrecio) || 0,
      stock: parseInt(newStock, 10) || 10,
      origen: 'Manual'
    };

    onAddCatalogProduct(created);
    addSystemLog('INFO', 'Catalog', `Producto agregado manualmente al catálogo: ${created.nombre}`);
    setShowAddProduct(false);
    setNewSku('');
    setNewNombre('');
    setNewPrecio('');
    setNewStock('');
  };

  const filteredCatalog = catalog.filter((p) =>
    `${p.nombre} ${p.sku} ${p.categoria}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = (wooCustomers.length > 0 ? wooCustomers : customers.filter(c => c.origen === 'WooCommerce' || c.canalHabitual === 'WooCommerce')).filter((c) =>
    `${c.razonSocialNombre} ${c.apellido} ${c.dniCuit} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-400 p-2 rounded-lg border border-purple-200 dark:border-purple-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Integración API WooCommerce: Productos &amp; Clientes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincroniza y consulta en tiempo real los productos y los clientes de tu tienda online
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Section 1: WooCommerce API Credentials */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Key className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Credenciales de Conexión WooCommerce REST API
              </span>
              {config.conectado && (
                <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> API Conectada
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-slate-500 dark:text-slate-400 mb-1">URL de tu tienda WooCommerce *</label>
                <input
                  type="text"
                  placeholder="https://mitienda-ecommerce.com"
                  value={url}
                  disabled={credentialsLocked}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Consumer Key (ck_...)</label>
                <input
                  type="password"
                  value={consumerKey}
                  disabled={credentialsLocked}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Consumer Secret (cs_...)</label>
                <input
                  type="password"
                  value={consumerSecret}
                  disabled={credentialsLocked}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
                </button>
              </div>
            </div>

            {credentialsLocked && (
              <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-2.5 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                <span>
                  Las claves de API están bloqueadas para el perfil <strong>Operador</strong> (Configuración → Seguridad).
                  Un Administrador puede editarlas. La sincronización programada sigue funcionando con las claves guardadas.
                </span>
              </div>
            )}

            {/* Auto-Sync & Schedule Configuration Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <span>Automatizar sincronización periódica en segundo plano</span>
                </label>

                {autoSync && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Frecuencia:</span>
                    <select
                      value={syncIntervalHours}
                      onChange={(e) => setSyncIntervalHours(Number(e.target.value))}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value={1}>Cada 1 hora</option>
                      <option value={2}>Cada 2 horas</option>
                      <option value={4}>Cada 4 horas</option>
                      <option value={6}>Cada 6 horas</option>
                      <option value={12}>Cada 12 horas</option>
                      <option value={24}>Cada 24 horas</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Última sync: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {config.ultimoSync ? new Date(config.ultimoSync).toLocaleString() : 'Nunca'}
                  </span>
                </div>
                <div className="text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Automatización: </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded border ${
                      autoSync
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {autoSync ? `Activa cada ${syncIntervalHours} h` : 'Inactiva'}
                  </span>
                  {autoSaveState === 'saving' && (
                    <span className="text-amber-600 dark:text-amber-400 ml-1.5 inline-flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin inline" /> Guardando...
                    </span>
                  )}
                  {autoSaveState === 'saved' && (
                    <span className="text-emerald-600 dark:text-emerald-400 ml-1.5 inline-flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3 inline" /> Guardado
                    </span>
                  )}
                  {autoSaveState === 'idle' && (
                    <span className="text-slate-400 dark:text-slate-500 ml-1">
                      (autoguardado activo)
                    </span>
                  )}
                </div>
                <div className="text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Servidor: </span>
                  {serverStatus.available ? (
                    <span
                      className={`font-bold px-2 py-0.5 rounded border ${
                        serverStatus.autoSync
                          ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                      title={
                        serverStatus.autoSync
                          ? 'El servidor sincroniza solo, aunque la aplicación esté cerrada'
                          : 'La configuración se publicará al guardar; después el servidor sincroniza con la app cerrada'
                      }
                    >
                      {serverStatus.autoSync
                        ? `sincroniza solo${serverStatus.nextRunAt ? ` · próxima ${new Date(serverStatus.nextRunAt).toLocaleTimeString()}` : ''}`
                        : 'disponible (programación inactiva)'}
                    </span>
                  ) : (
                    <span className="font-bold px-2 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                      no disponible · modo navegador
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSaveConfigOnly}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 font-semibold px-3 py-1 rounded border border-purple-200 dark:border-purple-500/30 cursor-pointer"
                >
                  Guardar Ajustes
                </button>
              </div>
            </div>

            {/* Sync Rules Info Notice */}
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded p-2.5 text-[11px] text-purple-900 dark:text-purple-200/90 space-y-1">
              <p><span className="font-bold text-purple-700 dark:text-purple-300">📦 Regla de Productos:</span> Al sincronizar, se reemplazan completamente todos los productos del catálogo por la lista actualizada recibida desde WooCommerce.</p>
              <p><span className="font-bold text-purple-700 dark:text-purple-300">👥 Regla de Clientes:</span> Se agregan únicamente los clientes nuevos que no existían previamente en tu directorio de clientes.</p>
            </div>

            {syncStatus && (
              <div className="mt-2 text-[11px] p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>{syncStatus}</span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-2 px-1 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'products'
                  ? 'border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Catálogo de Productos ({catalog.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`pb-2 px-1 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'customers'
                  ? 'border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Clientes WooCommerce ({filteredCustomers.length})</span>
            </button>
          </div>

          {/* Section 2: Tab Content */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            
            {/* Search bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'products'
                      ? 'Buscar productos por nombre, SKU o categoría...'
                      : 'Buscar clientes por nombre, CUIT, email...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded pl-8 pr-3 py-1.5 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>

              {activeTab === 'products' && (
                <button
                  onClick={() => setShowAddProduct(!showAddProduct)}
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Agregar Producto Manual</span>
                </button>
              )}
            </div>

            {/* Add product form */}
            {activeTab === 'products' && showAddProduct && (
              <form onSubmit={handleAddProduct} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-300 text-xs">Nuevo Producto en Catálogo</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="SKU"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-100 font-mono"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nombre del Producto *"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-100 sm:col-span-2"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Precio ($) *"
                    value={newPrecio}
                    onChange={(e) => setNewPrecio(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowAddProduct(false)} className="px-2 py-1 text-slate-500 dark:text-slate-400">Cancelar</button>
                  <button type="submit" className="bg-emerald-600 text-white px-3 py-1 rounded font-medium cursor-pointer">Guardar</button>
                </div>
              </form>
            )}

            {/* Products Table */}
            {activeTab === 'products' && (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2">Foto</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Producto</th>
                      <th className="p-2 text-right">Precio Actual</th>
                      <th className="p-2 text-center">Stock</th>
                      <th className="p-2">Origen / Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                    {filteredCatalog.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/50">
                        <td className="p-2">
                          <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                            {p.imagenUrl ? (
                              <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">Sin foto</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-cyan-700 dark:text-cyan-400 font-bold">{p.sku}</td>
                        <td className="p-2 font-sans text-slate-800 dark:text-slate-200">
                          <div>
                            <span className="font-semibold">{p.nombre}</span>
                            {p.categoria && (
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400">{p.categoria}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.precio)}</td>
                        <td className="p-2 text-center text-slate-700 dark:text-slate-300">
                          {p.stock <= 0 ? (
                            <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] border border-red-200 dark:border-red-800 font-bold">
                              Sin stock (0)
                            </span>
                          ) : (
                            <span>{p.stock} u.</span>
                          )}
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400 font-sans">
                          <div className="flex flex-wrap gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.origen === 'WooCommerce' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                              {p.origen}
                            </span>
                            {p.estadoWoo && p.estadoWoo !== 'publish' && (
                              <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                Oculto ({p.estadoWoo})
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Customers Table */}
            {activeTab === 'customers' && (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2">ID Cliente</th>
                      <th className="p-2">Cliente / Razón Social</th>
                      <th className="p-2">CUIT / DNI</th>
                      <th className="p-2">Teléfono / Email</th>
                      <th className="p-2">Dirección</th>
                      <th className="p-2">Origen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                    {isSyncing ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 font-sans">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-semibold">Cargando y sincronizando clientes desde WooCommerce...</span>
                            <span className="text-[10px] text-slate-400">Por favor, ten paciencia mientras se consulta la API.</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 dark:text-slate-500 font-sans">
                          No hay clientes sincronizados de WooCommerce. Presiona "Sincronizar Productos y Clientes".
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/50">
                          <td className="p-2 text-purple-700 dark:text-purple-400 font-bold">{c.clienteId}</td>
                          <td className="p-2 font-sans text-slate-800 dark:text-slate-200 font-medium">
                            {c.razonSocialNombre} {c.apellido || ''}
                          </td>
                          <td className="p-2 text-slate-700 dark:text-slate-300">{c.dniCuit}</td>
                          <td className="p-2 font-sans text-slate-700 dark:text-slate-300">
                            <div>{c.telefono}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-500">{c.email}</div>
                          </td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{c.direccion}</td>
                          <td className="p-2 font-sans">
                            <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px]">
                              WooCommerce
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
