// Date logic for the timeline: YouTube's relative upload times ("3 days ago", "Streamed 5 hr ago") on
// Subscriptions, and its day headers ("Today", "Thursday", "27 Sept") on History.
// Pure: no DOM, so it's unit tested (test/timeline.test.ts).

const DAY = 864e5;
const MS = { second: 1e3, minute: 6e4, hour: 36e5, day: DAY, week: 7 * DAY, month: 30 * DAY, year: 365 * DAY } as const;
type Unit = keyof typeof MS;
export interface Age { n: number; unit: Unit }

// Long and short forms: "hours", "hr", "h" ("12h ago" is the compact logged-out form). Month is "mo", never "m".
const UNIT_RE: [RegExp, Unit][] = [
  [/^(seconds?|secs?|s)$/, 'second'], [/^(minutes?|mins?|m)$/, 'minute'], [/^(hours?|hrs?|h)$/, 'hour'],
  [/^(days?|d)$/, 'day'], [/^(weeks?|wks?|w)$/, 'week'], [/^(months?|mos?)$/, 'month'], [/^(years?|yrs?|y)$/, 'year'],
];

/** "Streamed 3 days ago" -> { n: 3, unit: 'day' }. English only; other locales return null. */
export function parseAge(text: string): Age | null {
  const m = text.match(/(\d+)\s*([a-z]+)\.?\s+ago\b/i);
  const unit = m && UNIT_RE.find(([re]) => re.test(m[2].toLowerCase()))?.[1];
  return unit ? { n: Number(m[1]), unit } : null;
}

export interface Group {
  /** Stable id: `d:2024-12-15` for a day, `r:2 weeks ago` for a relative bucket. */
  key: string;
  label: string;
  /** Approximate upload time, only for ordering groups. */
  at: number;
}

const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
export const dayKey = (d: Date) => `d:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** "Today - 15 Dec 2024", "Yesterday - 14 Dec 2024", "Friday - 12 Dec 2024", in `locale`. */
export function dayLabel(d: Date, now: Date, locale = 'en-GB'): string {
  const diff = Math.round((midnight(now) - midnight(d)) / DAY);
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  const name = diff <= 1
    ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-diff, 'day')
    : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
  return `${cap(name)} - ${date}`;
}

/**
 * Seconds to days give the upload day (YouTube rounds down, so "13 days ago" is still one day): group by it.
 * Weeks, months and years only give a range: group by YouTube's own wording ("2 weeks ago").
 * Returns null for text we can't read (other UI languages, "Scheduled for ...").
 */
export function groupOf(text: string, now: Date, locale?: string): Group | null {
  const age = parseAge(text);
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
 * Splits a newest-first feed into groups: `starts[i]` is the group that begins at item i.
 * Groups only move back in time. YouTube orders streams by end time but labels them by start
 * ("Streamed 21 hr ago" between 14 and 15 hr), so an item that looks newer stays in the current group,
 * and so does one we can't read. Items before the first readable one get no group.
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

/**
 * History day header ("Today", "Yesterday", "Thursday", "27 Sept", "27 Sept 2024") -> that day, or null.
 * Matches against Intl's own words for `locale`, so it follows the UI language.
 */
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
