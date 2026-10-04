import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { routeOf } from '../../core/router.ts';
import { S } from '../../core/selectors.ts';
import { icon } from '../../core/icon.ts';
import { dayLabel, historyDate, plan } from './dates.ts';
import { inType, kindOf, matches, type Type } from './filter.ts';

const lang = () => document.documentElement.lang || navigator.language;

function head(label: string, el: HTMLElement = document.createElement('div')): HTMLElement {
  el.className = 'kyt-tl-head';
  if (el.textContent !== label) el.textContent = label;
  return el;
}

/**
 * Fills the dot of the group you're reading: the lowest header above mid-screen (else the first one).
 * The observer fires only when a header crosses that line, scrolling or when content above loads.
 */
function spy(signal: AbortSignal) {
  const heads = new Set<HTMLElement>();
  let cur: HTMLElement | undefined;
  const pick = () => {
    let best: HTMLElement | undefined, bestTop = -Infinity, first: HTMLElement | undefined, firstTop = Infinity;
    for (const h of heads) {
      const top = h.getBoundingClientRect().top;
      if (top < innerHeight / 2 && top > bestTop) (best = h), (bestTop = top);
      if (top < firstTop) (first = h), (firstTop = top);
    }
    const next = best ?? first;
    if (next === cur) return;
    cur?.removeAttribute('kyt-current');
    next?.setAttribute('kyt-current', '');
    cur = next;
  };
  const io = new IntersectionObserver(pick, { rootMargin: '0px 0px -50% 0px' });
  signal.addEventListener('abort', () => io.disconnect(), { once: true });
  return {
    add(h: HTMLElement) {
      if (!heads.has(h)) (heads.add(h), io.observe(h));
    },
    drop(h: HTMLElement) {
      heads.delete(h);
      io.unobserve(h);
      if (h === cur) (h.removeAttribute('kyt-current'), (cur = undefined), pick());
    },
  };
}

/** Age text of a grid item: the last metadata part, long form from aria-label ("7 hours ago"). */
function ageOf(item: Element): string {
  const parts = item.querySelectorAll(S.lockupDate);
  const last = [...parts].at(-1);
  return last?.getAttribute('aria-label') || last?.textContent || '';
}

const TYPES: [Type, string][] = [['all', 'All'], ['videos', 'Videos'], ['live', 'Live'], ['shorts', 'Shorts']];

/** Type chips and a search box (Figma Subs 96:3679). `onChange` runs after each click or keystroke. */
function toolbar(state: { type: Type; query: string }, onChange: () => void, signal: AbortSignal): HTMLElement {
  const bar = document.createElement('kyt-bar');
  const chips = document.createElement('div');
  chips.className = 'kyt-chips';
  chips.role = 'group';
  for (const [type, label] of TYPES) {
    const b = document.createElement('button');
    b.dataset.type = type;
    b.textContent = label;
    b.ariaPressed = String(type === state.type);
    chips.append(b);
  }
  chips.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button');
    if (!b || b.dataset.type === state.type) return;
    state.type = b.dataset.type as Type;
    for (const c of chips.children) c.ariaPressed = String(c === b);
    onChange();
  }, { signal });

  const search = document.createElement('label');
  search.className = 'kyt-search';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search subscriptions';
  input.addEventListener('input', () => ((state.query = input.value), onChange()), { signal });
  search.append(icon('search'), input);

  bar.append(chips, search);
  return bar;
}

/** While filtering, YouTube may load more pages only until this many items match (and never past MAX_LOADED items). */
const WANT_VISIBLE = 24;
const MAX_LOADED = 300;

const isItem = (e: Element) => e.localName === 'ytd-rich-item-renderer';
const textOf = (item: Element) => (item.querySelector(S.lockupMeta) ?? item).textContent ?? '';
const kindOfItem = (item: Element) => kindOf({
  short: item.querySelector('a[href^="/shorts/"]') !== null,
  badge: item.querySelector('[class*="thumbnail-live"]') !== null,
  meta: textOf(item),
});

/**
 * Subscriptions: one date header before the first item of each group, inside YouTube's grid.
 * YouTube's cards stay where they are; style.css hides the Latest / Most relevant shelves.
 * The toolbar filters what is loaded: items that miss get `kyt-off`, headers left without items too.
 */
function subscriptions(grid: Element, signal: AbortSignal): void {
  const heads = new Map<string, HTMLElement>();
  const dots = spy(signal);
  const state = { type: 'all' as Type, query: '' };
  const apply = () => {
    let head: Element | undefined, seen = false, shown = 0, total = 0;
    const flush = () => head?.toggleAttribute('kyt-off', !seen);
    for (const c of grid.children) {
      if (c.classList.contains('kyt-tl-head')) {
        flush();
        head = c;
        seen = false;
      } else if (isItem(c)) {
        const off = (state.type !== 'all' && !inType(kindOfItem(c), state.type)) ||
          (state.query !== '' && !matches(textOf(c), state.query));
        c.toggleAttribute('kyt-off', off);
        total++;
        if (!off) {
          seen = true;
          shown++;
        }
      }
    }
    flush();
    // Shelves (Shorts) have no items to test: style.css shows them only for All and Shorts, and not while searching.
    if (state.type === 'all') grid.removeAttribute('kyt-filter');
    else grid.setAttribute('kyt-filter', state.type);
    grid.toggleAttribute('kyt-query', state.query.trim() !== '');
    // YouTube loads the next page whenever its loading row is on screen. With most items hidden that row never
    // leaves the screen and the feed would load to its end, so style.css hides it unless more matches are wanted.
    grid.toggleAttribute('kyt-more', state.type !== 'shorts' && shown < WANT_VISIBLE && total < MAX_LOADED);
  };
  const bar = toolbar(state, apply, signal);
  const sync = () => {
    if (grid.firstElementChild !== bar) grid.prepend(bar);
    const items = [...grid.children].filter(isItem);
    const now = new Date();
    const starts = plan(items.map(ageOf), now, lang());
    for (const [i, g] of starts) {
      const h = head(g.label, heads.get(g.key));
      heads.set(g.key, h);
      if (items[i].previousElementSibling !== h) items[i].before(h);
      dots.add(h);
    }
    const live = new Set([...starts.values()].map((g) => g.key));
    for (const [k, h] of heads) {
      if (live.has(k)) continue;
      h.remove();
      heads.delete(k);
      dots.drop(h);
    }
    apply();
  };
  // Our own inserts re-trigger it once; the second pass changes nothing.
  const obs = new MutationObserver(sync);
  obs.observe(grid, { childList: true });
  sync();
  signal.addEventListener('abort', () => {
    obs.disconnect();
    heads.forEach((h) => h.remove());
    grid.querySelectorAll(':scope > [kyt-off]').forEach((e) => e.removeAttribute('kyt-off'));
    for (const a of ['kyt-filter', 'kyt-query', 'kyt-more']) grid.removeAttribute(a);
    bar.remove();
  }, { once: true });
}

/** History: YouTube already groups by day. Replace each day's header with ours, carrying the full date. */
function history(list: Element, signal: AbortSignal): void {
  const heads = new Set<HTMLElement>();
  const dots = spy(signal);
  const watched = new WeakSet<Element>();
  const sync = () => {
    const now = new Date();
    for (const sec of list.querySelectorAll(':scope > ytd-item-section-renderer')) {
      const yt = sec.querySelector('ytd-item-section-header-renderer');
      const title = yt?.querySelector(S.historyTitle)?.textContent?.trim();
      if (yt && !watched.has(yt)) {
        watched.add(yt);
        obs.observe(yt, { childList: true, subtree: true, characterData: true });
      }
      if (!yt || !title) continue;
      const d = historyDate(title, now, lang());
      const prev = yt.previousElementSibling;
      const h = head(d ? dayLabel(d, now, lang()) : title,
        prev?.classList.contains('kyt-tl-head') ? (prev as HTMLElement) : undefined);
      if (h !== prev) yt.before(h);
      heads.add(h);
      dots.add(h);
    }
  };
  // Day sections are appended as you scroll (list), and a reused section can get new header text (headers).
  const obs = new MutationObserver(sync);
  obs.observe(list, { childList: true });
  sync();
  signal.addEventListener('abort', () => {
    obs.disconnect();
    heads.forEach((h) => h.remove());
  }, { once: true });
}

/** Subscriptions and History as a dated timeline (Figma Subs 96:3679, History 100:9034). */
export const timeline: Feature = {
  id: 'timeline',
  label: 'Timeline', hint: 'Subscriptions and History', group: 'feeds', icon: 'history',
  defaultOn: true,
  routes: ['subscriptions', 'history'],
  run({ signal }) {
    // Subscriptions -> History keeps the feature running (both are its routes), so restart per page.
    let page: AbortController | undefined;
    const start = async () => {
      page?.abort();
      page = new AbortController();
      const sig = AbortSignal.any([signal, page.signal]);
      const route = routeOf(location.pathname);
      if (route === 'subscriptions') {
        const grid = await waitFor(S.subsGrid, { signal: sig, timeout: Infinity });
        if (grid && !sig.aborted) subscriptions(grid, sig);
      } else if (route === 'history') {
        const list = await waitFor(S.historyList, { signal: sig, timeout: Infinity });
        if (list && !sig.aborted) history(list, sig);
      }
    };
    start();
    document.addEventListener('kyt:navigate', start, { signal });
  },
};
