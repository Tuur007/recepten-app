import { warn } from './logger';
// Alfabet zonder I/O/0/1 om visuele verwarring te vermijden (32 tekens, dus
// `byte % length` is hier bias-vrij omdat 256 deelbaar is door 32).
export const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Genereert een crypto-veilige token van `length` tekens uit `alphabet`.
 * Gebruikt uitsluitend crypto.getRandomValues. Dit voedt o.a. de
 * uitnodigingscodes (services/inviteService.ts) die familietoegang geven, dus
 * faalt fail-closed: ontbreekt de crypto-API, dan gooien we een fout in plaats
 * van terug te vallen op het voorspelbare Math.random (dat zou raadbare codes
 * opleveren).
 */
export function randomToken(length: number, alphabet: string = TOKEN_ALPHABET): string {
  if (length <= 0) return '';

  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('[randomToken] crypto API niet beschikbaar — kan geen veilige token genereren');
  }

  const chars: string[] = new Array(length);
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    chars[i] = alphabet[bytes[i] % alphabet.length];
  }

  return chars.join('');
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // UUID v4: set version and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }

  // Unsafe fallback — crypto API unavailable
  warn('[generateId] crypto API niet beschikbaar — gebruikt onveilige terugval');
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}
