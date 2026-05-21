// services/openFoodFacts.ts
//
// Lichte client voor de publieke Open Food Facts API. We gebruiken twee
// endpoints:
//
//   • /api/v2/product/<barcode>   — exact product op barcode (scanner)
//   • /cgi/search.pl              — vrije zoekopdracht op naam (nutritie-aggregator)
//
// De API is gratis, vereist geen key en heeft geen rate-limit voor incidenteel
// gebruik. We sturen een eigen User-Agent zoals de OFF-docs vragen.

const OFF_USER_AGENT = 'ReceptenApp/1.1 (https://github.com/tuur007/recepten-app)';
const SEARCH_BASE = 'https://world.openfoodfacts.org/cgi/search.pl';
const PRODUCT_BASE = 'https://world.openfoodfacts.org/api/v2/product';

export interface OFFProduct {
  code: string;
  productName: string;
  brand?: string;
  imageUrl?: string;
  /** Aanwezigheidsfactor van nutritiedata (0 = niets bekend, 1 = compleet). */
  completeness: number;
  /** Per 100g — let op: OFF kan ook per 100ml leveren bij dranken. */
  nutriments: {
    energyKcal?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    salt?: number;
  };
}

interface RawProduct {
  code?: string;
  product_name?: string;
  product_name_nl?: string;
  product_name_fr?: string;
  brands?: string;
  image_front_small_url?: string;
  image_url?: string;
  completeness?: number;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    salt_100g?: number;
  };
}

function mapProduct(p: RawProduct | undefined): OFFProduct | null {
  if (!p || !p.code) return null;
  const n = p.nutriments ?? {};
  return {
    code: p.code,
    productName: p.product_name_nl || p.product_name || p.product_name_fr || '',
    brand: p.brands?.split(',')[0]?.trim(),
    imageUrl: p.image_front_small_url || p.image_url,
    completeness: typeof p.completeness === 'number' ? p.completeness : 0,
    nutriments: {
      // Strikt /100g — de plain `energy-kcal` is dubbelzinnig (kan
      // per-portie of per-package zijn).
      energyKcal: n['energy-kcal_100g'],
      protein: n.proteins_100g,
      carbs: n.carbohydrates_100g,
      fat: n.fat_100g,
      fiber: n.fiber_100g,
      sugar: n.sugars_100g,
      salt: n.salt_100g,
    },
  };
}

/** Haal één product op via EAN/UPC. Geeft `null` bij 404 of corrupt antwoord. */
export async function getProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  const cleaned = barcode.replace(/\D/g, '');
  if (!cleaned) return null;

  const res = await fetch(`${PRODUCT_BASE}/${cleaned}.json`, {
    headers: { 'User-Agent': OFF_USER_AGENT },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: number; product?: RawProduct };
  if (data.status !== 1) return null;
  return mapProduct(data.product);
}

/**
 * Zoek de best passende treffer voor een ingrediëntnaam. We sorteren op
 * "completeness" en filteren producten zonder kcal weg — die zijn voor de
 * nutritie-aggregator nutteloos.
 */
export async function searchBestMatch(name: string): Promise<OFFProduct | null> {
  const q = name.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '8',
    fields:
      'code,product_name,product_name_nl,brands,completeness,nutriments,image_front_small_url',
    lang: 'nl',
  });

  const res = await fetch(`${SEARCH_BASE}?${params.toString()}`, {
    headers: { 'User-Agent': OFF_USER_AGENT },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { products?: RawProduct[] };
  const products = (data.products ?? [])
    .map(mapProduct)
    .filter((p): p is OFFProduct => p !== null && p.nutriments.energyKcal != null);

  if (products.length === 0) return null;
  products.sort((a, b) => b.completeness - a.completeness);
  return products[0];
}
