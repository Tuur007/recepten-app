import { SyncProvider } from './types';

/**
 * Placeholder — replace with a real provider (Firebase / Supabase / custom).
 *
 * To add sync:
 *  1. Create e.g. `services/sync/supabaseProvider.ts` implementing SyncProvider.
 *  2. Swap the export below.
 *  3. Call syncService.push() after every local write.
 *  4. Call syncService.subscribe() in the root layout to receive remote changes.
 */
export const syncService: SyncProvider = {
  async push() {
    // TODO: implement
  },
  async pull() {
    return { recipes: [], groceryItems: [], timestamp: new Date().toISOString(), version: 1 };
  },
  subscribe() {
    // TODO: return real unsubscribe function
    return () => {};
  },
  isConnected() {
    return false;
  },
};
