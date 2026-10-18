// YouTube search honours `after:YYYY-MM-DD` and `before:YYYY-MM-DD` in the query text. The Date range chip writes
// them; these helpers read them back out and rewrite them, leaving the rest of the query alone.

export interface Range {
  after?: string;
  before?: string;
}

const TOKENS = /"[^"]*"?|\S+/g; // a quoted phrase (maybe unclosed) or a bare word
const OP = /^(after|before):(\d{4}-\d{2}-\d{2})$/i;

/** The query without its date operators, and the range they set. Operators inside quotes are plain text. */
export function readRange(query: string): Range & { text: string } {
  const out: Range & { text: string } = { text: '' };
  const words: string[] = [];
  for (const [t] of query.matchAll(TOKENS)) {
    const m = OP.exec(t);
    if (m) out[m[1].toLowerCase() as 'after' | 'before'] = m[2];
    else words.push(t);
  }
  out.text = words.join(' ');
  return out;
}

/** `query` with its date operators replaced by `range` (empty range: removed). */
export function withRange(query: string, range: Range): string {
  const { text } = readRange(query);
  const ops = [range.after && `after:${range.after}`, range.before && `before:${range.before}`].filter(Boolean);
  return [text, ...ops].filter(Boolean).join(' ');
}

/** `YYYY-MM-DD` moved by `days`; empty stays undefined. */
export function shift(d: string | undefined, days: number): string | undefined {
  if (!d) return undefined;
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** The years `from`..`to` (inclusive `YYYY-MM-DD`s) cover when they run from a Jan 1 to a Dec 31, else null. */
export function yearSpan(from: string, to: string): [number, number] | null {
  if (!from.endsWith('-01-01') || !to.endsWith('-12-31')) return null;
  const a = +from.slice(0, 4);
  const b = +to.slice(0, 4);
  return a <= b ? [a, b] : null;
}

/** The inclusive range after clicking year `y`: a second year extends a single picked year, otherwise `y` alone. */
export function pickYear(from: string, to: string, y: number): { from: string; to: string } {
  const span = yearSpan(from, to);
  const [a, b] = span && span[0] === span[1] && span[0] !== y ? [Math.min(y, span[0]), Math.max(y, span[0])] : [y, y];
  return { from: `${a}-01-01`, to: `${b}-12-31` };
}

// `sp` is a base64 protobuf: field 2 holds the filters, and its field 1 is Upload date (Today 2 ... This year 5).
// Reading it tells the Upload date group apart from the others without its localized title.
function varint(b: Uint8Array, i: number): [number, number] {
  let v = 0;
  for (let s = 0; ; s += 7) {
    const c = b[i++];
    if (c === undefined) throw new RangeError('truncated varint');
    v += (c & 0x7f) * 2 ** s;
    if (!(c & 0x80)) return [v, i];
  }
}

function field(b: Uint8Array, want: number): number | Uint8Array | undefined {
  for (let i = 0; i < b.length;) {
    let key: number;
    [key, i] = varint(b, i);
    const type = key & 7;
    let v: number | Uint8Array;
    if (type === 0) [v, i] = varint(b, i);
    else if (type === 2) {
      let len: number;
      [len, i] = varint(b, i);
      v = b.subarray(i, (i += len));
    } else if (type === 1 || type === 5) {
      i += type === 1 ? 8 : 4;
      continue;
    } else return undefined;
    if (Math.floor(key / 8) === want) return v;
  }
  return undefined;
}

/** The Upload date value an `sp` sets, if any. */
export function uploadDateOf(sp: string): number | undefined {
  try {
    const bytes = Uint8Array.from(atob(decodeURIComponent(sp)), (c) => c.charCodeAt(0));
    const filters = field(bytes, 2);
    const v = filters instanceof Uint8Array ? field(filters, 1) : undefined;
    return typeof v === 'number' ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Whether a filter group is Upload date: its links set at least two different upload dates (the other groups
 *  carry the current one along unchanged). */
export const isUploadDate = (paramsList: (string | null)[]) =>
  new Set(paramsList.map((p) => (p ? uploadDateOf(p) : undefined)).filter((v) => v !== undefined)).size >= 2;
