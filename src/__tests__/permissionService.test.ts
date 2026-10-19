import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRolePermissions,
  saveRolePermissions,
  resolveUserPermission,
  canViewTool,
  canModifyTool,
} from '../services/permissionService';
import { TOOL_REGISTRY } from '../config/toolRegistry';

describe('permissionService', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, val: string) => {
        mockStore[key] = val;
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

  describe('Resolución de permisos', () => {
    it('el rol ADMIN siempre tiene acceso full a cualquier herramienta (BR-RBAC-001)', () => {
      for (const tool of TOOL_REGISTRY) {
        expect(resolveUserPermission('ADMIN', tool.id)).toBe('full');
        expect(canViewTool('ADMIN', tool.id)).toBe(true);
        expect(canModifyTool('ADMIN', tool.id)).toBe(true);
      }
    });

    it('el rol OPERADOR obtiene sus permisos por defecto', () => {
      expect(resolveUserPermission('OPERADOR', 'ventas')).toBe('full');
      expect(resolveUserPermission('OPERADOR', 'catalogo')).toBe('read');
      expect(resolveUserPermission('OPERADOR', 'configuracion')).toBe('none');
      expect(resolveUserPermission('OPERADOR', 'seguridad')).toBe('none');

      expect(canViewTool('OPERADOR', 'ventas')).toBe(true);
      expect(canModifyTool('OPERADOR', 'ventas')).toBe(true);

      expect(canViewTool('OPERADOR', 'catalogo')).toBe(true);
      expect(canModifyTool('OPERADOR', 'catalogo')).toBe(false);

      expect(canViewTool('OPERADOR', 'configuracion')).toBe(false);
      expect(canModifyTool('OPERADOR', 'configuracion')).toBe(false);
    });

    it('actualiza y persiste cambios en la matriz de permisos', () => {
      const current = getRolePermissions();
      // Cambiar catálogo a full y ventas a read para Operador
      current.OPERADOR.catalogo = 'full';
      current.OPERADOR.ventas = 'read';

      saveRolePermissions(current);

      expect(resolveUserPermission('OPERADOR', 'catalogo')).toBe('full');
      expect(resolveUserPermission('OPERADOR', 'ventas')).toBe('read');
      expect(canModifyTool('OPERADOR', 'ventas')).toBe(false);
    });

    it('garantiza que ADMIN nunca se guarde sin acceso full', () => {
      const current = getRolePermissions();
      // Intento malicioso de poner none al Admin
      current.ADMIN = { ventas: 'none', seguridad: 'none' };

      saveRolePermissions(current);

      expect(resolveUserPermission('ADMIN', 'seguridad')).toBe('full');
      expect(resolveUserPermission('ADMIN', 'ventas')).toBe('full');
    });
  });
});
