/**
 * Hashing helpers so the admin PIN is never persisted in plain text in
 * localStorage. Uses Web Crypto SHA-256 when available (secure context /
 * localhost) and falls back to a fast synchronous digest otherwise.
 */

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

export async function hashPin(pin: string): Promise<string> {
  const value = (pin || '').trim();
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const data = new TextEncoder().encode(`dualsrl::${value}`);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (_) {
    // fall through to sync digest
  }
  return syncDigest(value);
}

export function isHashedPin(value: string): boolean {
  const clean = (value || '').trim();
  return /^[a-f0-9]{16}$/i.test(clean) || /^[a-f0-9]{64}$/i.test(clean);
}
