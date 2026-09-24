import { Sale, Customer, CatalogProduct, Budget, AppConfig, WooCommerceConfig } from '../types';
import {
  INITIAL_SALES,
  INITIAL_CATALOG,
  INITIAL_BUDGETS,
  INITIAL_DEMO_CUSTOMERS,
  INITIAL_CONFIG,
  INITIAL_WOO_CONFIG,
  DEMO_SEED_ENABLED
} from '../data/initialData';

/**
 * Contrato de repositorio de persistencia para SalesHub.
 * Permite alternar de forma transparente entre LocalStorage, IndexedDB,
 * o una API REST / WebSocket remota para despliegues multi-sucursal.
 */
export interface IStorageRepository {
  getSales(): Promise<Sale[]>;
  saveSales(sales: Sale[]): Promise<void>;
  getCatalog(): Promise<CatalogProduct[]>;
  saveCatalog(catalog: CatalogProduct[]): Promise<void>;
  getCustomers(): Promise<Customer[]>;
  saveCustomers(customers: Customer[]): Promise<void>;
  getBudgets(): Promise<Budget[]>;
  saveBudgets(budgets: Budget[]): Promise<void>;
  getConfig(): Promise<AppConfig>;
  saveConfig(config: AppConfig): Promise<void>;
  getWooConfig(): Promise<WooCommerceConfig>;
  saveWooConfig(wooConfig: WooCommerceConfig): Promise<void>;
}

export class LocalStorageRepository implements IStorageRepository {
  private readonly SALES_KEY = 'app_sales_v1';
  private readonly CATALOG_KEY = 'app_catalog_v1';
  private readonly CUSTOMERS_KEY = 'app_customers_v1';
  private readonly BUDGETS_KEY = 'app_budgets_v1';
  private readonly CONFIG_KEY = 'app_config_v1';
  private readonly WOO_CONFIG_KEY = 'app_woo_config_v1';

  async getSales(): Promise<Sale[]> {
    try {
      const saved = localStorage.getItem(this.SALES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error leyendo ventas desde almacenamiento:', e);
    }
    return DEMO_SEED_ENABLED ? INITIAL_SALES : [];
  }

  async saveSales(sales: Sale[]): Promise<void> {
    try {
      localStorage.setItem(this.SALES_KEY, JSON.stringify(sales));
    } catch (e) {
      console.error('Error guardando ventas:', e);
    }
  }

  async getCatalog(): Promise<CatalogProduct[]> {
    try {
      const saved = localStorage.getItem(this.CATALOG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error leyendo catálogo:', e);
    }
    return DEMO_SEED_ENABLED ? INITIAL_CATALOG : [];
  }

  async saveCatalog(catalog: CatalogProduct[]): Promise<void> {
    try {
      localStorage.setItem(this.CATALOG_KEY, JSON.stringify(catalog));
    } catch (e) {
      console.error('Error guardando catálogo:', e);
    }
  }

  async getCustomers(): Promise<Customer[]> {
    try {
      const saved = localStorage.getItem(this.CUSTOMERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error leyendo clientes:', e);
    }
    return DEMO_SEED_ENABLED ? INITIAL_DEMO_CUSTOMERS : [];
  }

  async saveCustomers(customers: Customer[]): Promise<void> {
    try {
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error('Error guardando clientes:', e);
    }
  }

  async getBudgets(): Promise<Budget[]> {
    try {
      const saved = localStorage.getItem(this.BUDGETS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error leyendo presupuestos:', e);
    }
    return DEMO_SEED_ENABLED ? INITIAL_BUDGETS : [];
  }

  async saveBudgets(budgets: Budget[]): Promise<void> {
    try {
      localStorage.setItem(this.BUDGETS_KEY, JSON.stringify(budgets));
    } catch (e) {
      console.error('Error guardando presupuestos:', e);
    }
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_CONFIG,
          ...parsed,
          metodosEnvio: parsed.metodosEnvio || INITIAL_CONFIG.metodosEnvio,
          estadosEnvio: parsed.estadosEnvio || INITIAL_CONFIG.estadosEnvio
        };
      }
    } catch (e) {
      console.error('Error leyendo configuración:', e);
    }
    return INITIAL_CONFIG;
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error guardando configuración:', e);
    }
  }

  async getWooConfig(): Promise<WooCommerceConfig> {
    try {
      const saved = localStorage.getItem(this.WOO_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error leyendo configuración de WooCommerce:', e);
    }
    return INITIAL_WOO_CONFIG;
  }

  async saveWooConfig(wooConfig: WooCommerceConfig): Promise<void> {
    try {
      localStorage.setItem(this.WOO_CONFIG_KEY, JSON.stringify(wooConfig));
    } catch (e) {
      console.error('Error guardando configuración de WooCommerce:', e);
    }
  }
}

export const defaultStorageRepository: IStorageRepository = new LocalStorageRepository();
