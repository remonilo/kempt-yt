import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { routeOf } from '../../core/router.ts';
import { S } from '../../core/selectors.ts';
import { icon } from '../../core/icon.ts';
import { local, uiLang as lang } from '../../core/i18n.ts';
import { dayLabel, historyDate, parseAge, plan } from './dates.ts';
import { inType, kindOf, matches, type Type } from './filter.ts';


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

/** Chip words are YouTube's own search filter chips in each language. */
const WORDS = {
  en: { all: 'All', videos: 'Videos', live: 'Live', shorts: 'Shorts', search: 'Search subscriptions' },
  es: { all: 'Todo', videos: 'Vídeos', live: 'En directo', shorts: 'Shorts', search: 'Buscar en suscripciones' },
  pt: { all: 'Tudo', videos: 'Vídeos', live: 'Ao vivo', shorts: 'Shorts', search: 'Pesquisar inscrições' },
  de: { all: 'Alle', videos: 'Videos', live: 'Live', shorts: 'Shorts', search: 'Abos durchsuchen' },
  fr: { all: 'Tout', videos: 'Vidéos', live: 'En direct', shorts: 'Shorts', search: 'Rechercher dans les abonnements' },
  ru: { all: 'Все', videos: 'Видео', live: 'В эфире', shorts: 'Shorts', search: 'Поиск по подпискам' },
  ja: { all: 'すべて', videos: '動画', live: 'ライブ', shorts: 'ショート', search: '登録チャンネルを検索' },
  ko: { all: '전체', videos: '동영상', live: '라이브', shorts: 'Shorts', search: '구독 검색' },
  hi: { all: 'सभी', videos: 'वीडियो', live: 'लाइव', shorts: 'Shorts', search: 'सदस्यता में खोजें' },
  id: { all: 'Semua', videos: 'Video', live: 'Live', shorts: 'Shorts', search: 'Telusuri subscription' },
  tr: { all: 'Tümü', videos: 'Videolar', live: 'Canlı', shorts: 'Shorts', search: 'Aboneliklerde ara' },
};
const TYPES: Type[] = ['all', 'videos', 'live', 'shorts'];

/** Type chips and a search box (Figma Subs 96:3679). `onChange` runs after each click or keystroke. */
function toolbar(state: { type: Type; query: string }, onChange: () => void, signal: AbortSignal): HTMLElement {
  const bar = document.createElement('kyt-bar');
  const chips = document.createElement('div');
  chips.className = 'kyt-chips';
  chips.role = 'group';
  const words = local(WORDS);
  for (const type of TYPES) {
    const b = document.createElement('button');
    b.dataset.type = type;
    b.textContent = words[type];
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
  input.placeholder = words.search;
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

const isOurs = (e: Element) => e.localName === 'kyt-bar' || e.classList.contains('kyt-tl-head');

/**
 * Subscriptions: one date header per group, inside YouTube's grid. YouTube's cards stay where they are in the DOM;
 * style.css hides the Latest / Most relevant shelves.
 * Our toolbar and headers sit after all of YouTube's children and flex `order` draws them in place. YouTube
 * matches its grid's children to its data by index whenever the row count changes (sidebar, resize); anything of
 * ours between its items shifts every index, and it then moved every card in the feed (a second-long freeze).
 * The toolbar filters what is loaded: items that miss get `kyt-off`, headers left without items too.
 */
function subscriptions(grid: Element, signal: AbortSignal): void {
  const heads = new Map<string, HTMLElement>();
  const groupOf = new Map<Element, HTMLElement>();
  const dots = spy(signal);
  const state = { type: 'all' as Type, query: '' };
  const apply = () => {
    const seen = new Set<HTMLElement>();
    let shown = 0, total = 0;
    const locale = lang();
    const ages = new Map(state.type === 'all' ? [] : [...grid.children].filter(isItem).map((c) => [c, parseAge(ageOf(c), locale)]));
    const readable = [...ages.values()].some(Boolean);
    const kindOfItem = (c: Element) => kindOf({
      short: c.querySelector('a[href^="/shorts/"]') !== null,
      badge: c.querySelector(S.liveBadge) !== null,
      age: ages.get(c) ?? null,
      readable,
    });
    for (const c of grid.children) {
      if (!isItem(c)) continue;
      const off = (state.type !== 'all' && !inType(kindOfItem(c), state.type)) ||
        (state.query !== '' && !matches(textOf(c), state.query));
      c.toggleAttribute('kyt-off', off);
      total++;
      if (!off) {
        const h = groupOf.get(c);
        if (h) seen.add(h);
        shown++;
      }
    }
    for (const h of heads.values()) h.toggleAttribute('kyt-off', !seen.has(h));
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
    const items = [...grid.children].filter(isItem);
    const starts = plan(items.map(ageOf), new Date(), lang());
    const ours: HTMLElement[] = [bar];
    const startOf = new Map<Element, HTMLElement>();
    for (const [i, g] of starts) {
      const h = head(g.label, heads.get(g.key));
      heads.set(g.key, h);
      h.style.order = String(2 * ours.length - 1); // group n: header 2n-1, its cards 2n
      startOf.set(items[i], h);
      ours.push(h);
      dots.add(h);
    }
    const live = new Set([...starts.values()].map((g) => g.key));
    for (const [k, h] of heads) {
      if (live.has(k)) continue;
      h.remove();
      heads.delete(k);
      dots.drop(h);
    }
    // YouTube's children take their group's order; shelves keep style.css's order -1.
    groupOf.clear();
    let cur: HTMLElement | undefined, n = 0;
    for (const c of grid.children) {
      if (isOurs(c)) continue;
      const h = startOf.get(c);
      if (h) {
        cur = h;
        n = ours.indexOf(h);
      }
      if (cur && isItem(c)) groupOf.set(c, cur);
      if (c.localName === 'ytd-rich-section-renderer') continue;
      const o = String(2 * n);
      if ((c as HTMLElement).style.order !== o) (c as HTMLElement).style.order = o;
    }
    // Ours last, headers in group order (style.css's :first-of-type is the first header).
    const tail = [...grid.children].slice(-ours.length);
    if (tail.length !== ours.length || tail.some((e, i) => e !== ours[i])) grid.append(...ours);
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
    for (const c of grid.children) (c as HTMLElement).style.removeProperty('order');
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
