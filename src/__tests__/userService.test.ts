import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getUsers,
  ensureDefaultAdminExists,
  createUser,
  updateUser,
  deleteUser,
  authenticateWithPassword,
  authenticateWithPin,
  getActiveSessionUser,
} from '../services/userService';

describe('userService', () => {
  let mockLocalStore: Record<string, string> = {};
  let mockSessionStore: Record<string, string> = {};

  beforeEach(() => {
    mockLocalStore = {};
    mockSessionStore = {};

    const mockLocalStorage = {
      getItem: (key: string) => mockLocalStore[key] || null,
      setItem: (key: string, val: string) => {
        mockLocalStore[key] = val;
      },
      removeItem: (key: string) => {
        delete mockLocalStore[key];
      },
      clear: () => {
        mockLocalStore = {};
      },
    };

    const mockSessionStorage = {
      getItem: (key: string) => mockSessionStore[key] || null,
      setItem: (key: string, val: string) => {
        mockSessionStore[key] = val;
      },
      removeItem: (key: string) => {
        delete mockSessionStore[key];
      },
      clear: () => {
        mockSessionStore = {};
      },
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });

    vi.restoreAllMocks();
  });

  describe('Inicialización y CRUD', () => {
    it('crea el usuario admin predeterminado si el almacenamiento está vacío', async () => {
      const users = await ensureDefaultAdminExists();
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('admin');
      expect(users[0].rol).toBe('ADMIN');
      expect(users[0].activo).toBe(true);
      expect(users[0].passwordHash).toBeDefined();
    });

    it('crea un nuevo usuario operador con contraseña y PIN rápido', async () => {
      await ensureDefaultAdminExists();

      const nuevo = await createUser({
        username: 'vendedor1',
        nombre: 'Carlos López',
        rol: 'OPERADOR',
        passwordPlain: 'secreto123',
        pinPlain: '4321',
      });

      expect(nuevo.id).toMatch(/^USR-\d{3}$/);
      expect(nuevo.username).toBe('vendedor1');
      expect(nuevo.nombre).toBe('Carlos López');
      expect(nuevo.rol).toBe('OPERADOR');
      expect(nuevo.pinHash).toBeDefined();

      const todos = getUsers();
      expect(todos).toHaveLength(2);
    });

    it('rechaza crear un usuario con username duplicado', async () => {
      await ensureDefaultAdminExists();

      await expect(
        createUser({
          username: 'ADMIN', // prueba mayúsculas
          nombre: 'Otro Admin',
          rol: 'ADMIN',
          passwordPlain: 'password',
        })
      ).rejects.toThrow(/ya existe/i);
    });

    it('rechaza PIN rápido duplicado entre usuarios activos', async () => {
      await ensureDefaultAdminExists();

      await createUser({
        username: 'juan',
        nombre: 'Juan',
        rol: 'OPERADOR',
        passwordPlain: 'pass1234',
        pinPlain: '5555',
      });

      await expect(
        createUser({
          username: 'pedro',
          nombre: 'Pedro',
          rol: 'OPERADOR',
          passwordPlain: 'pass9999',
          pinPlain: '5555',
        })
      ).rejects.toThrow(/PIN ingresado ya está en uso/i);
    });

    it('actualiza datos de un usuario', async () => {
      await ensureDefaultAdminExists();
      const user = await createUser({
        username: 'maria',
        nombre: 'María Gomez',
        rol: 'OPERADOR',
        passwordPlain: 'maria1234',
      });

      const updated = await updateUser(user.id, {
        nombre: 'María Gomez Perez',
        pinPlain: '7788',
      });

      expect(updated.nombre).toBe('María Gomez Perez');
      expect(updated.pinHash).toBeDefined();
    });

    it('impide eliminar o degradar al único administrador activo (BR-AUTH-005)', async () => {
      const users = await ensureDefaultAdminExists();
      const admin = users[0];

      await expect(
        updateUser(admin.id, {
          rol: 'OPERADOR',
        })
      ).rejects.toThrow(/único Administrador activo/i);

      await expect(deleteUser(admin.id)).rejects.toThrow(/único Administrador activo/i);
    });
  });

  describe('Autenticación', () => {
    it('autentica con éxito por usuario y contraseña', async () => {
      await ensureDefaultAdminExists();
      await createUser({
        username: 'lucas',
        nombre: 'Lucas Silva',
        rol: 'OPERADOR',
        passwordPlain: 'claveSegura1',
      });

      const authOk = await authenticateWithPassword('lucas', 'claveSegura1');
      expect(authOk).not.toBeNull();
      expect(authOk?.nombre).toBe('Lucas Silva');
      expect(getActiveSessionUser()?.username).toBe('lucas');

      const authFail = await authenticateWithPassword('lucas', 'claveIncorrecta');
      expect(authFail).toBeNull();
    });

    it('autentica con éxito por PIN rápido unívoco', async () => {
      await ensureDefaultAdminExists();
      await createUser({
        username: 'cajera',
        nombre: 'Valeria Díaz',
        rol: 'OPERADOR',
        passwordPlain: 'valeriaPass',
        pinPlain: '8910',
      });

      const authOk = await authenticateWithPin('8910');
      expect(authOk).not.toBeNull();
      expect(authOk?.username).toBe('cajera');
      expect(authOk?.rol).toBe('OPERADOR');

      const authFail = await authenticateWithPin('0000');
      expect(authFail).toBeNull();
    });
  });
});
