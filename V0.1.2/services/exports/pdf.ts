// services/exports/pdf.ts
//
// PDF-exports voor recepten en boodschappenlijsten. We renderen via een HTML-
// template naar `expo-print`, en delen het resulterende bestand via
// `expo-sharing`. Beide modules worden lazy geladen — dezelfde aanpak als
// utils/shareRecipe.ts — zodat een ontbrekende dep ons niet hard laat crashen
// op installaties die de feature niet hebben.
//
// De HTML-templates zijn opzettelijk eenvoudig: zwarte tekst op crème,
// editorial fonts via system fallback (serif/sans-serif), geen externe assets.
// Voor een richer print-look kan dit later vervangen worden door een React-
// component met react-native-view-shot — voor nu is platte HTML genoeg.

import type { Recipe } from '../../types/recipe';
import type { GroceryItem } from '../../types/grocery';

type PrintModule = typeof import('expo-print');
type SharingModule = typeof import('expo-sharing');

let cachedPrint: PrintModule | null = null;
let printChecked = false;
function getPrint(): PrintModule | null {
  if (printChecked) return cachedPrint;
  printChecked = true;
  try {
    cachedPrint = require('expo-print');
  } catch {
    cachedPrint = null;
  }
  return cachedPrint;
}

let cachedSharing: SharingModule | null = null;
let sharingChecked = false;
function getSharing(): SharingModule | null {
  if (sharingChecked) return cachedSharing;
  sharingChecked = true;
  try {
    cachedSharing = require('expo-sharing');
  } catch {
    cachedSharing = null;
  }
  return cachedSharing;
}

const PAGE_CSS = `
  @page { margin: 24mm 18mm; }
  * { box-sizing: border-box; }
  body {
    background: #F6F1E7;
    color: #191613;
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
    padding: 24px;
  }
  .folio {
    text-transform: uppercase;
    letter-spacing: 3px;
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    color: rgba(25,22,19,0.55);
  }
  .title {
    font-size: 36pt;
    font-weight: 300;
    margin: 16px 0 8px;
    line-height: 1;
    letter-spacing: -0.8px;
  }
  .title em { color: #C2492A; font-style: italic; font-weight: 300; }
  .intro {
    color: rgba(25,22,19,0.55);
    font-style: italic;
    margin-bottom: 18px;
  }
  .meta {
    border-top: 0.5px solid rgba(25,22,19,0.25);
    border-bottom: 0.5px solid rgba(25,22,19,0.25);
    padding: 10px 0;
    display: flex;
    gap: 24px;
    margin-bottom: 24px;
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .meta .col { display: flex; flex-direction: column; }
  .meta .num { font-family: 'Georgia', serif; font-size: 18pt; letter-spacing: 0; text-transform: none; }
  h2 {
    text-transform: uppercase;
    letter-spacing: 3px;
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    margin-top: 24px;
    border-bottom: 0.5px solid rgba(25,22,19,0.15);
    padding-bottom: 6px;
  }
  ul { list-style: none; padding: 0; }
  li.ing { display: flex; gap: 8px; padding: 6px 0; border-bottom: 0.5px solid rgba(25,22,19,0.08); }
  li.ing .qty { width: 60px; font-family: 'Courier New', monospace; font-size: 9pt; }
  li.ing .unit { width: 60px; font-style: italic; color: rgba(25,22,19,0.55); }
  ol.steps { padding-left: 0; counter-reset: step; }
  ol.steps li {
    list-style: none;
    counter-increment: step;
    padding: 10px 0;
    border-bottom: 0.5px solid rgba(25,22,19,0.08);
    display: flex;
    gap: 16px;
  }
  ol.steps li::before {
    content: counter(step, decimal-leading-zero);
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    color: #C2492A;
    width: 28px;
  }
  .nutri {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .nutri .cell {
    border: 0.5px solid rgba(25,22,19,0.15);
    padding: 8px 12px;
    min-width: 90px;
  }
  .nutri .cell .v { font-size: 14pt; }
  .nutri .cell .l { font-family: 'Courier New', monospace; font-size: 8pt; text-transform: uppercase; letter-spacing: 2px; color: rgba(25,22,19,0.55); }
  .grocery-cat {
    margin-top: 20px;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    border-bottom: 0.5px solid rgba(25,22,19,0.25);
    padding-bottom: 6px;
  }
  .grocery li { display: flex; padding: 4px 0; }
  .grocery li .check { width: 18px; }
`;

function escapeHtml(input: string | number | undefined | null): string {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitTail(title: string): { lead: string; tail: string } {
  const w = title.trim().split(' ');
  if (w.length < 2) return { lead: '', tail: title };
  return { lead: w.slice(0, -1).join(' '), tail: w[w.length - 1] };
}

function recipeHtml(recipe: Recipe): string {
  const { lead, tail } = splitTail(recipe.title);
  const ingredients = (recipe.ingredients ?? [])
    .map((i) => {
      const qty = i.quantity ? String(Math.round(i.quantity * 100) / 100) : '';
      return `<li class="ing"><span class="qty">${escapeHtml(qty)}</span><span class="unit">${escapeHtml(i.unit)}</span><span>${escapeHtml(i.name)}</span></li>`;
    })
    .join('');
  const steps = (recipe.steps ?? [])
    .map((s) => `<li>${escapeHtml(typeof s === 'string' ? s : '')}</li>`)
    .join('');

  const meta: string[] = [];
  if (recipe.preparationTime) meta.push(`<div class="col"><span class="num">${recipe.preparationTime}</span><span>min voorber.</span></div>`);
  if (recipe.cookingTime)     meta.push(`<div class="col"><span class="num">${recipe.cookingTime}</span><span>min koken</span></div>`);
  if (recipe.servings)        meta.push(`<div class="col"><span class="num">${recipe.servings}</span><span>porties</span></div>`);
  if (recipe.ingredients?.length) meta.push(`<div class="col"><span class="num">${recipe.ingredients.length}</span><span>ing.</span></div>`);

  const n = recipe.nutrition;
  const nutriCells: string[] = [];
  if (n?.calories != null) nutriCells.push(`<div class="cell"><div class="v">${n.calories}</div><div class="l">kcal</div></div>`);
  if (n?.protein  != null) nutriCells.push(`<div class="cell"><div class="v">${n.protein}g</div><div class="l">eiwit</div></div>`);
  if (n?.carbs    != null) nutriCells.push(`<div class="cell"><div class="v">${n.carbs}g</div><div class="l">kh</div></div>`);
  if (n?.fat      != null) nutriCells.push(`<div class="cell"><div class="v">${n.fat}g</div><div class="l">vet</div></div>`);
  if (n?.fiber    != null) nutriCells.push(`<div class="cell"><div class="v">${n.fiber}g</div><div class="l">vezel</div></div>`);

  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>${escapeHtml(recipe.title)}</title>
<style>${PAGE_CSS}</style></head><body>
  <div class="folio">recept · ${escapeHtml(recipe.category || '—')}</div>
  <h1 class="title">${lead ? escapeHtml(lead) + ' ' : ''}<em>${escapeHtml(tail)}.</em></h1>
  ${recipe.sourceUrl ? `<div class="intro">Bron: ${escapeHtml(recipe.sourceUrl)}</div>` : ''}
  ${meta.length ? `<div class="meta">${meta.join('')}</div>` : ''}
  <h2>i. ingrediënten</h2>
  <ul>${ingredients}</ul>
  <h2>ii. werkwijze</h2>
  <ol class="steps">${steps}</ol>
  ${nutriCells.length ? `<h2>iii. nutritie (per portie)</h2><div class="nutri">${nutriCells.join('')}</div>` : ''}
  ${recipe.notes ? `<h2>notities</h2><div>${escapeHtml(recipe.notes)}</div>` : ''}
</body></html>`;
}

function groceryHtml(items: GroceryItem[]): string {
  // Group by aisle (or category as fallback).
  const groups = new Map<string, GroceryItem[]>();
  for (const item of items) {
    const key = item.aisle || item.category || 'Overig';
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const groupedHtml = Array.from(groups.entries())
    .map(([aisle, list]) => {
      const rows = list
        .map((g) => {
          const qty = g.totalQuantity ? `${Math.round(g.totalQuantity * 100) / 100} ${g.unit || ''}`.trim() : '';
          return `<li><span class="check">${g.checked ? '☑' : '☐'}</span><span style="flex:1">${escapeHtml(g.name)}</span><span style="font-family:Courier New, monospace; font-size: 9pt;">${escapeHtml(qty)}</span></li>`;
        })
        .join('');
      return `<div class="grocery-cat">${escapeHtml(aisle)}</div><ul class="grocery">${rows}</ul>`;
    })
    .join('');

  const today = new Date().toLocaleDateString('nl-BE', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Boodschappenlijst</title>
<style>${PAGE_CSS}</style></head><body>
  <div class="folio">boodschappen · ${escapeHtml(today)}</div>
  <h1 class="title">De <em>lijst.</em></h1>
  ${groupedHtml}
</body></html>`;
}

async function printAndShare(html: string, filename: string): Promise<void> {
  const print = getPrint();
  const sharing = getSharing();
  if (!print) {
    throw new Error('PDF-export vereist expo-print. Installeer de dep en herstart de app.');
  }
  const { uri } = await print.printToFileAsync({ html, base64: false });
  if (!sharing) {
    throw new Error('Delen is niet beschikbaar — installeer expo-sharing.');
  }
  const available = await sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Delen wordt niet ondersteund op dit toestel.');
  }
  await sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: filename,
    UTI: 'com.adobe.pdf',
  });
}

export async function exportRecipeAsPdf(recipe: Recipe): Promise<void> {
  await printAndShare(recipeHtml(recipe), `recept-${recipe.title}.pdf`);
}

export async function exportGroceryListAsPdf(items: GroceryItem[]): Promise<void> {
  if (items.length === 0) {
    throw new Error('Boodschappenlijst is leeg.');
  }
  await printAndShare(groceryHtml(items), 'boodschappenlijst.pdf');
}
