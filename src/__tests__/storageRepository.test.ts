import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/storageRepository';

describe('LocalStorageRepository', () => {
  let repo: LocalStorageRepository;
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
    repo = new LocalStorageRepository();
  });

  it('guarda y recupera ventas en el almacenamiento', async () => {
    const mockSales: any[] = [
      { id: 'V-001', clienteNombre: 'Test Cliente', montoTotal: 1500, fecha: '2026-09-24', productos: [] }
    ];

    await repo.saveSales(mockSales);
    const retrieved = await repo.getSales();

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].clienteNombre).toBe('Test Cliente');
    expect(retrieved[0].montoTotal).toBe(1500);
  });

  it('guarda y recupera configuración de la empresa', async () => {
    const mockConfig: any = {
      empresa: {
        nombre: 'Firma Modelo S.A.',
        cuit: '30-11223344-5'
      }
    };

    await repo.saveConfig(mockConfig);
    const retrieved = await repo.getConfig();

    expect(retrieved.empresa?.nombre).toBe('Firma Modelo S.A.');
    expect(retrieved.empresa?.cuit).toBe('30-11223344-5');
  });

  it('guarda y recupera presupuestos y catálogo', async () => {
    const mockCatalog: any[] = [{ id: '1', nombre: 'Producto 1', precio: 100 }];
    const mockBudgets: any[] = [{ id: 'PRE-001', numeroPresupuesto: 'P0001-00000001', importeTotal: 100 }];

    await repo.saveCatalog(mockCatalog);
    await repo.saveBudgets(mockBudgets);

    const catalog = await repo.getCatalog();
    const budgets = await repo.getBudgets();

    expect(catalog).toHaveLength(1);
    expect(budgets).toHaveLength(1);
    expect(catalog[0].nombre).toBe('Producto 1');
    expect(budgets[0].numeroPresupuesto).toBe('P0001-00000001');
  });
});
