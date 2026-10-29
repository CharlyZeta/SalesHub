import { describe, it, expect } from 'vitest';
import { canManageSecurity, hayAdminConCredencialesSeguras } from '../utils/securityAccess';

describe('canManageSecurity (FIX-AUTH-003)', () => {
  it('permite administrar seguridad con el control de acceso DESACTIVADO (instalación nueva)', () => {
    expect(canManageSecurity(undefined, false)).toBe(true);
    expect(canManageSecurity('OPERADOR', false)).toBe(true);
  });

  it('permite administrar seguridad a un ADMIN autenticado', () => {
    expect(canManageSecurity('ADMIN', true)).toBe(true);
  });

  it('niega la administración de seguridad a un OPERADOR con el control activo', () => {
    expect(canManageSecurity('OPERADOR', true)).toBe(false);
  });

  // Regresión del bug original: cuando el rol llegaba undefined el panel de
  // usuarios quedaba inaccesible incluso con la seguridad habilitada.
  it('niega la administración si el rol es undefined y la seguridad está activa', () => {
    expect(canManageSecurity(undefined, true)).toBe(false);
  });
});

describe('hayAdminConCredencialesSeguras (guard para habilitar seguridad)', () => {
  it('devuelve false sin administradores', () => {
    expect(hayAdminConCredencialesSeguras([])).toBe(false);
  });

  it('devuelve false si el admin conserva contraseña y PIN predeterminados', () => {
    expect(hayAdminConCredencialesSeguras([{ passwordEsDefault: true, pinEsDefault: true }])).toBe(false);
  });

  // El PIN de 4 dígitos y la contraseña son dos puertas de entrada distintas:
  // dejar cualquiera en el valor predeterminado alcanza para entrar al sistema,
  // así que el admin sólo cuenta como "asegurado" si cambió LAS DOS.
  it('devuelve false si cambió la contraseña pero el PIN sigue predeterminado', () => {
    expect(hayAdminConCredencialesSeguras([{ passwordEsDefault: false, pinEsDefault: true }])).toBe(false);
  });

  it('devuelve false si cambió el PIN pero la contraseña sigue predeterminada', () => {
    expect(hayAdminConCredencialesSeguras([{ passwordEsDefault: true, pinEsDefault: false }])).toBe(false);
  });

  it('devuelve true si cambió ambas credenciales', () => {
    expect(hayAdminConCredencialesSeguras([{ passwordEsDefault: false, pinEsDefault: false }])).toBe(true);
  });

  it('devuelve true si al menos uno de los admins está asegurado', () => {
    expect(
      hayAdminConCredencialesSeguras([
        { passwordEsDefault: true, pinEsDefault: true },
        { passwordEsDefault: false, pinEsDefault: false },
      ])
    ).toBe(true);
  });
});
