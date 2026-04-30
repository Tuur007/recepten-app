S
Copy

/**
 * Genereert een uniek ID.
 *
 * Gebruikt crypto.randomUUID() wanneer beschikbaar (iOS 15.4+, Android, moderne browsers).
 * Valt terug op een combinatie van timestamp + cryptografisch willekeurige bytes
 * voor oudere omgevingen (bijv. Expo Snack web).
 */
export function generateId(): string {
  // crypto.randomUUID is beschikbaar in React Native >= 0.73 en moderne browsers
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
 
  // Terugvaloptie: timestamp + willekeurige bytes via crypto.getRandomValues
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
 
    // Stel versie 4 (willekeurig) en variant bits in
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
 
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
 
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
  }
 
  // Laatste terugval: timestamp + Math.random (alleen als crypto volledig ontbreekt)
  // Waarschuwing: dit is niet cryptografisch veilig
  const timestamp = Date.now().toString(36);
  const willekeurig = Math.random().toString(36).substring(2, 11);
  console.warn(
    '[generateId] crypto API niet beschikbaar — gebruikt onveilige terugval',
  );
  return `${timestamp}-${willekeurig}`;
}
