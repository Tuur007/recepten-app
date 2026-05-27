export function parseDurationIso8601(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  // e.g. PT30M, PT1H30M, PT1H, P0DT45M
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return undefined;
  const hours = m[1] ? parseInt(m[1], 10) : 0;
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 && total < 1440 ? total : undefined;
}

export function parseDurationNumber(mins: number): number | undefined {
  return mins > 0 && mins < 1440 ? mins : undefined;
}
