import { describe, it, expect } from 'vitest';
import { hashPin, isHashedPin, verifyPin, authLockWaitMs } from '../utils/security';

describe('security - hashPin', () => {
  it('genera un hash de 64 caracteres hex en minúsculas', async () => {
    const hash = await hashPin('4321');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('es determinista: el mismo PIN produce el mismo hash', async () => {
    const a = await hashPin('9876');
    const b = await hashPin('9876');
    expect(a).toBe(b);
  });

  it('PINs distintos producen hashes distintos', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1235');
    expect(a).not.toBe(b);
  });

  it('normaliza el PIN (trim) antes de hashear', async () => {
    const a = await hashPin('1234');
    const b = await hashPin(' 1234 ');
    expect(a).toBe(b);
  });
});

describe('security - verifyPin (retrocompatible con hashes legacy)', () => {
  it('valida un PIN correcto contra su hash persistido', async () => {
    const stored = await hashPin('7788');
    expect(await verifyPin('7788', stored)).toBe(true);
  });

  it('rechaza un PIN incorrecto', async () => {
    const stored = await hashPin('7788');
    expect(await verifyPin('0000', stored)).toBe(false);
    expect(await verifyPin('', stored)).toBe(false);
  });

  it('rechaza valores que no son hashes de 64 hex', async () => {
    expect(await verifyPin('1234', '1234')).toBe(false);
    expect(await verifyPin('1234', '')).toBe(false);
  });
});

describe('security - isHashedPin', () => {
  it('reconoce hashes SHA-256 (64 hex) y syncDigest legacy (16 hex)', () => {
    expect(isHashedPin('a'.repeat(64))).toBe(true);
    expect(isHashedPin('a'.repeat(16))).toBe(true);
    expect(isHashedPin('a'.repeat(32))).toBe(false);
  });

  it('no confunde texto plano con un hash', () => {
    expect(isHashedPin('1234')).toBe(false);
    expect(isHashedPin('')).toBe(false);
  });

  it('tolera mayúsculas en el hash', () => {
    expect(isHashedPin('A'.repeat(64))).toBe(true);
  });
});

describe('security - authLockWaitMs (bloqueo progresivo)', () => {
  it('permite 2 intentos fallidos sin bloqueo', () => {
    expect(authLockWaitMs(0)).toBe(0);
    expect(authLockWaitMs(1)).toBe(0);
    expect(authLockWaitMs(2)).toBe(0);
  });

  it('bloquea 5 segundos entre 3 y 4 intentos', () => {
    expect(authLockWaitMs(3)).toBe(5000);
    expect(authLockWaitMs(4)).toBe(5000);
  });

  it('bloquea 30 segundos entre 5 y 6 intentos', () => {
    expect(authLockWaitMs(5)).toBe(30000);
    expect(authLockWaitMs(6)).toBe(30000);
  });

  it('bloquea 60 segundos desde 7 intentos en adelante', () => {
    expect(authLockWaitMs(7)).toBe(60000);
    expect(authLockWaitMs(12)).toBe(60000);
    expect(authLockWaitMs(100)).toBe(60000);
  });
});
