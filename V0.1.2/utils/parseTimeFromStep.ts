/**
 * parseTimeFromStep.ts — extract time durations mentioned in a recipe step.
 *
 * Returns the positions and durations of every "10 min", "1 uur", "30 sec",
 * "1,5 uur" or "10-15 minuten" expression found in the supplied text. The
 * cook-mode UI renders one tap-to-start timer chip per match.
 *
 * For ranges like "10-15 minuten" we take the upper bound — better to over-
 * cook by a minute than serve raw food.
 */

export interface TimeMatch {
  /** Inclusive start index in the original string */
  start: number;
  /** Exclusive end index in the original string */
  end: number;
  /** Verbatim slice of the match (for the chip label) */
  text: string;
  /** Total duration in seconds */
  seconds: number;
}

interface UnitDef {
  aliases: string[];
  /** Seconds contributed by one count of this unit */
  perUnit: number;
  /**
   * If true, the alias is only a valid match when it sits directly against
   * the number (e.g. "5m"). This is needed for the single-letter aliases
   * u/h/m/s so we don't match the m in "men".
   */
  singleLetter?: boolean;
}

// Order matters: longer keywords first so "minuten" wins over "min" and the
// bare "m" comes last. Single-letter aliases get a stricter check below.
const UNITS: UnitDef[] = [
  { aliases: ['uren', 'uur', 'hours', 'hour', 'hrs', 'hr'], perUnit: 3600 },
  { aliases: ['minuten', 'minuut', 'minutes', 'minute', 'mins', 'min'], perUnit: 60 },
  { aliases: ['seconden', 'seconde', 'seconds', 'second', 'secs', 'sec'], perUnit: 1 },
  { aliases: ['u', 'h'], perUnit: 3600, singleLetter: true },
  { aliases: ['m'], perUnit: 60, singleLetter: true },
  { aliases: ['s'], perUnit: 1, singleLetter: true },
];

function buildPattern(): RegExp {
  // Match: <number>[,.<decimal>][<dash><number2>] <whitespace?> <unit>
  const allAliases = UNITS.flatMap((u) => u.aliases);
  const unitGroup = allAliases
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return new RegExp(
    String.raw`(\d+(?:[.,]\d+)?)\s*(?:[-–—]\s*(\d+(?:[.,]\d+)?)\s*)?(${unitGroup})\b`,
    'gi',
  );
}

const PATTERN = buildPattern();

function toNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'));
}

function unitForAlias(alias: string): UnitDef | undefined {
  const lower = alias.toLowerCase();
  return UNITS.find((u) => u.aliases.includes(lower));
}

export function findTimesInStep(stepText: string): TimeMatch[] {
  if (!stepText) return [];
  const out: TimeMatch[] = [];

  // Reset state on a fresh global regex to avoid cross-call pollution.
  const re = new RegExp(PATTERN.source, PATTERN.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(stepText)) !== null) {
    const [full, low, high, alias] = m;
    const unit = unitForAlias(alias);
    if (!unit) continue;

    // Single-letter aliases (u, h, m, s) are only valid when stuck to the
    // number (e.g. "5m", "1h30m") to avoid matching the random "m" in
    // "een mooie pan op het vuur".
    if (unit.singleLetter) {
      // Require there to be no whitespace between number and alias.
      const numEnd = m.index + (low?.length ?? 0);
      const aliasStart = m.index + full.toLowerCase().indexOf(alias.toLowerCase());
      if (aliasStart !== numEnd) continue;
      // Also require the next character (after the alias) to not be a letter
      // — guards against matching the "m" in "men".
      const after = stepText[m.index + full.length];
      if (after && /[a-z]/i.test(after)) continue;
    }

    const lowNum = toNumber(low);
    const highNum = high ? toNumber(high) : undefined;
    const value = highNum != null ? Math.max(lowNum, highNum) : lowNum;
    const seconds = Math.round(value * unit.perUnit);
    if (seconds <= 0) continue;

    out.push({
      start: m.index,
      end: m.index + full.length,
      text: full,
      seconds,
    });
  }

  // De-overlap: when two matches overlap (e.g. a unit alias was matched twice
  // due to the multi-pass regex), keep the earlier one.
  const filtered: TimeMatch[] = [];
  for (const match of out) {
    if (filtered.some((p) => p.end > match.start)) continue;
    filtered.push(match);
  }

  return filtered;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
