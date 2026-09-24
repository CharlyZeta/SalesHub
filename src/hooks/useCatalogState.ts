import type React from 'react';
import { useState, useEffect } from 'react';
import { CatalogProduct } from '../types';
import { INITIAL_CATALOG, DEMO_SEED_ENABLED } from '../data/initialData';

export interface UseCatalogStateReturn {
  catalog: CatalogProduct[];
  setCatalog: React.Dispatch<React.SetStateAction<CatalogProduct[]>>;
  handleAddCatalogProduct: (newProduct: CatalogProduct) => void;
}

export function useCatalogState(): UseCatalogStateReturn {
  const [catalog, setCatalog] = useState<CatalogProduct[]>(() => {
    const saved = localStorage.getItem('app_catalog_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEMO_SEED_ENABLED ? INITIAL_CATALOG : [];
  });

  useEffect(() => {
    localStorage.setItem('app_catalog_v1', JSON.stringify(catalog));
  }, [catalog]);

  const handleAddCatalogProduct = (newProduct: CatalogProduct) => {
    setCatalog((prev) => [newProduct, ...prev]);
  };

  return {
    catalog,
    setCatalog,
    handleAddCatalogProduct
  };
}
