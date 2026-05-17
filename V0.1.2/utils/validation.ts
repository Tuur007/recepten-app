const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|\[::1\])/i;

export const MAX_RECIPE_TITLE_LENGTH = 200;
export const MAX_INGREDIENT_NAME_LENGTH = 200;
export const MAX_STEP_LENGTH = 5000;
export const MAX_URL_LENGTH = 2048;

/** Returns true when the URL is safe to fetch/display (http(s), no private hosts). */
export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    if (PRIVATE_HOST_RE.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function validateRecipeTitle(title: string): string {
  const t = title.trim();
  if (!t) throw new Error('Recepttitel is verplicht.');
  if (t.length > MAX_RECIPE_TITLE_LENGTH) {
    throw new Error(`Recepttitel mag maximaal ${MAX_RECIPE_TITLE_LENGTH} tekens bevatten.`);
  }
  return t;
}
