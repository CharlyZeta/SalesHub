import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { WooCommerceConfig, CatalogProduct, Customer } from '../types';
import { INITIAL_WOO_CONFIG } from '../data/initialData';
import { addSystemLog } from '../utils/logger';
import { fetchWooCommerceProducts, fetchWooCommerceCustomers } from '../utils/wooCommerceApi';

export interface UseWooCommerceSyncProps {
  catalog: CatalogProduct[];
  setCatalog: React.Dispatch<React.SetStateAction<CatalogProduct[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export interface UseWooCommerceSyncReturn {
  wooConfig: WooCommerceConfig;
  setWooConfig: React.Dispatch<React.SetStateAction<WooCommerceConfig>>;
  wooSyncStatus: {
    failureCount: number;
    lastError?: string;
    lastSuccessAt?: string;
    nextAttemptAt?: string;
  };
  setWooSyncStatus: React.Dispatch<
    React.SetStateAction<{
      failureCount: number;
      lastError?: string;
      lastSuccessAt?: string;
      nextAttemptAt?: string;
    }>
  >;
  serverSync: {
    available: boolean;
    autoSync: boolean;
    lastSync: string | null;
    lastError: string | null;
    nextRunAt: string | null;
    mergeSummary?: {
      productsAdded: number;
      productsUpdated: number;
      productsLocalKept: number;
      customersAdded: number;
    } | null;
  };
  setServerSync: React.Dispatch<
    React.SetStateAction<{
      available: boolean;
      autoSync: boolean;
      lastSync: string | null;
      lastError: string | null;
      nextRunAt: string | null;
    }>
  >;
  wooSyncBackoffRef: React.MutableRefObject<number>;
  wooSyncNextAttemptRef: React.MutableRefObject<number>;
  handleSyncCatalog: (syncedProducts: CatalogProduct[]) => void;
  handleSyncCustomers: (syncedCustomers: Customer[]) => void;
  localMergePayload: () => { products: any[]; customers: any[] };
}

export function useWooCommerceSync({
  catalog,
  setCatalog,
  customers,
  setCustomers
}: UseWooCommerceSyncProps): UseWooCommerceSyncReturn {
  const [wooConfig, setWooConfig] = useState<WooCommerceConfig>(() => {
    const saved = localStorage.getItem('app_woo_config_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_WOO_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem('app_woo_config_v1', JSON.stringify(wooConfig));
  }, [wooConfig]);

  const wooSyncBackoffRef = useRef<number>(0);
  const wooSyncNextAttemptRef = useRef<number>(0);

  const [wooSyncStatus, setWooSyncStatus] = useState<{
    failureCount: number;
    lastError?: string;
    lastSuccessAt?: string;
    nextAttemptAt?: string;
  }>({ failureCount: 0 });

  const [serverSync, setServerSync] = useState<{
    available: boolean;
    autoSync: boolean;
    lastSync: string | null;
    lastError: string | null;
    nextRunAt: string | null;
  }>({ available: false, autoSync: false, lastSync: null, lastError: null, nextRunAt: null });

  /**
   * Aplica el catálogo recibido (de la tienda) combinándolo con el local (Fix D / W5)
   */
  const handleSyncCatalog = useCallback((syncedProducts: CatalogProduct[]) => {
    setCatalog((prevCatalog) => {
      const merged = prevCatalog.map((p) => ({ ...p }));
      const bySku = new Map<string, CatalogProduct>();
      const byName = new Map<string, CatalogProduct>();
      merged.forEach((p) => {
        if (p.sku) bySku.set(p.sku.trim().toLowerCase(), p);
        if (p.nombre) byName.set(p.nombre.trim().toLowerCase(), p);
      });

      let added = 0;
      for (const incoming of syncedProducts) {
        const key = incoming.sku?.trim().toLowerCase();
        const nameKey = incoming.nombre?.trim().toLowerCase();
        const existing = (key && bySku.get(key)) || (nameKey && byName.get(nameKey));
        if (existing) {
          existing.precio = incoming.precio;
          existing.stock = incoming.stock;
          existing.nombre = incoming.nombre || existing.nombre;
          if (incoming.categoria) existing.categoria = incoming.categoria;
          if (incoming.imagenUrl) existing.imagenUrl = incoming.imagenUrl;
          existing.estadoWoo = incoming.estadoWoo || existing.estadoWoo;
        } else {
          const product = { ...incoming };
          merged.push(product);
          if (product.sku) bySku.set(product.sku.trim().toLowerCase(), product);
          if (product.nombre) byName.set(product.nombre.trim().toLowerCase(), product);
          added++;
        }
      }

      addSystemLog(
        'SYNC',
        'WooCommerce',
        `Catálogo combinado: ${syncedProducts.length} de la tienda, ${added} nuevos, ${prevCatalog.length} locales conservados (sin borrados).`
      );
      return merged;
    });
  }, [setCatalog]);

  /**
   * Sincroniza clientes evitando duplicados
   */
  const handleSyncCustomers = useCallback((syncedCustomers: Customer[]) => {
    setCustomers((prevCustomers) => {
      const existingIds = new Set(prevCustomers.map((c) => c.clienteId?.toLowerCase().trim()).filter(Boolean));
      const existingEmails = new Set(prevCustomers.map((c) => c.email?.toLowerCase().trim()).filter(Boolean));

      const newOnly = syncedCustomers.filter((c) => {
        const cId = c.clienteId?.toLowerCase().trim();
        const email = c.email?.toLowerCase().trim();
        if (cId && existingIds.has(cId)) return false;
        if (email && email !== '' && !email.includes('@tienda.com') && existingEmails.has(email)) return false;
        return true;
      });

      return [...prevCustomers, ...newOnly];
    });
  }, [setCustomers]);

  const localMergePayload = () => ({
    products: catalog.map((p) => ({
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      precio: p.precio,
      stock: p.stock,
      categoria: p.categoria,
      origen: p.origen,
      imagenUrl: p.imagenUrl
    })),
    customers: customers.map((c) => ({
      clienteId: c.clienteId,
      id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      razonSocialNombre: c.razonSocialNombre,
      dniCuit: c.dniCuit,
      telefono: c.telefono,
      email: c.email,
      direccion: c.direccion,
      localidad: c.localidad,
      provincia: c.provincia,
      totalCompras: c.totalCompras,
      cantidadPedidos: c.cantidadPedidos,
      ultimaCompra: c.ultimaCompra,
      canalHabitual: c.canalHabitual,
      origen: c.origen
    }))
  });

  // Polling del estado de sincronización del servidor
  useEffect(() => {
    let cancelled = false;

    const pollServerSync = async () => {
      try {
        const statusRes = await fetch('/api/woo/status');
        if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
        const status = await statusRes.json();
        if (cancelled) return;

        setServerSync((prev) => ({
          ...prev,
          available: true,
          autoSync: Boolean(status.autoSync),
          lastSync: status.lastSync ?? null,
          lastError: status.lastError ?? null,
          nextRunAt: status.nextRunAt ?? null
        }));

        if (!status.autoSync || !status.hasSnapshot) return;

        const snapshotRes = await fetch('/api/woo/snapshot');
        if (!snapshotRes.ok) return;
        const { snapshot } = await snapshotRes.json();
        if (cancelled || !snapshot?.fetchedAt) return;

        const remoteTime = new Date(snapshot.fetchedAt).getTime();
        const localTime = wooConfig.ultimoSync ? new Date(wooConfig.ultimoSync).getTime() : 0;
        if (!Number.isFinite(remoteTime) || remoteTime <= localTime) return;

        if (Array.isArray(snapshot.products) && snapshot.products.length > 0) {
          setCatalog(snapshot.products);
        }
        if (Array.isArray(snapshot.customers) && snapshot.customers.length > 0) {
          setCustomers(snapshot.customers);
        }
        const fetchedAt = snapshot.fetchedAt;
        setWooConfig((prev) => ({ ...prev, ultimoSync: fetchedAt }));
        addSystemLog(
          'SYNC',
          'WooCommerce',
          `Sincronización aplicada desde el servidor: ${snapshot.products?.length ?? 0} productos y ${snapshot.customers?.length ?? 0} clientes (traídos con la app cerrada).`
        );
      } catch {
        if (!cancelled) {
          setServerSync((prev) => ({ ...prev, available: false }));
        }
      }
    };

    pollServerSync();
    const timer = setInterval(pollServerSync, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [wooConfig.ultimoSync, setCatalog, setCustomers]);

  // Sincronización automática de navegador (cuando no hay servidor activo)
  useEffect(() => {
    if (serverSync.available && serverSync.autoSync) return;
    if (!wooConfig.autoSync || !wooConfig.url || !wooConfig.conectado) {
      return;
    }

    const intervalHours = wooConfig.syncIntervalHours || 1;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const BASE_RETRY_MS = 60 * 1000;
    const MAX_RETRY_MS = 30 * 60 * 1000;

    const checkAutoSync = async () => {
      const now = Date.now();
      if (now < wooSyncNextAttemptRef.current) return;

      const lastSyncTime = wooConfig.ultimoSync ? new Date(wooConfig.ultimoSync).getTime() : 0;
      if (now - lastSyncTime < intervalMs) return;

      try {
        addSystemLog('SYNC', 'WooCommerce', `Iniciando sincronización automática programada (cada ${intervalHours} hora/s)...`);
        const fetchedProds = await fetchWooCommerceProducts(wooConfig);
        handleSyncCatalog(fetchedProds);

        const fetchedCusts = await fetchWooCommerceCustomers(wooConfig);
        handleSyncCustomers(fetchedCusts);

        const nowIso = new Date().toISOString();
        setWooConfig((prev) => ({
          ...prev,
          ultimoSync: nowIso
        }));

        wooSyncBackoffRef.current = 0;
        wooSyncNextAttemptRef.current = 0;
        setWooSyncStatus({ failureCount: 0, lastSuccessAt: nowIso });
        addSystemLog(
          'SYNC',
          'WooCommerce',
          `Sincronización automática exitosa: ${fetchedProds.length} productos y ${fetchedCusts.length} clientes. Próxima corrida programada en ${intervalHours} hora/s.`
        );
      } catch (err: any) {
        const message = err?.message || String(err);
        const failures = wooSyncBackoffRef.current + 1;
        wooSyncBackoffRef.current = failures;
        const retryMs = Math.min(BASE_RETRY_MS * Math.pow(2, failures - 1), MAX_RETRY_MS);
        wooSyncNextAttemptRef.current = Date.now() + retryMs;

        setWooSyncStatus((prev) => ({
          ...prev,
          failureCount: failures,
          lastError: message,
          nextAttemptAt: new Date(wooSyncNextAttemptRef.current).toISOString()
        }));
        addSystemLog(
          'ERROR',
          'WooCommerce',
          `Fallo en sincronización automática (intento ${failures}): ${message}. Próximo reintento en ${Math.round(retryMs / 60000)} min.`
        );
      }
    };

    checkAutoSync();
    const intervalTimer = setInterval(checkAutoSync, 60000);
    return () => clearInterval(intervalTimer);
  }, [wooConfig, serverSync.available, serverSync.autoSync, handleSyncCatalog, handleSyncCustomers]);

  return {
    wooConfig,
    setWooConfig,
    wooSyncStatus,
    setWooSyncStatus,
    serverSync,
    setServerSync,
    wooSyncBackoffRef,
    wooSyncNextAttemptRef,
    handleSyncCatalog,
    handleSyncCustomers,
    localMergePayload
  };
}
