import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { routeOf } from '../../core/router.ts';
import { S } from '../../core/selectors.ts';
import { dayLabel, historyDate, plan } from './dates.ts';

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

/**
 * Subscriptions: one date header before the first item of each group, inside YouTube's grid.
 * YouTube's cards stay where they are; style.css hides the Latest / Most relevant shelves.
 */
function subscriptions(grid: Element, signal: AbortSignal): void {
  const heads = new Map<string, HTMLElement>();
  const dots = spy(signal);
  const sync = () => {
    const items = [...grid.children].filter((e) => e.localName === 'ytd-rich-item-renderer');
    const now = new Date();
    const starts = plan(items.map(ageOf), now, lang());
    for (const [i, g] of starts) {
      const h = head(g.label, heads.get(g.key));
      heads.set(g.key, h);
      if (items[i].previousElementSibling !== h) items[i].before(h);
      dots.add(h);
    }
    const live = new Set([...starts.values()].map((g) => g.key));
    for (const [k, h] of heads) if (!live.has(k)) (h.remove(), heads.delete(k), dots.drop(h));
  };
  // Our own inserts re-trigger it once; the second pass changes nothing.
  const obs = new MutationObserver(sync);
  obs.observe(grid, { childList: true });
  sync();
  signal.addEventListener('abort', () => {
    obs.disconnect();
    heads.forEach((h) => h.remove());
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
      if (yt && !watched.has(yt)) (watched.add(yt), obs.observe(yt, { childList: true, subtree: true, characterData: true }));
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
  label: 'Timeline on Subscriptions and History',
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
