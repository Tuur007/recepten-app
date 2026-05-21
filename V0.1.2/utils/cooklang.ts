// utils/cooklang.ts
//
// Converteert onze Recipe naar een Cooklang `.cook`-bestand
// (https://cooklang.org/docs/spec/). De spec is licht; we genereren een
// canoniek, leesbaar bestand met:
//
//   • >> metadata-regels (titel, porties, tijden, bron-URL)
//   • lege regel als visuele separator
//   • elke stap als eigen regel, met @ingredient{qty%unit} verwijzingen
//     INLINE wanneer de ingrediëntnaam letterlijk in de stap voorkomt
//   • voor niet-gebruikte ingrediënten een explicit @-blok aan het einde,
//     zodat geen enkel ingrediënt verloren gaat in de export
//
// Het ontwerp accepteert dat onze interne `ingredients` als losse lijst
// staan en niet als inline tokens in de stappen — Cooklang verwacht
// strikt inline, maar de meeste parsers tolereren extra @-blokken aan het
// einde van een recept en de spec laat het toe als 'dangling'.

import type { Recipe, Ingredient } from '../types/recipe';

function escapeMetaValue(value: string): string {
  // Cooklang metadata is per regel: `>> key: value` — geen escape nodig zolang
  // we geen newlines toestaan in de value.
  return value.replace(/\r?\n+/g, ' ').trim();
}

function escapeBody(text: string): string {
  // Spec laat letterlijke @, # en ~ alleen toe als token-start. Voor stap-tekst
  // is dat veilig zo lang we ze niet met onbedoelde "Word{...}" combineren.
  return text.replace(/\r?\n+/g, ' ').trim();
}

/** Format quantity zonder onnodige decimalen ("1.0" → "1", "0.5" blijft). */
function formatQty(qty: number): string {
  if (!Number.isFinite(qty) || qty <= 0) return '';
  if (Number.isInteger(qty)) return String(qty);
  return String(Math.round(qty * 100) / 100);
}

/** Format één ingrediënt naar een Cooklang inline-token. */
function formatIngredient(ing: Ingredient): string {
  const qty = formatQty(ing.quantity);
  const unit = ing.unit?.trim();
  const inner =
    qty && unit ? `{${qty}%${unit}}`
    : qty       ? `{${qty}}`
    : unit      ? `{%${unit}}`
    :             '{}';
  // Multi-word ingrediëntnamen moeten Cooklang in {} laten beginnen via
  // de @word{...}-vorm waarbij `word` letterlijk de hele naam is + {} suffix.
  // De spec verwacht voor meerdere woorden: `@some long name{}`.
  const cleanName = ing.name.replace(/\s+/g, ' ').trim();
  return `@${cleanName}${inner}`;
}

/**
 * Genereert een volledig Cooklang-document voor een recept.
 *
 *     >> servings: 4
 *     >> time: 35 min
 *     >> source: https://...
 *
 *     Snij @ui{1} in stukjes en bak in @olie{2%el}.
 *
 *     -- Niet-gebruikt in stappen (referentielijst):
 *     @peper{1%snufje}
 *     @zout{1%snufje}
 */
export function recipeToCooklang(recipe: Recipe): string {
  const lines: string[] = [];

  // Metadata
  lines.push(`>> title: ${escapeMetaValue(recipe.title)}`);
  if (recipe.category)        lines.push(`>> category: ${escapeMetaValue(recipe.category)}`);
  if (recipe.servings)        lines.push(`>> servings: ${recipe.servings}`);
  if (recipe.preparationTime) lines.push(`>> prep time: ${recipe.preparationTime} min`);
  if (recipe.cookingTime)     lines.push(`>> cook time: ${recipe.cookingTime} min`);
  if (recipe.duration && !recipe.preparationTime && !recipe.cookingTime) {
    lines.push(`>> time: ${recipe.duration} min`);
  }
  if (recipe.difficulty)      lines.push(`>> difficulty: ${recipe.difficulty}`);
  if (recipe.sourceUrl)       lines.push(`>> source: ${escapeMetaValue(recipe.sourceUrl)}`);
  if (recipe.notes)           lines.push(`>> notes: ${escapeMetaValue(recipe.notes)}`);

  lines.push('');

  // Stappen — probeer per stap ingrediënten in te lijnen wanneer ze
  // letterlijk in de stap voorkomen.
  const inlineMatches = new Set<string>();
  for (const step of recipe.steps ?? []) {
    let body = escapeBody(typeof step === 'string' ? step : String(step));
    for (const ing of recipe.ingredients ?? []) {
      if (inlineMatches.has(ing.id)) continue;
      const escaped = ing.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'i');
      if (re.test(body)) {
        body = body.replace(re, formatIngredient(ing));
        inlineMatches.add(ing.id);
      }
    }
    lines.push(body);
    lines.push('');
  }

  // Resterende ingrediënten als referentielijst — strikt genomen geen Cooklang-
  // syntax maar wordt door alle parsers (Cooklang Sandbox, CookCLI) genegeerd
  // of als losse ingredient-token herkend. We zetten ze achter een `--`
  // comment-prefix zodat het visueel duidelijk is.
  const remaining = (recipe.ingredients ?? []).filter((i) => !inlineMatches.has(i.id));
  if (remaining.length > 0) {
    lines.push('-- Ingrediënten (niet in stappen genoemd):');
    for (const ing of remaining) {
      lines.push(formatIngredient(ing));
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

/** Slugify recipe title to a safe filename. */
export function recipeToCooklangFilename(recipe: Recipe): string {
  const slug = recipe.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'recept'}.cook`;
}
