// Collections: Kempt's own channel groups (PLAN.md decisions 52-54). One storage.sync key per collection, so
// each stays under sync's 8 KB per-item limit (about 290 channel ids).

import { groupOf } from '../timeline/dates.ts';
import type { ChannelVideo } from './page.ts';

export interface Collection {
  id: string;
  name: string;
  /** Channel ids (UC...), in the order they were added. */
  channels: string[];
  /** Creation time; collections list oldest first. */
  order: number;
}

const PREFIX = 'kempt-yt-collection:';

/** Pure, for tests: collections out of a storage.sync dump. */
export function fromStorage(all: Record<string, unknown>): Collection[] {
  return Object.entries(all)
    .filter(([k, v]) => k.startsWith(PREFIX) && v && typeof v === 'object')
    .map(([k, v]) => {
      const c = v as Partial<Collection>;
      return {
        id: k.slice(PREFIX.length),
        name: String(c.name ?? ''),
        channels: Array.isArray(c.channels) ? c.channels.filter((x) => typeof x === 'string') : [],
        order: Number(c.order) || 0,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export async function loadCollections(): Promise<Collection[]> {
  return fromStorage(await chrome.storage.sync.get(null));
}

export function saveCollection({ id, ...rest }: Collection): Promise<void> {
  return chrome.storage.sync.set({ [PREFIX + id]: rest });
}

export function deleteCollection(id: string): Promise<void> {
  return chrome.storage.sync.remove(PREFIX + id);
}

export function newCollection(name: string): Collection {
  const now = Date.now();
  return { id: now.toString(36), name, channels: [], order: now };
}

/** Fires on any change from any tab or the popup. */
export function onCollectionsChange(cb: () => void, signal: AbortSignal): void {
  const fn = (changes: Record<string, unknown>, area: string) => {
    if (area === 'sync' && Object.keys(changes).some((k) => k.startsWith(PREFIX))) cb();
  };
  chrome.storage.onChanged.addListener(fn);
  signal.addEventListener('abort', () => chrome.storage.onChanged.removeListener(fn), { once: true });
}

/** `#collections` opens the Collections tab, `#collection=<id>` one collection's feed. */
export function hashRoute(hash: string): { tab: 'collections' } | { feed: string } | null {
  if (hash === '#collections') return { tab: 'collections' };
  const id = hash.match(/^#collection=([\w-]+)$/)?.[1];
  return id ? { feed: id } : null;
}

export const collectionUrl = (id: string) => `/feed/subscriptions#collection=${id}`;
export const COLLECTIONS_URL = '/feed/subscriptions#collections';

/** Pure, for tests: live now first ("2.2K watching" has no age), then newest by the long age label; unreadable ages
 * (upcoming) last, duplicates dropped. */
export function sortVideos<V extends Pick<ChannelVideo, 'id' | 'ageLong'> & { live?: boolean }>(videos: V[], now: Date, locale?: string): V[] {
  const seen = new Set<string>();
  return videos
    .filter((v) => !seen.has(v.id) && seen.add(v.id))
    .map((v) => ({ v, at: v.live ? Infinity : groupOf(v.ageLong, now, locale)?.at ?? -Infinity }))
    .sort((a, b) => b.at - a.at)
    .map((x) => x.v);
}

