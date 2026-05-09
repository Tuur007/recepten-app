import { SyncProvider } from './types';

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
