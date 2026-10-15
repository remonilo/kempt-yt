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

export const inType = (kind: Kind, type: Type) => type === 'all' || `${kind}s`.replace('lives', 'live') === type;

export type Range = 'any' | 'today' | 'week' | 'month' | 'older';
const SLICES: Range[] = ['today', 'week', 'month', 'older'];

/**
 * Ages are relative and coarse ("2 weeks ago" is 14 to 20 days), so ranges are separate slices on the unit YouTube
 * wrote: Today is under a day, This week 1-6 days, This month 1-4 weeks, Older the rest. Slices do not overlap, so
 * "about a month ago" skips everything newer.
 */
export function sliceOf(age: Age): Range {
  if (age.unit === 'second' || age.unit === 'minute' || age.unit === 'hour') return 'today';
  if (age.unit === 'day') return age.n < 7 ? 'week' : 'month';
  return age.unit === 'week' && age.n < 5 ? 'month' : 'older';
}

/** An unreadable age stays in. */
export const inRange = (age: Age | null, range: Range) => range === 'any' || !age || sliceOf(age) === range;

/** The feed is newest first: once an item is in a later slice, no later page can match. */
export const pastRange = (age: Age, range: Range) => range !== 'any' && SLICES.indexOf(sliceOf(age)) > SLICES.indexOf(range);
