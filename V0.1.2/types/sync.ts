import { Recipe } from './recipe';
import { GroceryItem } from './grocery';

export interface SyncPayload {
  recipes: Recipe[];
  groceryItems: GroceryItem[];
  timestamp: string;
  version: number;
}

export interface SyncMetadata {
  lastSyncedAt?: string;
  syncVersion: number;
  deviceId: string;
}

/**
 * Contract for any future sync provider (Firebase, Supabase, custom backend).
 * Implement this interface when adding cloud sync.
 */
export interface SyncProvider {
  push(payload: SyncPayload): Promise<void>;
  pull(since?: string): Promise<SyncPayload>;
  subscribe(callback: (payload: SyncPayload) => void): () => void;
  isConnected(): boolean;
}
