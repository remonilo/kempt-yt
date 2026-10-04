// Subscriptions toolbar logic: what kind an item is, and whether a search matches it.
// Pure: no DOM, so it's unit tested (test/timeline.test.ts).

export type Kind = 'video' | 'live' | 'short';
export type Type = 'all' | 'videos' | 'live' | 'shorts';

/** Past and current streams carry a word in the metadata row ("Streamed 3 days ago", "1.2K watching"). English only. */
const LIVE_TEXT = /\b(streamed|watching|waiting|scheduled)\b/i;

/** `short`: links to /shorts/. `badge`: has YouTube's live thumbnail badge (any language, current streams only). */
export function kindOf(o: { short: boolean; badge: boolean; meta: string }): Kind {
  if (o.short) return 'short';
  return o.badge || LIVE_TEXT.test(o.meta) ? 'live' : 'video';
}

/** Does `kind` belong under the chip? */
export const inType = (kind: Kind, type: Type) => type === 'all' || `${kind}s`.replace('lives', 'live') === type;

/** Every word of `query` appears in `text`, ignoring case and accents. Empty query matches. */
export function matches(text: string, query: string): boolean {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const hay = fold(text);
  return fold(query).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
