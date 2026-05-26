// Alfabet zonder I/O/0/1 om visuele verwarring te vermijden (32 tekens, dus
// `byte % length` is hier bias-vrij omdat 256 deelbaar is door 32).
export const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Genereert een crypto-veilige token van `length` tekens uit `alphabet`.
 * Gebruikt crypto.getRandomValues; valt alleen terug op Math.random als de
 * crypto-API echt ontbreekt.
 */
export function randomToken(length: number, alphabet: string = TOKEN_ALPHABET): string {
  if (length <= 0) return '';
  const chars: string[] = new Array(length);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      chars[i] = alphabet[bytes[i] % alphabet.length];
    }
  } else {
    console.warn('[randomToken] crypto API niet beschikbaar — gebruikt onveilige terugval');
    for (let i = 0; i < length; i++) {
      chars[i] = alphabet[Math.floor(Math.random() * alphabet.length)];
    }
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
  console.warn('[generateId] crypto API niet beschikbaar — gebruikt onveilige terugval');
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}
