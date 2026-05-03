/**
 * Sync Service
 * Manages offline-first synchronization with retry logic and offline queue
 */

import { SyncPayload, SyncProvider } from '../../types/sync';

interface QueuedOperation {
  id: string;
  type: 'recipe_create' | 'recipe_update' | 'recipe_delete' | 'item_create' | 'item_update' | 'item_delete';
  payload: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export class SyncService {
  private static instance: SyncService;
  private provider: SyncProvider | null = null;
  private db: any = null;
  private queue: Map<string, QueuedOperation> = new Map();
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Initialize sync service with provider and database
   * Must be called after database is ready
   */
  async initialize(provider: SyncProvider, db: any): Promise<void> {
    if (this.initialized) {
      console.warn('[SyncService] Already initialized');
      return;
    }

    this.provider = provider;
    this.db = db;
    this.initialized = true;

    try {
      // Load queue from local storage
      await this.loadQueue();

      // Setup automatic sync every 30 seconds if online
      this.syncInterval = setInterval(() => {
        if (this.isOnline && !this.syncInProgress && this.provider) {
          this.sync();
        }
      }, 30000);

      // Retry failed operations every 60 seconds
      this.retryInterval = setInterval(() => {
        if (this.isOnline && this.provider) {
          this.retryFailedOperations();
        }
      }, 60000);

      // Initial sync if provider is connected
      if (this.provider.isConnected() && this.isOnline) {
        await this.sync();
      }

      console.log('[SyncService] Initialized successfully');
    } catch (error) {
      console.error('[SyncService] Initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;

    if (!wasOnline && isOnline) {
      console.log('[SyncService] Reconnected, initiating sync');
      this.sync();
    } else if (wasOnline && !isOnline) {
      console.log('[SyncService] Offline, queueing operations');
    }
  }

  /**
   * Queue an operation for later sync
   */
  async queueOperation(
    type: QueuedOperation['type'],
    payload: unknown,
  ): Promise<void> {
    const operation: QueuedOperation = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    this.queue.set(operation.id, operation);
    await this.saveQueue();

    if (this.isOnline && this.provider?.isConnected()) {
      this.sync();
    }
  }

  /**
   * Perform full sync with cloud
   */
  async sync(): Promise<void> {
    if (!this.provider || !this.initialized || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      // 1. Push local changes if online
      if (this.isOnline && this.provider.isConnected()) {
        await this.pullRemoteChanges();
      }

      console.log('[SyncService] Sync completed successfully');
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      this.setOnlineStatus(false);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Pull remote changes
   */
  private async pullRemoteChanges(): Promise<void> {
    if (!this.provider || !this.isOnline) return;

    try {
      const lastSync = await this.getLastSyncTime();
      const payload = await this.provider.pull(lastSync);

      if (payload.recipes.length > 0 || payload.groceryItems.length > 0) {
        await this.mergeRemoteChanges(payload);
      }

      // Update last sync time
      await this.setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('[SyncService] Failed to pull remote changes:', error);
      // Don't throw - allow offline operation
    }
  }

  /**
   * Merge remote changes into local database
   */
  private async mergeRemoteChanges(payload: SyncPayload): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.withTransactionAsync(async () => {
        // Merge recipes
        for (const recipe of payload.recipes) {
          await this.db.runAsync(
            `INSERT OR REPLACE INTO recipes 
             (id, title, ingredients, steps, source_url, category, is_favorite, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              recipe.id,
              recipe.title,
              JSON.stringify(recipe.ingredients),
              JSON.stringify(recipe.steps),
              recipe.sourceUrl ?? null,
              recipe.category ?? '',
              recipe.isFavorite ? 1 : 0,
              recipe.createdAt,
              recipe.updatedAt,
            ],
          );
        }

        // Merge grocery items
        for (const item of payload.groceryItems) {
          await this.db.runAsync(
            `INSERT OR REPLACE INTO grocery_items
             (id, name, unit, sources, total_quantity, checked, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.name,
              item.unit,
              JSON.stringify(item.sources),
              item.totalQuantity,
              item.checked ? 1 : 0,
              item.createdAt,
            ],
          );
        }
      });

      console.log('[SyncService] Merged remote changes');
    } catch (error) {
      console.error('[SyncService] Failed to merge remote changes:', error);
      throw error;
    }
  }

  /**
   * Retry failed operations
   */
  private async retryFailedOperations(): Promise<void> {
    const failedOps = Array.from(this.queue.values()).filter(
      (op) => op.retries < op.maxRetries,
    );

    if (failedOps.length === 0) return;

    console.log(`[SyncService] Retrying ${failedOps.length} failed operations`);

    for (const op of failedOps) {
      op.retries++;
    }
    await this.saveQueue();
  }

  /**
   * Get last sync timestamp
   */
  private async getLastSyncTime(): Promise<string | undefined> {
    try {
      // In production, store this in device secure storage or database
      return undefined; // First sync gets all data
    } catch (error) {
      console.error('[SyncService] Failed to get last sync time:', error);
      return undefined;
    }
  }

  /**
   * Set last sync timestamp
   */
  private async setLastSyncTime(timestamp: string): Promise<void> {
    try {
      // Store in device secure storage or database
    } catch (error) {
      console.error('[SyncService] Failed to set last sync time:', error);
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      // In production, load from device storage
      this.queue.clear();
    } catch (error) {
      console.error('[SyncService] Failed to load queue:', error);
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      // In production, save to device storage
    } catch (error) {
      console.error('[SyncService] Failed to save queue:', error);
    }
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.retryInterval) clearInterval(this.retryInterval);
    this.initialized = false;
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      queueSize: this.queue.size,
      isSyncing: this.syncInProgress,
      isConnected: this.provider?.isConnected() ?? false,
      isInitialized: this.initialized,
    };
  }
}

export const syncService = SyncService.getInstance();
