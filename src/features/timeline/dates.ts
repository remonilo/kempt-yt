// Pure: no DOM, so it's unit tested (test/timeline.test.ts).

const DAY = 864e5;
const MS = { second: 1e3, minute: 6e4, hour: 36e5, day: DAY, week: 7 * DAY, month: 30 * DAY, year: 365 * DAY } as const;
type Unit = keyof typeof MS;
/** `extra`: words around the age ("Streamed 3 days ago", "vor 3 Tagen gestreamt"), which plain uploads never have. */
export interface Age { n: number; unit: Unit; extra: boolean }

// English compact forms Intl doesn't write: "7 hr ago", "12h ago", "2 wk ago". Month is "mo", never "m".
const UNIT_RE: [RegExp, Unit][] = [
  [/^(seconds?|secs?|s)$/, 'second'], [/^(minutes?|mins?|m)$/, 'minute'], [/^(hours?|hrs?|h)$/, 'hour'],
  [/^(days?|d)$/, 'day'], [/^(weeks?|wks?|w)$/, 'week'], [/^(months?|mos?)$/, 'month'], [/^(years?|yrs?|y)$/, 'year'],
];
const EN_RE = /(\d+)\s*([a-z]+)\.?\s+ago\b/i;

const space = (s: string) => s.replace(/[\s\u00a0\u202f]+/g, ' ');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const AGO = new Map<string, { re: RegExp; units: Unit[] }>();

/** Capture group i is `units[i]`. */
function agoRe(locale: string) {
  let r = AGO.get(locale);
  if (r) return r;
  const alts = new Map<string, Unit>();
  for (const style of ['long', 'short', 'narrow'] as const) {
    const rtf = new Intl.RelativeTimeFormat(`${locale}-u-nu-latn`, { style });
    for (const unit of Object.keys(MS) as Unit[]) {
      for (let n = 0; n <= 111; n++) {
        const parts = rtf.formatToParts(-n, unit);
        const i = parts.findIndex((p) => p.type === 'integer');
        if (i < 0) continue;
        const side = (ps: typeof parts) => esc(space(ps.map((p) => p.value).join('')));
        const alt = `${side(parts.slice(0, i))}(\\d+)${side(parts.slice(i + 1))}`;
        if (!alts.has(alt)) alts.set(alt, unit);
      }
    }
  }
  const keys = [...alts.keys()].sort((a, b) => b.length - a.length); // "3 semanas" before "3 sem."
  r = { re: new RegExp(keys.join('|'), 'iu'), units: keys.map((k) => alts.get(k)!) };
  AGO.set(locale, r);
  return r;
}

export function parseAge(text: string, locale = 'en'): Age | null {
  const t = space(text);
  const age = (m: RegExpMatchArray, n: string, unit: Unit): Age =>
    ({ n: Number(n), unit, extra: /\p{L}/u.test(t.replace(m[0], '')) });
  const { re, units } = agoRe(locale);
  const m = t.match(re);
  if (m) {
    const i = m.findIndex((g, j) => j > 0 && g !== undefined);
    return age(m, m[i], units[i - 1]);
  }
  const en = t.match(EN_RE);
  const unit = en && UNIT_RE.find(([r]) => r.test(en[2].toLowerCase()))?.[1];
  return en && unit ? age(en, en[1], unit) : null;
}

export interface Group {
  key: string;
  label: string;
  /** Approximate: only for ordering groups. */
  at: number;
}

const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
export const dayKey = (d: Date) => `d:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

export function dayLabel(d: Date, now: Date, locale = 'en-GB'): string {
  const diff = Math.round((midnight(now) - midnight(d)) / DAY);
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  const name = diff <= 1
    ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-diff, 'day')
    : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
  return `${cap(name)} - ${date}`;
}

/** The upload day for seconds to days, YouTube's own wording beyond. */
export function groupOf(text: string, now: Date, locale?: string): Group | null {
  const age = parseAge(text, locale);
  if (!age) return null;
  const at = now.getTime() - age.n * MS[age.unit];
  if (age.unit === 'week' || age.unit === 'month' || age.unit === 'year') {
    const label = cap(new Intl.RelativeTimeFormat(locale ?? 'en-GB').format(-age.n, age.unit));
    return { key: `r:${age.n}${age.unit}`, label, at };
  }
  const d = new Date(at);
  return { key: dayKey(d), label: dayLabel(d, now, locale), at };
}

/**
 * Groups only move back in time, so a newer-looking or unreadable item stays in the current group. Items before
 * the first readable one get no group.
 */
export function plan(texts: string[], now: Date, locale?: string): Map<number, Group> {
  const starts = new Map<number, Group>();
  let cur: Group | null = null;
  texts.forEach((t, i) => {
    const g = groupOf(t, now, locale);
    if (!g || g.key === cur?.key || (cur && g.at >= cur.at)) return;
    starts.set(i, (cur = g));
  });
  return starts;
}

// Matches against Intl's own words for `locale`, so it follows the UI language.
export function historyDate(label: string, now: Date, locale = 'en-GB'): Date | null {
  const want = label.trim().toLocaleLowerCase();
  const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const long = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const day = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  for (let n = 0; n < 2; n++) if (rel.format(-n, 'day').toLocaleLowerCase() === want) return day(n);
  for (let n = 2; n < 7; n++) if (weekday.format(day(n)).toLocaleLowerCase() === want) return day(n);
  for (let n = 0; n < 800; n++) {
    const d = day(n);
    if ((n < 365 && short.format(d).toLocaleLowerCase() === want) || long.format(d).toLocaleLowerCase() === want) return d;
  }
  if (!/\d/.test(label)) return null;
  const parsed = Date.parse(/\d{4}/.test(label) ? label : `${label} ${now.getFullYear()}`);
  if (Number.isNaN(parsed)) return null;
  const d = new Date(parsed);
  if (d.getTime() > now.getTime()) d.setFullYear(d.getFullYear() - 1);
  return d;
}
