export const DEFAULT_AISLES = [
  'Groente & Fruit',
  'Vlees & Vis',
  'Zuivel & Eieren',
  'Brood & Bakkerij',
  'Diepvries',
  'Dranken',
  'Snacks & Snoep',
  'Pantry & Basics',
  'Overig',
] as const;

export type Aisle = (typeof DEFAULT_AISLES)[number];

export function getAisleForItem(name: string): Aisle {
  const n = name.toLowerCase();
  if (['kip', 'vlees', 'rund', 'vis'].some((w) => n.includes(w))) return 'Vlees & Vis';
  if (['melk', 'kaas', 'yoghurt'].some((w) => n.includes(w))) return 'Zuivel & Eieren';
  if (['brood', 'croissant'].some((w) => n.includes(w))) return 'Brood & Bakkerij';
  if (['tomaat', 'sla', 'appel', 'banaan'].some((w) => n.includes(w))) return 'Groente & Fruit';
  if (['bevroren', 'ijs'].some((w) => n.includes(w))) return 'Diepvries';
  if (['water', 'wijn', 'sap'].some((w) => n.includes(w))) return 'Dranken';
  return 'Overig';
}
