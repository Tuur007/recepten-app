// features/collections/presenter.ts
//
// Decoreert een RecipeCollection met visuele velden voor de bundle/boekrug
// look. Spine-kleur is deterministisch op de id-hash zodat dezelfde collectie
// altijd dezelfde rug krijgt; vol-nummer komt uit de positie in de geordende
// lijst (gesorteerd op createdAt door de repository).

import type { RecipeCollection } from '../../types/recipe';

export interface BundleData {
  id: string;
  title: string;
  spine: string;
  vol: string;
  count: number;
}

// Donkere, papier-vriendelijke kleuren in lijn met het brand-palet.
const SPINE_PALETTE = [
  '#5A1F12',
  '#5A6B3A',
  '#3A5A6B',
  '#C2492A',
  '#4F6A3A',
  '#D4A95E',
  '#7A3327',
  '#3F5A48',
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickSpineColor(id: string): string {
  return SPINE_PALETTE[hash(id) % SPINE_PALETTE.length];
}

export function toBundleData(collection: RecipeCollection, index: number): BundleData {
  return {
    id: collection.id,
    title: collection.name,
    spine: pickSpineColor(collection.id),
    vol: String(index + 1).padStart(2, '0'),
    count: collection.recipeIds.length,
  };
}
