import type { Ctx, Feature } from '../../core/feature.ts';
import { el, observe, waitFor } from '../../core/dom.ts';
import { routeOf } from '../../core/router.ts';
import { S } from '../../core/selectors.ts';
import { icon } from '../../core/icon.ts';
import { local, uiLang as lang } from '../../core/i18n.ts';
import { dayKey, dayLabel, historyDate, parseAge, plan } from './dates.ts';
import { inRange, inType, kindOf, pastRange, type Range, type Type } from './filter.ts';
import { matcher } from '../../core/text.ts';
import { dropdown } from '../../core/dropdown.ts';
import { saveOption } from '../../core/settings.ts';


function head(label: string, el: HTMLElement = document.createElement('div')): HTMLElement {
  el.className = 'kyt-tl-head';
  if (el.textContent !== label) el.textContent = label;
  return el;
}

// The observer fires only when a header crosses mid-screen, scrolling or when content above loads.
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

// aria-label has the long form ("7 hours ago").
function ageOf(item: Element): string {
  const parts = item.querySelectorAll(S.lockupDate);
  const last = [...parts].at(-1);
  return last?.getAttribute('aria-label') || last?.textContent || '';
}

/** Chip words are YouTube's own search filter chips in each language. */
const WORDS = {
  en: { all: 'All', videos: 'Videos', live: 'Live', shorts: 'Shorts', search: 'Search subscriptions', viewAs: 'View as', timeline: 'Timeline', plain: 'Plain', grid: 'Grid', list: 'List', range: 'Date range', any: 'Any time', today: 'Today', week: 'This week', month: 'This month', older: 'Older', byChannel: 'Channels', showAll: 'Show all', loadMore: 'Load more' },
  es: { all: 'Todo', videos: 'Vídeos', live: 'En directo', shorts: 'Shorts', search: 'Buscar en suscripciones', viewAs: 'Ver como', timeline: 'Cronología', plain: 'Simple', grid: 'Cuadrícula', list: 'Lista', range: 'Fecha', any: 'Cualquier fecha', today: 'Hoy', week: 'Esta semana', month: 'Este mes', older: 'Más antiguos', byChannel: 'Canales', showAll: 'Mostrar todo', loadMore: 'Cargar más' },
  pt: { all: 'Tudo', videos: 'Vídeos', live: 'Ao vivo', shorts: 'Shorts', search: 'Pesquisar inscrições', viewAs: 'Ver como', timeline: 'Linha do tempo', plain: 'Simples', grid: 'Grade', list: 'Lista', range: 'Data', any: 'Qualquer data', today: 'Hoje', week: 'Esta semana', month: 'Este mês', older: 'Mais antigos', byChannel: 'Canais', showAll: 'Mostrar tudo', loadMore: 'Carregar mais' },
  de: { all: 'Alle', videos: 'Videos', live: 'Live', shorts: 'Shorts', search: 'Abos durchsuchen', viewAs: 'Ansicht', timeline: 'Zeitleiste', plain: 'Einfach', grid: 'Raster', list: 'Liste', range: 'Zeitraum', any: 'Beliebig', today: 'Heute', week: 'Diese Woche', month: 'Dieser Monat', older: 'Älter', byChannel: 'Kanäle', showAll: 'Alle anzeigen', loadMore: 'Mehr laden' },
  fr: { all: 'Tout', videos: 'Vidéos', live: 'En direct', shorts: 'Shorts', search: 'Rechercher dans les abonnements', viewAs: 'Affichage', timeline: 'Chronologie', plain: 'Simple', grid: 'Grille', list: 'Liste', range: 'Période', any: 'Toutes les dates', today: 'Aujourd\'hui', week: 'Cette semaine', month: 'Ce mois-ci', older: 'Plus anciens', byChannel: 'Chaînes', showAll: 'Tout afficher', loadMore: 'Charger plus' },
  ru: { all: 'Все', videos: 'Видео', live: 'В эфире', shorts: 'Shorts', search: 'Поиск по подпискам', viewAs: 'Вид', timeline: 'Хронология', plain: 'Простой', grid: 'Сетка', list: 'Список', range: 'Период', any: 'За всё время', today: 'Сегодня', week: 'На этой неделе', month: 'В этом месяце', older: 'Раньше', byChannel: 'Каналы', showAll: 'Показать все', loadMore: 'Загрузить ещё' },
  ja: { all: 'すべて', videos: '動画', live: 'ライブ', shorts: 'ショート', search: '登録チャンネルを検索', viewAs: '表示', timeline: 'タイムライン', plain: 'シンプル', grid: 'グリッド', list: 'リスト', range: '期間', any: '期間指定なし', today: '今日', week: '今週', month: '今月', older: 'それ以前', byChannel: 'チャンネル', showAll: 'すべて表示', loadMore: 'さらに読み込む' },
  ko: { all: '전체', videos: '동영상', live: '라이브', shorts: 'Shorts', search: '구독 검색', viewAs: '보기', timeline: '타임라인', plain: '기본', grid: '그리드', list: '목록', range: '기간', any: '전체 기간', today: '오늘', week: '이번 주', month: '이번 달', older: '이전', byChannel: '채널', showAll: '모두 보기', loadMore: '더 불러오기' },
  hi: { all: 'सभी', videos: 'वीडियो', live: 'लाइव', shorts: 'Shorts', search: 'सदस्यता में खोजें', viewAs: 'इस रूप में देखें', timeline: 'टाइमलाइन', plain: 'सादा', grid: 'ग्रिड', list: 'सूची', range: 'तारीख', any: 'कभी भी', today: 'आज', week: 'इस हफ़्ते', month: 'इस महीने', older: 'पुराने', byChannel: 'चैनल', showAll: 'सभी दिखाएं', loadMore: 'और लोड करें' },
  id: { all: 'Semua', videos: 'Video', live: 'Live', shorts: 'Shorts', search: 'Telusuri subscription', viewAs: 'Tampilan', timeline: 'Linimasa', plain: 'Biasa', grid: 'Petak', list: 'Daftar', range: 'Tanggal', any: 'Kapan saja', today: 'Hari ini', week: 'Minggu ini', month: 'Bulan ini', older: 'Lebih lama', byChannel: 'Channel', showAll: 'Tampilkan semua', loadMore: 'Muat lainnya' },
  tr: { all: 'Tümü', videos: 'Videolar', live: 'Canlı', shorts: 'Shorts', search: 'Aboneliklerde ara', viewAs: 'Görünüm', timeline: 'Zaman çizelgesi', plain: 'Düz', grid: 'Izgara', list: 'Liste', range: 'Tarih', any: 'Her zaman', today: 'Bugün', week: 'Bu hafta', month: 'Bu ay', older: 'Daha eski', byChannel: 'Kanallar', showAll: 'Tümünü göster', loadMore: 'Daha fazla yükle' },
};
const TYPES: Type[] = ['all', 'videos', 'live', 'shorts'];

const html = document.documentElement;
const opt = (key: string, def: string) => html.getAttribute(`kyt-timeline-${key}`) ?? def;

function toolbar(state: { type: Type; range: Range; query: string }, onChange: () => void, signal: AbortSignal): HTMLElement {
  const bar = document.createElement('kyt-bar');
  const words = local(WORDS);
  // View as and the layout chips write the same options as the popup; the runner mirrors them back onto <html>.
  const set = (key: string, v: string) => {
    html.setAttribute(`kyt-timeline-${key}`, v); // before storage answers, so the click feels instant
    saveOption('timeline', key, v);
  };
  const view = dropdown(words.viewAs, { timeline: words.timeline, plain: words.plain, channels: words.byChannel },
    () => opt('view', 'timeline'), (v) => set('view', v), signal);

  const chips = el('div', 'kyt-chips');
  chips.role = 'group';
  for (const type of TYPES) {
    const b = el('button', 'kyt-chip');
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

  const layout = el('div', 'kyt-chips kyt-layout');
  layout.role = 'group';
  for (const v of ['grid', 'list'] as const) {
    const b = el('button', 'kyt-chip', icon(v));
    b.dataset.layout = v;
    b.title = b.ariaLabel = words[v];
    layout.append(b);
  }
  const syncLayout = () => {
    for (const b of layout.children as HTMLCollectionOf<HTMLElement>) b.ariaPressed = String(b.dataset.layout === opt('layout', 'grid'));
  };
  layout.addEventListener('click', (e) => {
    const v = (e.target as Element).closest<HTMLElement>('[data-layout]')?.dataset.layout;
    if (v && v !== opt('layout', 'grid')) (set('layout', v), syncLayout());
  }, { signal });
  // The popup can change both too.
  observe(html, { attributeFilter: ['kyt-timeline-view', 'kyt-timeline-layout'] }, () => (view.sync(), syncLayout()), signal);
  syncLayout();

  // Filters like the chips: per visit, not saved.
  const range = dropdown(words.range, { any: words.any, today: words.today, week: words.week, month: words.month, older: words.older },
    () => state.range, (v) => ((state.range = v as Range), onChange()), signal);
  range.root.querySelector('.kyt-dd-btn')!.prepend(icon('date'));

  const input = el('input');
  input.type = 'text';
  input.placeholder = words.search;
  input.addEventListener('input', () => ((state.query = input.value), onChange()), { signal });
  const search = el('label', 'kyt-search', icon('search'), input);

  bar.append(view.root, el('span', 'kyt-bar-sep'), chips, el('span', 'kyt-bar-sep'), range.root,
    el('span', 'kyt-bar-sep'), layout, search);
  return bar;
}

/**
 * While filtering, YouTube may load more pages only until this many items match, and at most MAX_LOADED items per
 * batch: past that a Load more chip asks before the next batch (a narrow slice or search could load the whole feed).
 */
const WANT_VISIBLE = 24;
const MAX_LOADED = 300;

const isItem = (e: Element) => e.localName === 'ytd-rich-item-renderer';
const textOf = (item: Element) => (item.querySelector(S.lockupMeta) ?? item).textContent ?? '';

const isOurs = (e: Element) => e.localName === 'kyt-bar' || e.classList.contains('kyt-tl-head') || e.classList.contains('kyt-ch-head');

interface Channel { url: string; name: string; avatar: string }
function channelOf(item: Element): Channel | null {
  const a = item.querySelector<HTMLAnchorElement>(S.lockupChannel);
  const url = a?.getAttribute('href');
  if (!a || !url) return null;
  return { url, name: a.textContent?.trim() ?? '', avatar: item.querySelector<HTMLImageElement>(S.lockupAvatar)?.src ?? '' };
}

/** View as Channels: avatar, name, count, and the arrow that shows the channel's other loaded videos. */
function channelHead(c: Channel, avatar: string, h?: HTMLElement): HTMLElement {
  if (!h) {
    const img = el('img');
    img.alt = '';
    const name = el('a', 'kyt-ch-name');
    const more = el('button', 'kyt-ch-more', icon('arrow-down'));
    more.title = more.ariaLabel = local(WORDS).showAll;
    h = el('div', 'kyt-ch-head', img, name, el('span', 'kyt-ch-count'), more);
  }
  const img = h.querySelector('img')!, name = h.querySelector<HTMLAnchorElement>('.kyt-ch-name')!;
  if (avatar && img.getAttribute('src') !== avatar) img.src = avatar;
  if (name.getAttribute('href') !== c.url) name.href = name.dataset.url = c.url;
  if (name.textContent !== c.name) name.textContent = c.name;
  return h;
}

// Our toolbar and headers sit after all of YouTube's children and flex `order` draws them in place (never between
// its items: docs/internals/youtube-quirks). The toolbar filters what is loaded: items that miss get `kyt-off`,
// headers left without items too.
function subscriptions(grid: Element, signal: AbortSignal, call: Ctx['call']): void {
  const heads = new Map<string, HTMLElement>();
  const chans = new Map<string, HTMLElement>(); // View as Channels, by channel URL
  const open = new Set<string>(); // channels showing every loaded video, this visit
  const avatars = new Map<string, string>(); // guide thumbnails by channel URL (cards load theirs lazily)
  const groupOf = new Map<Element, HTMLElement>();
  const dots = spy(signal);
  const state = { type: 'all' as Type, range: 'any' as Range, query: '' };
  let budget = MAX_LOADED, loaded = 0;
  const moreBtn = el('button', 'kyt-chip', el('span', '', local(WORDS).loadMore), icon('arrow-down'));
  const more = el('div', 'kyt-load-more', moreBtn);
  more.hidden = true;
  grid.after(more); // never inside #contents (YouTube re-matches its children by index)
  moreBtn.addEventListener('click', () => ((budget = loaded + MAX_LOADED), apply()), { signal });
  const apply = () => {
    const seen = new Set<HTMLElement>();
    let shown = 0, total = 0, past = false; // past: the last readable item is older than the range
    const locale = lang();
    const ages = new Map(state.type === 'all' && state.range === 'any' ? [] : [...grid.children].filter(isItem).map((c) => [c, parseAge(ageOf(c), locale)]));
    const readable = [...ages.values()].some(Boolean);
    const hit = matcher(state.query);
    // Channels: one row each unless opened; items-per-row is YouTube's own (or the grid feature's) count.
    const limit = opt('layout', 'grid') === 'list' ? 2
      : Number.parseInt(getComputedStyle(grid).getPropertyValue('--ytd-rich-grid-items-per-row')) || 4;
    const inGroup = new Map<HTMLElement, number>();
    const kindOfItem = (c: Element) => kindOf({
      short: c.querySelector('a[href^="/shorts/"]') !== null,
      badge: c.querySelector(S.liveBadge) !== null,
      age: ages.get(c) ?? null,
      readable,
    });
    for (const c of grid.children) {
      if (!isItem(c)) continue;
      const off = (state.type !== 'all' && !inType(kindOfItem(c), state.type)) ||
        !inRange(ages.get(c) ?? null, state.range) ||
        (state.query !== '' && !hit(textOf(c)));
      c.toggleAttribute('kyt-off', off);
      total++;
      if (ages.get(c)) past = pastRange(ages.get(c)!, state.range);
      const h = groupOf.get(c);
      let extra = false;
      if (!off) {
        if (h) seen.add(h);
        shown++;
        if (h && chans.has(h.dataset.key!)) {
          const n = (inGroup.get(h) ?? 0) + 1;
          inGroup.set(h, n);
          extra = n > limit && !open.has(h.dataset.key!);
        }
      }
      c.toggleAttribute('kyt-ch-extra', extra);
    }
    for (const h of heads.values()) h.toggleAttribute('kyt-off', !seen.has(h));
    for (const h of chans.values()) {
      const n = inGroup.get(h) ?? 0;
      h.toggleAttribute('kyt-off', !seen.has(h));
      h.toggleAttribute('kyt-few', n <= limit);
      h.querySelector('.kyt-ch-count')!.textContent = String(n);
      const on = open.has(h.dataset.key!);
      h.toggleAttribute('open', on);
      h.querySelector('.kyt-ch-more')!.ariaExpanded = String(on);
    }
    // Shelves (Shorts) have no items to test: style.css shows them only for All and Shorts, and not while searching.
    if (state.type === 'all') grid.removeAttribute('kyt-filter');
    else grid.setAttribute('kyt-filter', state.type);
    grid.toggleAttribute('kyt-query', state.query.trim() !== '');
    // With most items hidden YouTube's loading row stays on screen; style.css hides it unless more matches are wanted.
    grid.toggleAttribute('kyt-range', state.range !== 'any');
    // Once the feed passes the slice no later page can match. Until then a range keeps loading (bounded by
    // MAX_LOADED), so Older shows what that many items reach.
    const want = state.range !== 'any' ? !past : state.type !== 'shorts' && shown < WANT_VISIBLE;
    loaded = total;
    grid.toggleAttribute('kyt-more', total < budget && want);
    const filtering = state.type !== 'all' || state.range !== 'any' || state.query.trim() !== '';
    more.hidden = !(filtering && want && total >= budget);
  };
  const bar = toolbar(state, apply, signal);
  const sync = () => {
    const items = [...grid.children].filter(isItem);
    const view = opt('view', 'timeline');
    const ours: HTMLElement[] = [bar];
    const orderOf = new Map<Element, number>(); // channels: each item's group index
    const startOf = new Map<Element, HTMLElement>();
    groupOf.clear();

    const starts = view === 'timeline' ? plan(items.map(ageOf), new Date(), lang()) : new Map<number, never>();
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

    // Channels in order of their newest loaded video (the feed is newest first), so Latest activity comes free.
    // Cards without a channel link (some collabs) go last, under no header.
    const byUrl = new Map<string, { c: Channel; items: Element[] }>();
    if (view === 'channels') for (const it of items) {
      const c = channelOf(it);
      if (!c) continue;
      const g = byUrl.get(c.url) ?? byUrl.set(c.url, { c, items: [] }).get(c.url)!;
      g.items.push(it);
    }
    for (const [url, g] of byUrl) {
      const h = channelHead(g.c, avatars.get(url) || g.items.find((i) => channelOf(i)?.avatar)?.querySelector<HTMLImageElement>(S.lockupAvatar)?.src || '', chans.get(url));
      h.dataset.key = url;
      chans.set(url, h);
      h.style.order = String(2 * ours.length - 1);
      for (const it of g.items) (orderOf.set(it, ours.length), groupOf.set(it, h));
      ours.push(h);
    }
    for (const [k, h] of chans) if (!byUrl.has(k)) (h.remove(), chans.delete(k));

    // YouTube's children take their group's order; shelves keep style.css's order -1.
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
      const o = String(2 * (view === 'channels' ? orderOf.get(c) ?? ours.length : n));
      if ((c as HTMLElement).style.order !== o) (c as HTMLElement).style.order = o;
    }
    // Ours last, headers in group order (style.css's :first-of-type is the first header).
    const tail = [...grid.children].slice(-ours.length);
    if (tail.length !== ours.length || tail.some((e, i) => e !== ours[i])) grid.append(...ours);
    apply();
  };
  // Our own inserts re-trigger it once; the second pass changes nothing.
  observe(grid, { childList: true }, sync, signal);
  observe(html, { attributeFilter: ['kyt-timeline-view'] }, sync, signal);
  // The one-row limit follows YouTube's items-per-row (rewritten on resize) and the layout.
  observe(html, { attributeFilter: ['kyt-timeline-layout'] }, apply, signal);
  if (grid.parentElement) observe(grid.parentElement, { attributeFilter: ['style'] }, apply, signal);
  (grid as HTMLElement).addEventListener('click', (e) => {
    const t = e.target as Element;
    const more = t.closest('.kyt-ch-more');
    const key = more?.closest<HTMLElement>('.kyt-ch-head')?.dataset.key;
    if (key) {
      if (!open.delete(key)) open.add(key);
      apply();
      return;
    }
    // Same left-click handling as YouTube's links: its router, new tab with a modifier.
    const a = t.closest<HTMLAnchorElement>('.kyt-ch-name');
    if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    call('navigate', a.dataset.url!);
  }, { signal });
  // Guide thumbnails are there from the start, cards' avatars only once they scroll into view.
  call('guide').then((sections) => {
    for (const e of sections?.find((x) => x.type === 'guideSubscriptionsSectionRenderer')?.entries ?? []) {
      if (e.thumb && !e.header) avatars.set(e.url, e.thumb);
    }
    if (avatars.size && !signal.aborted && opt('view', 'timeline') === 'channels') sync();
  }).catch(() => {});
  sync();
  signal.addEventListener('abort', () => {
    heads.forEach((h) => h.remove());
    chans.forEach((h) => h.remove());
    grid.querySelectorAll(':scope > :is([kyt-off], [kyt-ch-extra])').forEach((e) => (e.removeAttribute('kyt-off'), e.removeAttribute('kyt-ch-extra')));
    for (const c of grid.children) (c as HTMLElement).style.removeProperty('order');
    for (const a of ['kyt-filter', 'kyt-query', 'kyt-range', 'kyt-more']) grid.removeAttribute(a);
    bar.remove();
    more.remove();
  }, { once: true });
}

// YouTube already groups History by day, so only its headers are replaced.
function history(list: Element, signal: AbortSignal): void {
  const heads = new Set<HTMLElement>();
  const dots = spy(signal);
  const watched = new WeakSet<Element>();
  const dates = new Map<string, Date | null>(); // by header title; valid for one day and language
  let datesFor = '';
  const sync = () => {
    const now = new Date();
    if (datesFor !== dayKey(now) + lang()) (dates.clear(), (datesFor = dayKey(now) + lang()));
    for (const sec of list.querySelectorAll(':scope > ytd-item-section-renderer')) {
      const yt = sec.querySelector('ytd-item-section-header-renderer');
      const title = yt?.querySelector(S.historyTitle)?.textContent?.trim();
      if (yt && !watched.has(yt)) {
        watched.add(yt);
        obs.observe(yt, { childList: true, subtree: true, characterData: true });
      }
      if (!yt || !title) continue;
      let d = dates.get(title);
      if (d === undefined) dates.set(title, (d = historyDate(title, now, lang())));
      const prev = yt.previousElementSibling;
      const h = head(d ? dayLabel(d, now, lang()) : title,
        prev?.classList.contains('kyt-tl-head') ? (prev as HTMLElement) : undefined);
      if (h !== prev) yt.before(h);
      heads.add(h);
      dots.add(h);
    }
  };
  // Day sections are appended as you scroll (list), and a reused section can get new header text (headers).
  const obs = observe(list, { childList: true }, sync, signal);
  sync();
  signal.addEventListener('abort', () => heads.forEach((h) => h.remove()), { once: true });
}

/** My Activity has only an "older than" date filter, so the chip promises older history, not date search. */
const OLDER = {
  en: ['Older history', 'Open My Activity to jump to an earlier date'],
  es: ['Historial anterior', 'Abre Mi actividad para ir a una fecha anterior'],
  pt: ['Histórico anterior', 'Abra Minha atividade para ir a uma data anterior'],
  de: ['Älterer Verlauf', 'Öffne „Meine Aktivitäten“, um zu einem früheren Datum zu springen'],
  fr: ['Historique plus ancien', 'Ouvrir Mon activité pour accéder à une date antérieure'],
  ru: ['Более ранняя история', 'Откройте «Мои действия», чтобы перейти к более ранней дате'],
  ja: ['以前の履歴', 'マイ アクティビティで以前の日付に移動'],
  ko: ['이전 기록', '내 활동에서 이전 날짜로 이동'],
  hi: ['पुराना इतिहास', 'पहले की तारीख पर जाने के लिए मेरी गतिविधि खोलें'],
  id: ['Histori lama', 'Buka Aktivitas Saya untuk melompat ke tanggal sebelumnya'],
  tr: ['Eski geçmiş', 'Daha eski bir tarihe gitmek için Etkinliğim’i açın'],
} satisfies Record<string, [string, string]>;
const MY_ACTIVITY = 'https://myactivity.google.com/product/youtube';

/** Leading icon by My Activity product (the label is localized, the URL is not). */
const linkIcon = (href: string) =>
  /comments/.test(href) ? 'comments' : /chat/.test(href) ? 'chat' : /posts|community/.test(href) ? 'posts' : 'date';

function link(href: string, label: string, tip = label): HTMLAnchorElement {
  const a = el('a', 'kyt-chip', icon(linkIcon(href)), label, icon('open-external'));
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = tip;
  return a;
}

// History's My Activity links (Comments, Posts, Live chat) move from the right column into the chips row as external
// chips, plus Older history. Pause and Manage go icon-only, so their label becomes the tooltip.
async function historyHeader(signal: AbortSignal) {
  const row = await waitFor(S.historyChips, { signal, timeout: Infinity });
  if (!row || signal.aborted) return;
  await waitFor(S.historyLinks, { signal }); // signed in only; logged out there are none
  if (signal.aborted) return;
  const links = el('div', 'kyt-hist-links');
  for (const c of document.querySelectorAll(S.historyLinks)) {
    const a = c.querySelector<HTMLAnchorElement>('a[href]');
    const label = c.querySelector('#label')?.textContent?.trim();
    if (a && label) links.append(link(a.href, label));
  }
  const [older, tip] = local(OLDER);
  links.append(link(MY_ACTIVITY, older, tip));
  row.append(links);
  // Set on hover: YouTube re-stamps these buttons, so titles set once at load can be lost.
  const titled = new Set<Element>();
  const actions = document.querySelector(S.historyActions);
  actions?.addEventListener('mouseover', (e) => {
    const b = (e.target as Element).closest('ytd-button-renderer :is(button, a)');
    const label = b?.getAttribute('aria-label');
    if (!b || !label || b.getAttribute('title') === label) return;
    b.setAttribute('title', label);
    titled.add(b);
  }, { signal });
  signal.addEventListener('abort', () => (links.remove(), titled.forEach((b) => b.removeAttribute('title'))), { once: true });
}

export const timeline: Feature = {
  id: 'timeline',
  label: 'Timeline', hint: 'Subscriptions and History', group: 'feeds', icon: 'history',
  defaultOn: true,
  routes: ['subscriptions', 'history'],
  options: {
    view: { type: 'choice', label: 'Subscriptions view', default: 'timeline', choices: { timeline: 'Timeline', plain: 'Plain', channels: 'Channels' } },
    layout: { type: 'choice', label: 'Subscriptions layout', default: 'grid', choices: { grid: 'Grid', list: 'List' } },
  },
  run({ signal, call }) {
    // Subscriptions -> History keeps the feature running (both are its routes), so restart per page.
    let page: AbortController | undefined;
    const start = async () => {
      page?.abort();
      page = new AbortController();
      const sig = AbortSignal.any([signal, page.signal]);
      const route = routeOf(location.pathname);
      if (route === 'subscriptions') {
        const grid = await waitFor(S.subsGrid, { signal: sig, timeout: Infinity });
        if (grid && !sig.aborted) subscriptions(grid, sig, call);
      } else if (route === 'history') {
        historyHeader(sig);
        // Clear all / Pause / Manage are told apart by icon type (labels are localized); icons may be off.
        waitFor(S.historyActions, { signal: sig }).then((el) => el && call('stamp', S.historyActions));
        const list = await waitFor(S.historyList, { signal: sig, timeout: Infinity });
        if (list && !sig.aborted) history(list, sig);
      }
    };
    start();
    document.addEventListener('kyt:navigate', start, { signal });
  },
};
