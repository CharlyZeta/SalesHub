/// <reference types="vite/client" />

/**
 * Variables de entorno de Vite (prefijo VITE_) usadas por la aplicación.
 * Ver `.env.example` para la documentación de cada una.
 */
interface ImportMetaEnv {
  /**
   * `true` = sembrar datos de demostración (ventas, catálogo, presupuestos y
   * clientes de ejemplo) cuando la base local está vacía.
   * Por defecto NO se siembran datos demo: una instalación nueva arranca vacía.
   */
  readonly VITE_SEED_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
