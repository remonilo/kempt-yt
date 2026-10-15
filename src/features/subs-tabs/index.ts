import type { Feature } from '../../core/feature.ts';
import { el, keep, observe, waitFor } from '../../core/dom.ts';
import { placeMenu } from '../../core/dropdown.ts';
import { icon, setIcon } from '../../core/icon.ts';
import { local } from '../../core/i18n.ts';
import { S } from '../../core/selectors.ts';
import { saveOption } from '../../core/settings.ts';
import { matcher } from '../../core/text.ts';
import { sortChannels, type Sort } from './sort.ts';
import type { Bell, SubChannel, SubWords } from './page.ts';

type Tab = 'videos' | 'channels';
type Layout = 'grid' | 'list';

const WORDS = {
  en: { videos: 'Videos', channels: 'Channels', grid: 'Grid', list: 'List', search: 'Search channels', relevance: 'Relevance', newUploads: 'New uploads' },
  es: { videos: 'Vídeos', channels: 'Canales', grid: 'Cuadrícula', list: 'Lista', search: 'Buscar canales', relevance: 'Relevancia', newUploads: 'Nuevos vídeos' },
  pt: { videos: 'Vídeos', channels: 'Canais', grid: 'Grade', list: 'Lista', search: 'Pesquisar canais', relevance: 'Relevância', newUploads: 'Novos envios' },
  de: { videos: 'Videos', channels: 'Kanäle', grid: 'Raster', list: 'Liste', search: 'Kanäle durchsuchen', relevance: 'Relevanz', newUploads: 'Neue Uploads' },
  fr: { videos: 'Vidéos', channels: 'Chaînes', grid: 'Grille', list: 'Liste', search: 'Rechercher des chaînes', relevance: 'Pertinence', newUploads: 'Nouvelles vidéos' },
  ru: { videos: 'Видео', channels: 'Каналы', grid: 'Сетка', list: 'Список', search: 'Поиск каналов', relevance: 'По релевантности', newUploads: 'Новые видео' },
  ja: { videos: '動画', channels: 'チャンネル', grid: 'グリッド', list: 'リスト', search: 'チャンネルを検索', relevance: '関連性', newUploads: '新着' },
  ko: { videos: '동영상', channels: '채널', grid: '그리드', list: '목록', search: '채널 검색', relevance: '관련성', newUploads: '새 업로드' },
  hi: { videos: 'वीडियो', channels: 'चैनल', grid: 'ग्रिड', list: 'सूची', search: 'चैनल खोजें', relevance: 'प्रासंगिकता', newUploads: 'नए अपलोड' },
  id: { videos: 'Video', channels: 'Channel', grid: 'Petak', list: 'Daftar', search: 'Telusuri channel', relevance: 'Relevansi', newUploads: 'Upload baru' },
  tr: { videos: 'Videolar', channels: 'Kanallar', grid: 'Izgara', list: 'Liste', search: 'Kanallarda ara', relevance: 'Alaka düzeyi', newUploads: 'Yeni yüklemeler' },
};

// The Videos tab's layout and view live in timeline's toolbar; this one is the Channels tab's.
const html = document.documentElement;
const layoutOf = () => (html.getAttribute('kyt-subs-tabs-channels') ?? 'grid') as Layout;

const BELL_ICON: Record<Bell, string> = { all: 'notifs-selected', personalized: 'notifs', none: 'notifs-disabled' };

// Guide avatars are 88px; ask for a size that stays sharp in a grid card at 2x.
const bigAvatar = (url: string) => url.replace(/=s\d+-/, '=s240-');

export const subsTabs: Feature = {
  id: 'subs-tabs',
  label: 'Subscriptions tabs', hint: 'Videos and Channels', group: 'feeds', icon: 'subs',
  defaultOn: true,
  routes: ['subscriptions'],
  options: {
    channels: { type: 'choice', label: 'Channels layout', default: 'grid', choices: { grid: 'Grid', list: 'List' } },
    perRow: { type: 'number', label: 'Channels per row', default: 5, min: 3, max: 8, slider: true, cssVar: '--kyt-subs-channels' },
  },
  async run({ signal, call }) {
    const grid = await waitFor(S.subsRichGrid, { signal, timeout: Infinity });
    const contents = grid?.querySelector(':scope > #contents');
    if (!grid || !contents || signal.aborted) return;
    const words = local(WORDS);
    let tab: Tab = 'videos';

    // Header: the two tabs.
    const tabs = el('div', 'kyt-subs-tabs');
    tabs.role = 'tablist';
    const count = el('span', 'kyt-subs-count');
    const tabBtn = (t: Tab, ...kids: (Node | string)[]) => {
      const b = el('button', 'kyt-subs-tab', el('span', '', words[t]), ...kids);
      b.role = 'tab';
      b.dataset.tab = t;
      return b;
    };
    tabs.append(tabBtn('videos'), el('span', 'kyt-subs-sep'), tabBtn('channels', count));
    const toggle = el('div', 'kyt-chips kyt-layout');
    toggle.role = 'group';
    for (const v of ['grid', 'list'] as Layout[]) {
      const b = el('button', 'kyt-chip', icon(v));
      b.dataset.layout = v;
      b.title = b.ariaLabel = words[v];
      toggle.append(b);
    }
    const head = el('div', 'kyt-subs-head', tabs);

    // Sort chips and the New uploads filter; per visit, like the feed's chips.
    let sort: Sort = 'relevance';
    const sorts = el('div', 'kyt-chips');
    sorts.role = 'group';
    for (const [v, label] of [['relevance', words.relevance], ['az', 'A–Z'], ['za', 'Z–A']] as const) {
      const b = el('button', 'kyt-chip', label);
      b.dataset.sort = v;
      b.ariaPressed = String(v === sort);
      sorts.append(b);
    }
    const fresh = el('button', 'kyt-chip', words.newUploads);
    fresh.ariaPressed = 'false';

    // Channels view: a sibling of #contents, never inside it (YouTube re-matches grid children by index).
    const input = el('input');
    input.type = 'text';
    input.placeholder = words.search;
    const list = el('div', 'kyt-subs-ch');
    const left = el('div', 'kyt-subs-tools', sorts, el('span', 'kyt-bar-sep'), fresh, el('span', 'kyt-bar-sep'), toggle);
    const view = el('div', 'kyt-subs-channels', el('div', 'kyt-subs-bar', left, el('label', 'kyt-search', icon('search'), input)), list);
    view.hidden = true;

    const sync = () => {
      grid.setAttribute('kyt-subs-tab', tab);
      view.hidden = tab !== 'channels';
      for (const b of tabs.querySelectorAll<HTMLElement>('[role=tab]')) b.ariaSelected = String(b.dataset.tab === tab);
      const layout = layoutOf();
      for (const b of toggle.children as HTMLCollectionOf<HTMLElement>) b.ariaPressed = String(b.dataset.layout === layout);
    };

    tabs.addEventListener('click', (e) => {
      const t = (e.target as Element).closest<HTMLElement>('[role=tab]')?.dataset.tab as Tab | undefined;
      if (!t || t === tab) return;
      tab = t;
      sync();
    }, { signal });
    toggle.addEventListener('click', (e) => {
      const v = (e.target as Element).closest<HTMLElement>('[data-layout]')?.dataset.layout as Layout | undefined;
      if (!v || v === layoutOf()) return;
      html.setAttribute('kyt-subs-tabs-channels', v); // before storage answers, so the click feels instant
      saveOption('subs-tabs', 'channels', v);
      sync();
    }, { signal });
    // The popup can change it too.
    observe(html, { attributeFilter: ['kyt-subs-tabs-channels'] }, sync, signal);

    // Same left-click handling as YouTube's links: YouTube's router, new tab with a modifier.
    list.addEventListener('click', (e) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-url]');
      if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      call('navigate', a.dataset.url!);
    }, { signal });

    // Search covers every channel: the whole list is in memory.
    const names = new Map<HTMLElement, string>();
    const search = () => {
      const hit = matcher(input.value);
      for (const [card, name] of names) card.hidden = !hit(name);
    };
    input.addEventListener('input', search, { signal });
    // Cards arrive after the user may have typed or sorted.
    const refilter = () => {
      if (input.value) search();
      if (sort !== 'relevance') resort();
    };

    // Sorting moves our own cards; YouTube's DOM is untouched.
    const resort = () => {
      const order = sortChannels([...names].map(([card, title]) => ({ card, title })), sort);
      list.append(...order.map((c) => c.card));
    };
    sorts.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-sort]');
      if (!b || b.dataset.sort === sort) return;
      sort = b.dataset.sort as Sort;
      for (const c of sorts.children as HTMLCollectionOf<HTMLElement>) c.ariaPressed = String(c === b);
      resort();
    }, { signal });
    fresh.addEventListener('click', () => {
      const on = fresh.ariaPressed !== 'true';
      fresh.ariaPressed = String(on);
      list.toggleAttribute('kyt-new-only', on);
    }, { signal });

    keep(head, grid, () => {
      if (grid.firstElementChild !== head) grid.prepend(head);
      if (contents.nextElementSibling !== view) contents.after(view);
    }, signal, { childList: true });
    sync();
    signal.addEventListener('abort', () => {
      view.remove();
      grid.removeAttribute('kyt-subs-tab');
    }, { once: true });

    // The guide's Subscriptions section gives the tab count and the new-uploads dots with no request (when rendered).
    const guide = call('guide').catch(() => null).then((sections) => sections
      ?.find((s) => s.type === 'guideSubscriptionsSectionRenderer')?.entries.filter((e) => !e.header && e.thumb) ?? []);
    // The guide can list fewer channels than /feed/channels, so the last /feed/channels count wins until the tab loads.
    const COUNT = 'kempt-yt-subs-count';
    count.textContent = localStorage.getItem(COUNT) ?? '';
    guide.then((g) => signal.aborted || count.textContent || (count.textContent = g.length ? String(g.length) : ''));

    const card = (title: string, url: string, thumb: string | undefined, isNew: boolean, meta?: string) => {
      const img = el('img');
      img.loading = 'lazy';
      img.alt = '';
      if (thumb) img.src = bigAvatar(thumb);
      const text = el('span', 'kyt-subs-text', el('span', 'kyt-subs-name', title));
      if (meta) text.append(el('span', 'kyt-subs-meta', meta));
      const a = el('a', 'kyt-subs-link', img, text);
      a.href = a.dataset.url = url;
      const c = el('div', 'kyt-subs-chan', a);
      if (isNew) c.append(el('span', 'kyt-subs-new'));
      names.set(c, title);
      list.append(c);
      return c;
    };

    // Subscribe buttons: optimistic, rolled back on failure; one change per channel at a time.
    let yt: SubWords = { subscribe: 'Subscribe', subscribed: 'Subscribed', unsubscribe: 'Unsubscribe', cancel: 'Cancel' };
    const chans = new WeakMap<HTMLElement, SubChannel>(); // button -> channel
    const busy = new WeakSet<SubChannel>();
    const paint = (btn: HTMLElement, ch: SubChannel) => {
      btn.dataset.on = String(ch.subscribed);
      btn.querySelector('.kyt-subs-label')!.textContent = ch.subscribed ? yt.subscribed : yt.subscribe;
      setIcon(btn.querySelector<HTMLElement>('.kyt-subs-bell')!, BELL_ICON[ch.bell ?? 'personalized']);
      btn.ariaHasPopup = ch.subscribed ? 'menu' : null;
    };
    const change = async (btn: HTMLElement, ch: SubChannel, patch: Partial<SubChannel>, send: () => Promise<unknown>) => {
      if (busy.has(ch)) return;
      const before = { subscribed: ch.subscribed, bell: ch.bell };
      Object.assign(ch, patch);
      paint(btn, ch);
      busy.add(ch);
      try {
        await send();
      } catch (e) {
        Object.assign(ch, before);
        paint(btn, ch);
        console.warn('kyt: subscription change failed', e);
      } finally {
        busy.delete(ch);
      }
    };

    // One menu and one confirm dialog, moved to whichever card asks.
    const menu = el('div', 'kyt-dd-menu kyt-subs-menu');
    menu.role = 'menu';
    let menuFor: HTMLElement | null = null;
    let outside: AbortController | undefined;
    const close = () => {
      outside?.abort();
      if (!menuFor) return;
      menuFor.ariaExpanded = 'false';
      menuFor.parentElement!.removeAttribute('open');
      menuFor = null;
    };
    const open = (btn: HTMLElement, ch: SubChannel) => {
      close();
      menu.replaceChildren(...ch.bells.map((b, i) => {
        const item = el('button', 'kyt-dd-item', icon(BELL_ICON[b.bell ?? 'personalized']), b.label);
        item.role = 'menuitemradio';
        item.ariaChecked = String(b.bell === ch.bell);
        item.dataset.bell = String(i);
        return item;
      }), el('div', 'kyt-subs-menu-sep'), Object.assign(el('button', 'kyt-dd-item', icon('exclude'), yt.unsubscribe), { role: 'menuitem' }));
      btn.parentElement!.append(menu);
      placeMenu(btn.parentElement!, menu);
      btn.parentElement!.setAttribute('open', '');
      btn.ariaExpanded = 'true';
      menuFor = btn;
      outside = new AbortController();
      document.addEventListener('pointerdown', (e) => btn.parentElement!.contains(e.target as Node) || close(),
        { signal: AbortSignal.any([signal, outside.signal]), capture: true });
    };
    signal.addEventListener('abort', () => outside?.abort(), { once: true });

    const ask = el('p');
    const no = el('button', 'kyt-chip');
    const yes = el('button', 'kyt-chip kyt-subs-yes');
    const dialog = el('dialog', 'kyt-subs-confirm', ask, el('div', 'kyt-subs-confirm-btns', no, yes));
    view.append(dialog);
    let asking: [HTMLElement, SubChannel] | null = null;
    no.addEventListener('click', () => dialog.close(), { signal });
    dialog.addEventListener('click', (e) => e.target === dialog && dialog.close(), { signal }); // backdrop
    yes.addEventListener('click', () => {
      dialog.close();
      if (!asking) return;
      const [btn, ch] = asking;
      change(btn, ch, { subscribed: false }, () => call('setSubscribed', ch.id, false));
    }, { signal });

    menu.addEventListener('click', (e) => {
      const item = (e.target as Element).closest<HTMLElement>('.kyt-dd-item');
      const btn = menuFor;
      const ch = btn && chans.get(btn);
      if (!item || !btn || !ch) return;
      close();
      btn.focus();
      if (item.dataset.bell) {
        const i = Number(item.dataset.bell);
        if (ch.bells[i].bell !== ch.bell) change(btn, ch, { bell: ch.bells[i].bell }, () => call('setBell', ch.id, i));
        return;
      }
      asking = [btn, ch];
      ask.textContent = ch.confirm || `${yt.unsubscribe}: ${ch.title}?`;
      no.textContent = yt.cancel;
      yes.textContent = yt.unsubscribe;
      dialog.showModal();
    }, { signal });
    view.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !menuFor) return;
      const btn = menuFor;
      close();
      btn.focus();
    }, { signal });
    list.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLElement>('.kyt-subs-btn');
      const ch = btn && chans.get(btn);
      if (!btn || !ch) return;
      if (menuFor === btn) return close();
      // YouTube's default bell for a new subscription is Personalized.
      if (!ch.subscribed) change(btn, ch, { subscribed: true, bell: 'personalized' }, () => call('setSubscribed', ch.id, true));
      else if (!busy.has(ch)) open(btn, ch);
    }, { signal });

    // /feed/channels is fetched once per visit, when the Channels tab first opens; the guide is the fallback.
    let loaded = false;
    const load = async () => {
      loaded = true;
      list.ariaBusy = 'true';
      const [res, g] = await Promise.all([
        call('subsChannels').catch((e) => (console.warn('kyt: /feed/channels failed, using the guide', e), null)),
        guide,
      ]);
      if (signal.aborted) return;
      list.ariaBusy = null;
      const newUrls = new Set(g.filter((c) => c.isNew).map((c) => c.url));
      if (!res?.channels.length) {
        for (const c of g) card(c.title, c.url, c.thumb, !!c.isNew);
        refilter();
        return;
      }
      console.info(`kyt: ${res.channels.length} channels from /feed/channels, ${g.length} in the guide`);
      count.textContent = String(res.channels.length);
      localStorage.setItem(COUNT, count.textContent);
      yt = { ...yt, ...Object.fromEntries(Object.entries(res.words).filter(([, v]) => v)) };
      for (const ch of res.channels) {
        const c = card(ch.title, ch.url, ch.thumb, newUrls.has(ch.url), [ch.handle, ch.subs].filter(Boolean).join(' • '));
        const arrow = icon('arrow-down');
        arrow.classList.add('kyt-dd-arrow');
        const bell = icon('notifs');
        bell.classList.add('kyt-subs-bell');
        const btn = el('button', 'kyt-chip kyt-subs-btn', bell, el('span', 'kyt-subs-label'), arrow);
        chans.set(btn, ch);
        paint(btn, ch);
        c.append(el('div', 'kyt-dd kyt-subs-sub', btn));
      }
      refilter();
    };
    const lazy = () => tab === 'channels' && !loaded && load();
    tabs.addEventListener('click', lazy, { signal });
  },
};
