import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { error } from '../utils/logger';

// Supabase bewaart de sessie (JWT access-token + refresh-token + user) onder één
// sleutel. AsyncStorage is op de meeste toestellen niet versleuteld, dus die
// tokens horen in de hardware-backed keystore (iOS Keychain / Android Keystore)
// via expo-secure-store.
//
// SecureStore heeft op Android een limiet van ~2048 byte per waarde. Een
// Supabase-sessie kan groter zijn, dus we chunken: de hoofd-sleutel houdt een
// meta-marker met het aantal delen vast, de delen staan onder afgeleide keys.

const CHUNK_SIZE = 1800; // ruim onder de Android-limiet van 2048
const META_PREFIX = '__chunked__:';

function partKey(key: string, index: number): string {
  return `${key}__${index}`;
}

async function secureGet(key: string): Promise<string | null> {
  const head = await SecureStore.getItemAsync(key);
  if (head == null) return null;
  if (!head.startsWith(META_PREFIX)) return head;

  const count = Number.parseInt(head.slice(META_PREFIX.length), 10);
  if (!Number.isInteger(count) || count <= 0) return null;

  let out = '';
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(partKey(key, i));
    if (part == null) return null; // corrupt/onvolledig — behandel als afwezig
    out += part;
  }
  return out;
}

async function secureRemove(key: string): Promise<void> {
  const head = await SecureStore.getItemAsync(key);
  if (head?.startsWith(META_PREFIX)) {
    const count = Number.parseInt(head.slice(META_PREFIX.length), 10);
    if (Number.isInteger(count)) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(partKey(key, i));
      }
    }
  }
  await SecureStore.deleteItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  // Ruim eventuele eerdere (gechunkte) waarde op voor we opnieuw schrijven.
  await secureRemove(key);

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  const count = Math.ceil(value.length / CHUNK_SIZE);
  await SecureStore.setItemAsync(key, `${META_PREFIX}${count}`);
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(
      partKey(key, i),
      value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    );
  }
}

/**
 * Supabase-storage adapter (getItem/setItem/removeItem) die de sessie in de
 * secure keystore bewaart. Valt terug op AsyncStorage waar SecureStore niet
 * bestaat (bv. web) en migreert eenmalig bestaande sessies uit AsyncStorage,
 * zodat ingelogde gebruikers bij een upgrade niet uitgelogd worden.
 */
export const supabaseSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await secureGet(key);
      if (value != null) return value;

      // Eenmalige migratie van de oude (onversleutelde) AsyncStorage-locatie.
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        try {
          await secureSet(key, legacy);
          await AsyncStorage.removeItem(key);
        } catch {
          /* migratie best-effort; we hebben de waarde al */
        }
        return legacy;
      }
      return null;
    } catch (e) {
      error('[secureStorage] getItem terugval naar AsyncStorage:', e instanceof Error ? e.message : e);
      try {
        return await AsyncStorage.getItem(key);
      } catch {
        return null;
      }
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await secureSet(key, value);
    } catch (e) {
      error('[secureStorage] setItem terugval naar AsyncStorage:', e instanceof Error ? e.message : e);
      try {
        await AsyncStorage.setItem(key, value);
      } catch {
        /* niets meer dat we kunnen doen */
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await secureRemove(key);
    } catch (e) {
      error('[secureStorage] removeItem fout:', e instanceof Error ? e.message : e);
    }
    // Ruim ook een eventuele legacy-kopie in AsyncStorage op.
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* genegeerd */
    }
  },
};
