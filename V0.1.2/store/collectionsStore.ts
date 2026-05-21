// store/collectionsStore.ts
//
// Zustand-store voor recipe collections. Volgt hetzelfde patroon als de
// andere stores: cache van repo-data + idempotente hydration, en mutators
// die zowel de DB als de in-memory state bijwerken.

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect } from 'react';
import type { RecipeCollection } from '../types/recipe';
import { CollectionRepository } from '../features/collections/repository';
import { toast } from '../utils/feedback';

interface CollectionsState {
  collections: RecipeCollection[];
  isLoading: boolean;
  hasLoaded: boolean;

  setCollections: (c: RecipeCollection[]) => void;
  setLoading: (v: boolean) => void;
  setLoaded: (v: boolean) => void;

  addCollection: (c: RecipeCollection) => void;
  removeCollectionFromStore: (id: string) => void;
  patchCollection: (id: string, changes: Partial<RecipeCollection>) => void;
  attachRecipe: (collectionId: string, recipeId: string) => void;
  detachRecipe: (collectionId: string, recipeId: string) => void;
}

export const useCollectionsStore = create<CollectionsState>()(
  immer((set) => ({
    collections: [],
    isLoading: false,
    hasLoaded: false,

    setCollections: (c) => set({ collections: c }),
    setLoading: (v) => set({ isLoading: v }),
    setLoaded: (v) => set({ hasLoaded: v }),

    addCollection: (c) =>
      set((s) => {
        s.collections.push(c);
      }),

    removeCollectionFromStore: (id) =>
      set((s) => {
        s.collections = s.collections.filter((c) => c.id !== id);
      }),

    patchCollection: (id, changes) =>
      set((s) => {
        const c = s.collections.find((c) => c.id === id);
        if (c) Object.assign(c, changes, { updatedAt: new Date().toISOString() });
      }),

    attachRecipe: (collectionId, recipeId) =>
      set((s) => {
        const c = s.collections.find((c) => c.id === collectionId);
        if (c && !c.recipeIds.includes(recipeId)) {
          c.recipeIds.push(recipeId);
          c.updatedAt = new Date().toISOString();
        }
      }),

    detachRecipe: (collectionId, recipeId) =>
      set((s) => {
        const c = s.collections.find((c) => c.id === collectionId);
        if (c) {
          c.recipeIds = c.recipeIds.filter((id) => id !== recipeId);
          c.updatedAt = new Date().toISOString();
        }
      }),
  })),
);

export function useCollections() {
  const db = useSQLiteContext();
  const {
    collections,
    isLoading,
    hasLoaded,
    setCollections,
    setLoading,
    setLoaded,
    addCollection,
    removeCollectionFromStore,
    patchCollection,
    attachRecipe,
    detachRecipe,
  } = useCollectionsStore();

  useEffect(() => {
    if (hasLoaded) return;
    setLoading(true);
    CollectionRepository.getAll(db)
      .then((data) => {
        setCollections(data);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('[useCollections] Load error:', err);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [db, hasLoaded, setCollections, setLoading, setLoaded]);

  const create = useCallback(
    async (name: string, description?: string) => {
      try {
        const created = await CollectionRepository.create(db, name, description);
        addCollection(created);
        return created;
      } catch (err) {
        console.error('[useCollections.create] Failed:', err);
        toast.error('Niet opgeslagen', 'Collectie kon niet worden aangemaakt.');
        throw err;
      }
    },
    [db, addCollection],
  );

  const rename = useCallback(
    async (id: string, name: string, description?: string) => {
      try {
        await CollectionRepository.rename(db, id, name, description);
        patchCollection(id, { name: name.trim(), description: description?.trim() || undefined });
      } catch (err) {
        console.error('[useCollections.rename] Failed:', err);
        toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.');
        throw err;
      }
    },
    [db, patchCollection],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await CollectionRepository.delete(db, id);
        removeCollectionFromStore(id);
      } catch (err) {
        console.error('[useCollections.remove] Failed:', err);
        toast.error('Niet verwijderd', 'Probeer opnieuw.');
        throw err;
      }
    },
    [db, removeCollectionFromStore],
  );

  const addRecipe = useCallback(
    async (collectionId: string, recipeId: string) => {
      try {
        await CollectionRepository.addRecipe(db, collectionId, recipeId);
        attachRecipe(collectionId, recipeId);
      } catch (err) {
        console.error('[useCollections.addRecipe] Failed:', err);
        toast.error('Niet toegevoegd', 'Probeer opnieuw.');
        throw err;
      }
    },
    [db, attachRecipe],
  );

  const removeRecipe = useCallback(
    async (collectionId: string, recipeId: string) => {
      try {
        await CollectionRepository.removeRecipe(db, collectionId, recipeId);
        detachRecipe(collectionId, recipeId);
      } catch (err) {
        console.error('[useCollections.removeRecipe] Failed:', err);
        toast.error('Niet verwijderd', 'Probeer opnieuw.');
        throw err;
      }
    },
    [db, detachRecipe],
  );

  return {
    collections,
    isLoading,
    hasLoaded,
    create,
    rename,
    remove,
    addRecipe,
    removeRecipe,
  };
}
