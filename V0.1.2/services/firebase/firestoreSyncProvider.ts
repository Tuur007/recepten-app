/**
 * Firestore Sync Provider
 * Implements cloud synchronization using Firebase Firestore
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
  onSnapshot,
  serverTimestamp,
  QuerySnapshot,
  DocumentData,
  writeBatch,
  FieldValue,
} from 'firebase/firestore';
import { db } from './config';
import { authService } from './authService';
import { Recipe } from '../../types/recipe';
import { GroceryItem, SourceLineage } from '../../types/grocery';
import { SyncPayload, SyncProvider } from '../../types/sync';

interface FirestoreRecipe extends Omit<Recipe, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  userId: string;
  deleted?: boolean;
  deletedAt?: Timestamp | FieldValue;
}

interface FirestoreGroceryItem extends Omit<GroceryItem, 'createdAt'> {
  createdAt: Timestamp | FieldValue;
  userId: string;
  deleted?: boolean;
  deletedAt?: Timestamp | FieldValue;
}

export class FirestoreSyncProvider implements SyncProvider {
  private userId: string | null = null;
  private unsubscribeFunctions: (() => void)[] = [];
  private isConnectedState = false;
  private authUnsubscribe: (() => void) | null = null;

  constructor() {
    // Subscribe to auth changes to update userId
    this.authUnsubscribe = authService.onAuthStateChanged((user) => {
      this.userId = user?.uid || null;
      this.isConnectedState = this.userId !== null && !user?.isAnonymous;
    });
  }

  /**
   * Push local data to Firestore
   */
  async push(payload: SyncPayload): Promise<void> {
    if (!this.userId || !this.isConnectedState) {
      console.log('[FirestoreSyncProvider] Not connected, skipping push');
      return;
    }

    try {
      const batch = writeBatch(db);
      let operationCount = 0;

      // Write recipes
      for (const recipe of payload.recipes) {
        const recipeRef = doc(
          db,
          'users',
          this.userId,
          'recipes',
          recipe.id,
        );
        
        const recipeData: Record<string, any> = {
          ...recipe,
          userId: this.userId,
          createdAt: Timestamp.fromDate(new Date(recipe.createdAt)),
          updatedAt: Timestamp.fromDate(new Date(recipe.updatedAt)),
          deleted: false,
        };
        
        batch.set(recipeRef, recipeData);
        operationCount++;
      }

      // Write grocery items
      for (const item of payload.groceryItems) {
        const itemRef = doc(
          db,
          'users',
          this.userId,
          'groceryItems',
          item.id,
        );
        
        const itemData: Record<string, any> = {
          ...item,
          userId: this.userId,
          createdAt: Timestamp.fromDate(new Date(item.createdAt)),
          deleted: false,
        };
        
        batch.set(itemRef, itemData);
        operationCount++;
      }

      // Only commit if there are operations
      if (operationCount > 0) {
        await batch.commit();
        console.log(`[FirestoreSyncProvider] Push successful (${operationCount} operations)`);
      }
    } catch (error) {
      console.error('[FirestoreSyncProvider] Push failed:', error);
      throw new Error('Sync to cloud failed. Please try again.');
    }
  }

  /**
   * Pull data from Firestore since timestamp
   */
  async pull(since?: string): Promise<SyncPayload> {
    if (!this.userId || !this.isConnectedState) {
      console.log('[FirestoreSyncProvider] Not connected, returning empty payload');
      return {
        recipes: [],
        groceryItems: [],
        timestamp: new Date().toISOString(),
        version: 1,
      };
    }

    try {
      const sinceDate = since ? new Date(since) : new Date(0);
      const sinceTimestamp = Timestamp.fromDate(sinceDate);

      // Query recipes
      const recipesQuery = query(
        collection(db, 'users', this.userId, 'recipes'),
        where('deleted', '==', false),
      );
      const recipesSnapshot = await getDocs(recipesQuery);
      const recipes = recipesSnapshot.docs
        .map((docSnapshot) => this.firestoreRecipeToRecipe(docSnapshot.data() as any))
        .filter((recipe): recipe is Recipe => recipe !== null);

      // Query grocery items
      const itemsQuery = query(
        collection(db, 'users', this.userId, 'groceryItems'),
        where('deleted', '==', false),
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const groceryItems = itemsSnapshot.docs
        .map((docSnapshot) => this.firestoreItemToGroceryItem(docSnapshot.data() as any))
        .filter((item): item is GroceryItem => item !== null);

      return {
        recipes,
        groceryItems,
        timestamp: new Date().toISOString(),
        version: 1,
      };
    } catch (error) {
      console.error('[FirestoreSyncProvider] Pull failed:', error);
      throw new Error('Failed to sync from cloud. Please try again.');
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback: (payload: SyncPayload) => void): () => void {
    if (!this.userId || !this.isConnectedState) {
      console.log('[FirestoreSyncProvider] Not connected, cannot subscribe');
      return () => {};
    }

    const unsubscribeFunctions: (() => void)[] = [];

    try {
      // Subscribe to recipes
      const unsubscribeRecipes = onSnapshot(
        query(
          collection(db, 'users', this.userId, 'recipes'),
          where('deleted', '==', false),
        ),
        (snapshot: QuerySnapshot<DocumentData>) => {
          this.handleSnapshot(snapshot, callback);
        },
        (error) => {
          console.error('[FirestoreSyncProvider] Recipes subscription error:', error);
        },
      );
      unsubscribeFunctions.push(unsubscribeRecipes);

      // Subscribe to grocery items
      const unsubscribeItems = onSnapshot(
        query(
          collection(db, 'users', this.userId, 'groceryItems'),
          where('deleted', '==', false),
        ),
        (snapshot: QuerySnapshot<DocumentData>) => {
          this.handleSnapshot(snapshot, callback);
        },
        (error) => {
          console.error('[FirestoreSyncProvider] Items subscription error:', error);
        },
      );
      unsubscribeFunctions.push(unsubscribeItems);
    } catch (error) {
      console.error('[FirestoreSyncProvider] Subscribe error:', error);
      return () => {};
    }

    return () => {
      unsubscribeFunctions.forEach((unsub) => unsub());
    };
  }

  /**
   * Check if connected to cloud
   */
  isConnected(): boolean {
    return this.isConnectedState && this.userId !== null;
  }

  /**
   * Delete a recipe (soft delete)
   */
  async deleteRecipe(recipeId: string): Promise<void> {
    if (!this.userId || !this.isConnectedState) return;

    try {
      const recipeRef = doc(
        db,
        'users',
        this.userId,
        'recipes',
        recipeId,
      );
      await updateDoc(recipeRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[FirestoreSyncProvider] Delete recipe failed:', error);
    }
  }

  /**
   * Delete a grocery item (soft delete)
   */
  async deleteGroceryItem(itemId: string): Promise<void> {
    if (!this.userId || !this.isConnectedState) return;

    try {
      const itemRef = doc(
        db,
        'users',
        this.userId,
        'groceryItems',
        itemId,
      );
      await updateDoc(itemRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[FirestoreSyncProvider] Delete item failed:', error);
    }
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeFunctions = [];
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private handleSnapshot(
    snapshot: QuerySnapshot<DocumentData>,
    callback: (payload: SyncPayload) => void,
  ): void {
    const payload: SyncPayload = {
      recipes: [],
      groceryItems: [],
      timestamp: new Date().toISOString(),
      version: 1,
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      try {
        if (data.deleted) return;

        if ('ingredients' in data && Array.isArray(data.ingredients)) {
          const recipe = this.firestoreRecipeToRecipe(data);
          if (recipe) payload.recipes.push(recipe);
        } else if ('sources' in data && Array.isArray(data.sources)) {
          const item = this.firestoreItemToGroceryItem(data);
          if (item) payload.groceryItems.push(item);
        }
      } catch (error) {
        console.error('[FirestoreSyncProvider] Error processing document:', error);
      }
    });

    try {
      callback(payload);
    } catch (error) {
      console.error('[FirestoreSyncProvider] Callback error:', error);
    }
  }

  private firestoreRecipeToRecipe(data: any): Recipe | null {
    try {
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate().toISOString()
        : data.createdAt;
      
      const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt;

      return {
        id: data.id,
        title: data.title || '',
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        steps: Array.isArray(data.steps) ? data.steps : [],
        sourceUrl: data.sourceUrl,
        category: data.category || '',
        isFavorite: !!data.isFavorite,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('[FirestoreSyncProvider] Failed to convert recipe:', error);
      return null;
    }
  }

  private firestoreItemToGroceryItem(data: any): GroceryItem | null {
    try {
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate().toISOString()
        : data.createdAt;

      const sources: SourceLineage[] = Array.isArray(data.sources) 
        ? data.sources 
        : [];

      return {
        id: data.id,
        name: data.name || '',
        unit: data.unit || '',
        sources,
        totalQuantity: typeof data.totalQuantity === 'number' ? data.totalQuantity : 0,
        checked: !!data.checked,
        createdAt,
      };
    } catch (error) {
      console.error('[FirestoreSyncProvider] Failed to convert grocery item:', error);
      return null;
    }
  }
}

export const firestoreSyncProvider = new FirestoreSyncProvider();
