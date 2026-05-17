import { SyncProvider } from './types';

/**
 * @stub Sync is not yet implemented. isConnected() always returns false
 * so no data leaves the device. Implement authentication and encryption
 * before wiring this to a real backend.
 */
export const syncService: SyncProvider = {
  async push() {},
  async pull() {
    return { recipes: [], groceryItems: [], timestamp: new Date().toISOString(), version: 1 };
  },
  subscribe() {
    return () => {};
  },
  isConnected() {
    return false;
  },
};
