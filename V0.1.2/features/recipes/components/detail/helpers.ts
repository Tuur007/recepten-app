export function toDisplayUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('data:') || uri.startsWith('http')) return uri;
  return `file://${uri}`;
}

export function stepText(step: unknown): string {
  if (typeof step === 'string') return step;
  if (step && typeof step === 'object' && 'text' in step) {
    return String((step as { text: unknown }).text);
  }
  return '';
}

export function splitTitle(title: string): { lead: string; tail: string } {
  const words = title.trim().split(' ');
  if (words.length === 1) return { lead: '', tail: title };
  return { lead: words.slice(0, -1).join(' '), tail: words[words.length - 1] };
}

export function pad2(n: number | undefined): string {
  return n != null ? String(n).padStart(2, '0') : '–';
}
