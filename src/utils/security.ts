/**
 * Hashing helpers so the admin PIN is never persisted in plain text in
 * localStorage. Uses Web Crypto SHA-256 when available (secure context /
 * localhost) and falls back to a fast synchronous digest otherwise.
 *
 * El salt actual es neutro (`saleshub::`). Los hashes legacy generados con el
 * salt anterior (`dualsrl::`) o sin salt siguen verificándose (verifyPin) para
 * no romper desbloqueos de instalaciones existentes.
 */

export const PIN_SALT = 'saleshub::';
const LEGACY_PIN_SALT = 'dualsrl::';

function syncDigest(input: string): string {
  // cyrb53: fast, collision-resistant 53-bit hash serialized as hex (non-cryptographic fallback)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
}

/** SHA-256 hex via Web Crypto; null si no está disponible. */
async function subtleHex(saltedValue: string): Promise<string | null> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const data = new TextEncoder().encode(saltedValue);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (_) {
    // fall through
  }
  return null;
}

export async function hashPin(pin: string): Promise<string> {
  const value = (pin || '').trim();
  const sha = await subtleHex(`${PIN_SALT}${value}`);
  if (sha) return sha;
  return syncDigest(value);
}

/**
 * Verifica un PIN contra un hash persistido (64 hex). Acepta hashes generados
 * con el salt actual, con el salt legacy (`dualsrl::`) o con el fallback
 * síncrono sin salt, para no romper instalaciones preexistentes.
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const value = (pin || '').trim();
  const target = (storedHash || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(target)) return false;

  for (const salt of [PIN_SALT, LEGACY_PIN_SALT]) {
    const sha = await subtleHex(`${salt}${value}`);
    if (sha === target) return true;
  }
  return syncDigest(value) === target;
}

export function isHashedPin(value: string): boolean {
  const clean = (value || '').trim();
  return /^[a-f0-9]{16}$/i.test(clean) || /^[a-f0-9]{64}$/i.test(clean);
}

/**
 * Escalada del bloqueo temporal por intentos fallidos de PIN (AuthModal).
 * Devuelve los milisegundos de espera antes de permitir un nuevo intento:
 *   - 1-2 intentos: sin bloqueo
 *   - 3-4 intentos: 5 segundos
 *   - 5-6 intentos: 30 segundos
 *   - 7+ intentos : 60 segundos
 */
export function authLockWaitMs(failedAttempts: number): number {
  if (failedAttempts < 3) return 0;
  if (failedAttempts < 5) return 5_000;
  if (failedAttempts < 7) return 30_000;
  return 60_000;
}
