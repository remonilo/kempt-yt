// Subscriptions toolbar logic: what kind an item is, and whether a search matches it.
// Pure: no DOM, so it's unit tested (test/timeline.test.ts).

import type { Age } from './dates.ts';

export type Kind = 'video' | 'live' | 'short';
export type Type = 'all' | 'videos' | 'live' | 'shorts';

/**
 * `short`: links to /shorts/. `badge`: YouTube's live badge (on now). `age`: the item's age part; past streams have
 * words around it, upcoming ones have none. `readable`: some item had an age, so a missing one means upcoming.
 */
export function kindOf(o: { short: boolean; badge: boolean; age: Age | null; readable: boolean }): Kind {
  if (o.short) return 'short';
  if (o.badge) return 'live';
  if (o.age) return o.age.extra ? 'live' : 'video';
  return o.readable ? 'live' : 'video';
}

/** Does `kind` belong under the chip? */
export const inType = (kind: Kind, type: Type) => type === 'all' || `${kind}s`.replace('lives', 'live') === type;

/** Every word of `query` appears in `text`, ignoring case and accents. Empty query matches. */
export function matches(text: string, query: string): boolean {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const hay = fold(text);
  return fold(query).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
