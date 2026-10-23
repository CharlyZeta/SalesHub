import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEncargos,
  addEncargo,
  updateEncargo,
  deleteEncargo,
  getEncargosMetrics,
  agruparParaCompras,
  generarMensajeWhatsAppProveedor,
  generarMensajeWhatsAppCliente,
  generarUrlWhatsApp,
  crearProductoDeEncargo,
  ItemCompraConsolidado,
} from '../services/encargosService';
import { EncargoItem, CatalogProduct } from '../types';

describe('encargosService', () => {
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
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('CRUD de encargos', () => {
    it('retorna array vacío si no hay encargos guardados', () => {
      expect(getEncargos()).toEqual([]);
    });

    it('agrega un nuevo encargo con ID generado, fecha y estado inicial', () => {
      const nuevo = addEncargo({
        tipo: 'producto',
        clienteTipo: 'prospecto',
        clienteNombre: 'Carlos Gomez',
        clienteTelefono: '3764123456',
        productoNombre: 'Taladro Percutor 750W',
        cantidad: 2,
        precioEstimado: 85000,
        seña: 20000,
        proveedorSugerido: 'Distribuidora Norte',
      });

      expect(nuevo.id).toMatch(/^ENC-\d{6}-\d{3}$/);
      expect(nuevo.estado).toBe('pendiente_compra');
      expect(nuevo.cantidad).toBe(2);
      expect(nuevo.productoNombre).toBe('Taladro Percutor 750W');
      expect(nuevo.fechaRegistro).toBeDefined();

      const guardados = getEncargos();
      expect(guardados).toHaveLength(1);
      expect(guardados[0].id).toBe(nuevo.id);
    });

    it('actualiza un encargo existente', () => {
      const item = addEncargo({
        tipo: 'repuesto',
        clienteTipo: 'agendado',
        clienteNombre: 'Ana Lopez',
        productoNombre: 'Filtro de Aceite',
        cantidad: 1,
      });

      const updated = updateEncargo(item.id, {
        estado: 'pedido_proveedor',
        proveedorSugerido: 'Repuestos SA',
      });

      expect(updated).not.toBeNull();
      expect(updated?.estado).toBe('pedido_proveedor');
      expect(updated?.proveedorSugerido).toBe('Repuestos SA');

      const guardados = getEncargos();
      expect(guardados[0].estado).toBe('pedido_proveedor');
    });

    it('elimina un encargo existente', () => {
      const item = addEncargo({
        tipo: 'producto',
        clienteTipo: 'prospecto',
        clienteNombre: 'Mario Santos',
        productoNombre: 'Tester Digital',
        cantidad: 1,
      });

      expect(getEncargos()).toHaveLength(1);
      const ok = deleteEncargo(item.id);
      expect(ok).toBe(true);
      expect(getEncargos()).toHaveLength(0);
    });

    it('retorna null al actualizar un id inexistente', () => {
      const res = updateEncargo('INEXISTENTE', { estado: 'recibido' });
      expect(res).toBeNull();
    });

    it('retorna false al eliminar un id inexistente', () => {
      const ok = deleteEncargo('INEXISTENTE');
      expect(ok).toBe(false);
    });
  });

  describe('agruparParaCompras', () => {
    it('consolida cantidades de productos con el mismo nombre y agrupa clientes', () => {
      addEncargo({
        tipo: 'producto',
        clienteTipo: 'prospecto',
        clienteNombre: 'Juan Perez',
        productoNombre: 'Amoladora 115mm',
        cantidad: 2,
        proveedorSugerido: 'Herramientas SA',
      });

      addEncargo({
        tipo: 'producto',
        clienteTipo: 'agendado',
        clienteNombre: 'Pedro Gomez',
        productoNombre: 'amoladora 115mm ', // diferencia de mayúsculas y espacios
        cantidad: 3,
        proveedorSugerido: 'Herramientas SA',
      });

      addEncargo({
        tipo: 'repuesto',
        clienteTipo: 'prospecto',
        clienteNombre: 'Luis Fernandez',
        productoNombre: 'Carbones para Motor',
        cantidad: 1,
        proveedorSugerido: 'ElectroPartes',
      });

      const consolidado = agruparParaCompras(getEncargos(), 'pendiente_compra');

      expect(consolidado).toHaveLength(2);
      const amoladora = consolidado.find((c) => c.productoNombre.toLowerCase().includes('amoladora'));
      expect(amoladora).toBeDefined();
      expect(amoladora?.cantidadTotal).toBe(5);
      expect(amoladora?.clientes.map((c) => c.nombre)).toEqual(expect.arrayContaining(['Juan Perez', 'Pedro Gomez']));
    });
  });

  describe('Métricas de demanda', () => {
    it('calcula métricas correctamente', () => {
      addEncargo({
        tipo: 'producto',
        clienteTipo: 'prospecto',
        clienteNombre: 'C1',
        productoNombre: 'P1',
        cantidad: 1,
        seña: 5000,
      }); // pendiente_compra

      const e2 = addEncargo({
        tipo: 'repuesto',
        clienteTipo: 'agendado',
        clienteNombre: 'C2',
        productoNombre: 'P2',
        cantidad: 2,
      });
      updateEncargo(e2.id, { estado: 'pedido_proveedor' });

      const e3 = addEncargo({
        tipo: 'producto',
        clienteTipo: 'prospecto',
        clienteNombre: 'C3',
        productoNombre: 'P3',
        cantidad: 1,
      });
      updateEncargo(e3.id, { estado: 'recibido' });

      const metrics = getEncargosMetrics(getEncargos());
      expect(metrics.total).toBe(3);
      expect(metrics.pendientes).toBe(1);
      expect(metrics.pedidos).toBe(1);
      expect(metrics.recibidos).toBe(1);
      expect(metrics.entregados).toBe(0);
      expect(metrics.cancelados).toBe(0);
    });
  });

  describe('WhatsApp helpers', () => {
    it('genera texto para proveedor con lista consolidada', () => {
      const items: ItemCompraConsolidado[] = [
        {
          key: 'producto::taladro 13mm',
          productoNombre: 'Taladro 13mm',
          cantidadTotal: 3,
          tipo: 'producto',
          proveedorSugerido: 'Herramientas Mayoristas',
          encargosIds: ['ENC-001'],
          clientes: [{ nombre: 'Juan', cantidad: 3 }],
        },
      ];

      const texto = generarMensajeWhatsAppProveedor(items, 'Mi Empresa');
      expect(texto).toContain('Mi Empresa');
      expect(texto).toContain('Taladro 13mm');
      expect(texto).toContain('[x3]');
    });

    it('genera texto para cliente al recibir su encargo', () => {
      const encargo: EncargoItem = {
        id: 'ENC-202610-001',
        tipo: 'producto',
        clienteTipo: 'prospecto',
        clienteNombre: 'Roberto Martinez',
        clienteTelefono: '3764001122',
        productoNombre: 'Bomba Sumergible 1HP',
        cantidad: 1,
        seña: 30000,
        precioEstimado: 120000,
        estado: 'recibido',
        fechaRegistro: new Date().toISOString(),
      };

      const msg = generarMensajeWhatsAppCliente(encargo, 'Ferretería Central');
      expect(msg).toContain('Roberto');
      expect(msg).toContain('Ferretería Central');
      expect(msg).toContain('Bomba Sumergible 1HP');
      expect(msg).toContain('Saldo restante');
    });

    it('construye URL de WhatsApp correctamente', () => {
      const url = generarUrlWhatsApp('376-412-3456', 'Hola mundo');
      expect(url).toContain('https://wa.me/5493764123456?text=Hola%20mundo');
    });
  });

  describe('crearProductoDeEncargo', () => {
    it('genera un CatalogProduct listo si no existe en el catálogo', () => {
      const encargo: EncargoItem = {
        id: 'ENC-202610-005',
        tipo: 'repuesto',
        clienteTipo: 'prospecto',
        clienteNombre: 'Cliente X',
        productoNombre: 'Batería 12V 7Ah',
        cantidad: 2,
        precioEstimado: 35000,
        estado: 'recibido',
        fechaRegistro: new Date().toISOString(),
      };

      const catalogoExistente: CatalogProduct[] = [];
      const res = crearProductoDeEncargo(encargo, catalogoExistente);

      expect(res.yaExiste).toBe(false);
      expect(res.producto.nombre).toBe('Batería 12V 7Ah');
      expect(res.producto.precio).toBe(35000);
      expect(res.producto.stock).toBe(2);
      expect(res.producto.categoria).toBe('Repuestos');
    });

    it('reutiliza el producto si ya existía en el catálogo', () => {
      const encargo: EncargoItem = {
        id: 'ENC-202610-006',
        tipo: 'producto',
        clienteTipo: 'prospecto',
        clienteNombre: 'Cliente Y',
        productoNombre: 'Amoladora Angular',
        cantidad: 1,
        estado: 'recibido',
        fechaRegistro: new Date().toISOString(),
      };

      const catalogoExistente: CatalogProduct[] = [
        {
          id: '555',
          sku: 'SKU-555',
          nombre: 'Amoladora Angular',
          precio: 60000,
          stock: 4,
          origen: 'Manual',
        },
      ];

      const res = crearProductoDeEncargo(encargo, catalogoExistente);
      expect(res.yaExiste).toBe(true);
      expect(res.producto.id).toBe('555');
    });
  });
});
