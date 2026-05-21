// services/colruyt.ts
//
// Lichtgewicht zoekclient voor de publieke Colruyt productzoekservice. We
// raken het search-endpoint dat ook door de Colruyt-website zelf gebruikt
// wordt; daar zit geen authenticatie op voor anonieme zoekopdrachten.
//
// LET OP: dit endpoint is geen officiële, gedocumenteerde API en kan zonder
// waarschuwing veranderen. Bij een 4xx- of CORS-foutmelding behandelen we het
// resultaat als "geen treffers" — we gooien zelf geen exceptie zodat de UI
// graceful kan terugvallen op handmatig invoeren.
//
// Velden:
//   • naam, prijs (incl. BTW), eenheidsprijs ("€/kg" etc.) en barcode (EAN)
//   • thumbnail-URL — handig voor toekomstige preview-strips
//
// Het endpoint geeft veel velden die we hier niet mappen; voeg gerust toe
// als de UI er iets aan heeft. Mappen we doelbewust klein om de bundle
// niet te laten groeien voor onbenutte velden.

const SEARCH_URL =
  'https://api.colruytgroup.com/personalisationms/v1/personalisation/anonymous/search/products';

export interface ColruytProduct {
  id: string;
  name: string;
  brand?: string;
  /** Prijs per stuk in euro, incl. BTW. */
  price?: number;
  /** Eenheidsprijs als losse tekst zodat we het label rechtstreeks kunnen tonen ("€8,45 / kg"). */
  unitPrice?: string;
  /** EAN/UPC-barcode wanneer beschikbaar — koppelbaar aan OFF voor nutritie. */
  barcode?: string;
  /** Thumbnail-URL (kleine variant) zoals door Colruyt aangeleverd. */
  imageUrl?: string;
}

interface RawAltId {
  Type?: string;
  type?: string;
  Value?: string;
  value?: string;
}

interface RawColruytItem {
  productId?: string;
  technicalArticleNumber?: string;
  LongName?: string;
  longName?: string;
  Name?: string;
  name?: string;
  brand?: string;
  Brand?: string;
  price?: { basicPrice?: number; measurementUnitPrice?: string };
  Price?: { BasicPrice?: number; MeasurementUnitPrice?: string };
  IsWeightArticle?: boolean;
  thumbNail?: string;
  ThumbNail?: string;
  AlternativeIDs?: RawAltId[];
  alternativeIds?: RawAltId[];
}

function pickBarcode(item: RawColruytItem): string | undefined {
  const candidates: RawAltId[] = item.AlternativeIDs ?? item.alternativeIds ?? [];
  for (const c of candidates) {
    const t = (c.Type ?? c.type ?? '').toLowerCase();
    const v = c.Value ?? c.value;
    if (v && (t.includes('ean') || t.includes('upc') || t.includes('gtin'))) return v;
  }
  return undefined;
}

function mapItem(raw: RawColruytItem): ColruytProduct {
  const price = raw.price ?? (raw.Price
    ? { basicPrice: raw.Price.BasicPrice, measurementUnitPrice: raw.Price.MeasurementUnitPrice }
    : undefined);
  return {
    id: raw.productId ?? raw.technicalArticleNumber ?? '',
    name: raw.LongName ?? raw.longName ?? raw.Name ?? raw.name ?? '',
    brand: raw.Brand ?? raw.brand,
    price: price?.basicPrice,
    unitPrice: price?.measurementUnitPrice,
    barcode: pickBarcode(raw),
    imageUrl: raw.ThumbNail ?? raw.thumbNail,
  };
}

export interface ColruytSearchOptions {
  /** Maximum aantal resultaten in de respons. Colruyt accepteert tot ±50. */
  limit?: number;
  /** Optioneel signal om de fetch af te breken (bij snel typen). */
  signal?: AbortSignal;
}

/**
 * Zoek producten op naam in het Colruyt-assortiment. Geeft een lege lijst
 * (geen exception) als het endpoint onbereikbaar is — de UI hoort dan een
 * neutrale "geen treffers" te tonen.
 */
export async function searchColruytProducts(
  query: string,
  opts: ColruytSearchOptions = {},
): Promise<ColruytProduct[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    placeId: '1',
    SalesChannel: 'PRT',
    clientCode: 'CLP',
    size: String(opts.limit ?? 20),
    sort: 'relevance',
    keyword: q,
  });

  try {
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'nl-BE',
      },
      signal: opts.signal,
    });
    if (!res.ok) {
      console.warn(`[colruyt] zoekopdracht gaf ${res.status}`);
      return [];
    }
    const data = (await res.json()) as { products?: RawColruytItem[]; Products?: RawColruytItem[] };
    const items = data.products ?? data.Products ?? [];
    return items.map(mapItem).filter((p) => p.name && p.id);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return [];
    console.warn('[colruyt] zoekopdracht mislukt:', err);
    return [];
  }
}
