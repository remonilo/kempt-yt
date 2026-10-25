import type { Feature } from '../../core/feature.ts';
import { el, keep, observe, waitFor } from '../../core/dom.ts';
import { outsideClick, placeMenu } from '../../core/dropdown.ts';
import { icon, iconUrl } from '../../core/icon.ts';
import { local } from '../../core/i18n.ts';
import { S } from '../../core/selectors.ts';
import { layoutToggle } from '../../core/layout.ts';
import { matcher } from '../../core/text.ts';
import type { MenuItem, PlaylistWords } from './page.ts';
import { WATCH_LATER } from '../watch-later-btn/index.ts';


const WORDS = {
  en: { search: 'Search playlists', find: 'Search playlist', sortBy: 'Sort by:', download: 'Download' },
  es: { search: 'Buscar listas', find: 'Buscar en la lista', sortBy: 'Ordenar por:', download: 'Descargar' },
  pt: { search: 'Pesquisar playlists', find: 'Pesquisar na playlist', sortBy: 'Ordenar por:', download: 'Fazer download' },
  de: { search: 'Playlists durchsuchen', find: 'Playlist durchsuchen', sortBy: 'Sortieren nach:', download: 'Herunterladen' },
  fr: { search: 'Rechercher des playlists', find: 'Rechercher dans la playlist', sortBy: 'Trier par :', download: 'Télécharger' },
  ru: { search: 'Поиск плейлистов', find: 'Поиск в плейлисте', sortBy: 'Сортировка:', download: 'Скачать' },
  ja: { search: '再生リストを検索', find: '再生リスト内を検索', sortBy: '並べ替え:', download: 'ダウンロード' },
  ko: { search: '재생목록 검색', find: '재생목록에서 검색', sortBy: '정렬 기준:', download: '오프라인 저장' },
  hi: { search: 'प्लेलिस्ट खोजें', find: 'प्लेलिस्ट में खोजें', sortBy: 'क्रम से लगाएं:', download: 'डाउनलोड करें' },
  id: { search: 'Telusuri playlist', find: 'Telusuri di playlist', sortBy: 'Urutkan:', download: 'Download' },
  tr: { search: 'Oynatma listelerinde ara', find: 'Oynatma listesinde ara', sortBy: 'Sıralama ölçütü:', download: 'İndir' },
};

type Call = Parameters<NonNullable<Feature['run']>>[0]['call'];

// Header menu rows (YouTube's imageName) -> our icon. A menu with none of these (saved playlists) keeps YouTube's own ⋮;
// an unknown extra row (some playlists have one) gets the generic `more` icon.
const MENU_ICONS: Record<string, string> = {
  SHUFFLE: 'shuffle', OFFLINE_DOWNLOAD: 'download', VISIBILITY: 'eye', PLAYLIST_ADD: 'add-to-playlist',
  SETTINGS: 'settings', DELETE: 'delete', FLAG: 'report', PEOPLE: 'people',
};

// Icons the stylesheet masks in (stat and row pills): --kyt-pl-<key>.
const ICONS = { shuffle: 'shuffle', download: 'download', add: 'add', edit: 'edit', share: 'share', views: 'eye', date: 'date', videos: 'play', duration: 'timelapse', check: 'check' };

const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

/** Playlist pages, Figma Playlists 125:12932 and Playlist 125:13891 (PLAN.md §10 decision 43). */
export const playlists: Feature = {
  id: 'playlists',
  label: 'Playlist pages', hint: 'Header card, stat pills, bulk select', group: 'feeds', icon: 'playlists',
  defaultOn: true,
  routes: ['playlist', 'playlists'],
  options: {
    library: { type: 'choice', label: 'Library layout', default: 'list', choices: { list: 'List', grid: 'Grid' } },
  },
  run({ signal, call }) {
    const html = document.documentElement;
    for (const [k, n] of Object.entries(ICONS)) html.style.setProperty(`--kyt-pl-${k}`, `url("${iconUrl(n)}")`);
    // "Sort by:" before YouTube's sort chip, drawn by CSS.
    html.style.setProperty('--kyt-pl-sort-by', JSON.stringify(local(WORDS).sortBy));
    // The vars stay on abort: YouTube shows the old playlist page for a few frames after leaving the route, and without
    // them its masked buttons paint as solid boxes. They are inert once html[kyt-playlists] is gone.

    // YouTube re-renders the header buttons whenever a playlist opens (and keeps both header kinds around), so stamping
    // their icon types runs for the whole route, not per page. Both headers: idempotent, and which one is live varies.
    if (location.pathname === '/playlist') stampHeaders(signal, call);
    document.addEventListener('kyt:navigate', () => location.pathname === '/playlist' && stampHeaders(signal, call), { signal });

    // Another playlist keeps the route, so restart per navigation.
    let page: AbortController | undefined;
    const start = () => {
      page?.abort();
      page = new AbortController();
      const sig = AbortSignal.any([signal, page.signal]);
      if (location.pathname === '/playlist') playlist(sig, call);
      if (location.pathname === '/feed/playlists') library(sig);
    };
    start();
    document.addEventListener('kyt:navigate', start, { signal });
    // Back/forward fire before YouTube swaps in the page data. It then hides the header kind it doesn't use, so restart on that.
    waitFor('ytd-playlist-header-renderer', { signal }).then((old) => old && observe(old, { attributes: true, attributeFilter: ['hidden'] }, start, signal));
  },
};

/** Stamps the header buttons' icon types as soon as YouTube renders them; one observer per run, safe to call twice. */
const stamping = new WeakSet<AbortSignal>();
async function stampHeaders(signal: AbortSignal, call: Call) {
  if (stamping.has(signal)) return;
  stamping.add(signal);
  const browse = await waitFor(S.playlistBrowse, { signal });
  if (!browse) return;
  // The page data knows the buttons' icon types before the buttons do: stamp from it by position, and reuse the last
  // answer synchronously (before paint) when the row has the same number of buttons.
  let types: string[] = [];
  const byData = () => {
    const btns = [...browse.querySelectorAll<HTMLElement>(`${S.playlistHeader} .ytFlexibleActionsViewModelActionRow > :not(.kyt-pl-hacts) button-view-model`)];
    if (btns.length && btns.length === types.length) btns.forEach((b, i) => types[i] && b.getAttribute('kyt-icon') !== types[i] && b.setAttribute('kyt-icon', types[i]));
  };
  let queued = false;
  const stamp = (retries = 3) => {
    byData();
    if (queued) return;
    queued = true;
    queueMicrotask(async () => {
      queued = false;
      if (signal.aborted) return;
      types = await call('playlistButtons', S.playlistBrowse).catch(() => types);
      if (!signal.aborted) byData();
      await Promise.all([call('stamp', S.playlistHeader, 'playlists'), call('stamp', S.playlistHeaderOld, 'playlists')]).catch(() => {});
      // A button's data can land a frame after its element does: look again a few times.
      if (retries && !signal.aborted && browse.querySelector(`${S.playlistHeader} button-view-model:not([kyt-icon])`)) {
        requestAnimationFrame(() => stamp(retries - 1));
      }
    });
  };
  observe(browse, { childList: true, subtree: true }, () => stamp(), signal);
  stamp();
}

async function playlist(signal: AbortSignal, call: Call) {
  const [stats, list] = await Promise.all([waitFor(S.playlistByline, { signal }), waitFor(S.playlistList, { signal })]);
  const contents = list?.querySelector(':scope > #contents');
  const modern = !!stats?.matches('yt-content-metadata-view-model');
  if (!list || !stats || !contents || signal.aborted) return;

  // Total duration: only once every row has loaded.
  const duration = el('span', 'kyt-pl-duration');
  duration.hidden = true;
  keep(duration, stats, () => duration.parentElement !== stats && stats.append(duration), signal, { childList: true });
  const update = async () => {
    const s = await call('playlistSeconds', S.playlistList).catch(() => null);
    if (signal.aborted) return;
    duration.hidden = s == null;
    duration.textContent = s == null ? '' : clock(s);
  };
  observe(contents, { childList: true }, update, signal);
  update();

  const browse = stats.closest('ytd-browse');
  if (modern) headerMenu(browse, signal, call);

  const words = await call('playlistWords', S.playlistList).catch(() => null);
  if (words && !signal.aborted) bulk(list, contents, words, signal, call);
}

/** Library > Playlists (Figma 125:12932): grid/list toggle and a title search beside YouTube's chips. */
async function library(signal: AbortSignal) {
  const grid = await waitFor(S.playlistsGrid, { signal });
  const header = grid?.querySelector(':scope > #header');
  const contents = grid?.querySelector(':scope > #contents');
  if (!grid || !header || !contents || signal.aborted) return;
  const html = document.documentElement;
  const words = local(WORDS);
  grid.setAttribute('kyt-pl-library', '');

  const toggle = layoutToggle('playlists', 'library', 'list', signal);
  const input = el('input');
  input.type = 'text';
  input.placeholder = words.search;
  const tools = el('div', 'kyt-pl-tools', toggle, el('label', 'kyt-search', icon('search'), input));
  keep(tools, header, () => tools.parentElement !== header && header.append(tools), signal, { childList: true });


  // Every playlist is on the page at once, so the search filters the loaded cards.
  const items = () => contents.querySelectorAll<HTMLElement>(':scope > ytd-rich-item-renderer');
  const search = () => {
    const hit = matcher(input.value);
    for (const it of items()) it.hidden = !hit(it.querySelector(S.lockupTitle)?.textContent ?? '');
  };
  input.addEventListener('input', search, { signal });
  observe(contents, { childList: true }, () => input.value && search(), signal);
  signal.addEventListener('abort', () => {
    grid.removeAttribute('kyt-pl-library');
    for (const it of items()) it.hidden = false;
  }, { once: true });
}

/** Bulk select (Figma 125:13891): a round checkbox per row, a bar with select-all and the actions. */
function bulk(list: Element, contents: Element, words: PlaylistWords, signal: AbortSignal, call: Call) {
  const rows = () => contents.querySelectorAll<HTMLElement>(':scope > ytd-playlist-video-renderer');
  const check = () => {
    const b = el('button', 'kyt-pl-check');
    b.role = 'checkbox';
    b.ariaChecked = 'false';
    return b;
  };
  const all = check();
  const count = el('span', 'kyt-pl-count');
  const btn = (name: string, label: string) => {
    const b = el('button', 'kyt-chip kyt-pl-act', icon(name), label);
    b.title = label;
    return b;
  };
  const remove = btn('delete', words.remove);
  remove.hidden = !words.editable || !words.remove;
  const queue = btn('add-to-queue', words.queue);
  const wl = btn('watch-later', local(WATCH_LATER));
  wl.hidden = words.listId === 'WL';
  const save = btn('add-to-playlist', words.save);
  const menu = el('div', 'kyt-dd-menu');
  menu.role = 'menu';
  const saveDd = el('div', 'kyt-dd', save, menu);
  const actions = el('div', 'kyt-pl-actions', remove, queue, wl, saveDd);
  const input = el('input');
  input.type = 'text';
  input.placeholder = local(WORDS).find;
  const bar = el('div', 'kyt-pl-bar', all, count, actions, el('label', 'kyt-search', icon('search'), input));
  const shown = () => [...rows()].filter((r) => !r.hasAttribute('kyt-pl-miss'));

  const sync = () => {
    const rs = shown();
    const n = rs.filter((r) => r.hasAttribute('kyt-picked')).length;
    all.ariaChecked = n && n === rs.length ? 'true' : n ? 'mixed' : 'false';
    count.textContent = n ? String(n) : '';
    actions.toggleAttribute('kyt-on', n > 0);
    for (const r of rows()) {
      const c = r.querySelector<HTMLElement>(':scope > .kyt-pl-check');
      const on = String(r.hasAttribute('kyt-picked'));
      if (c && c.ariaChecked !== on) c.ariaChecked = on;
    }
  };
  const clear = () => {
    for (const r of rows()) r.removeAttribute('kyt-picked');
    sync();
  };

  // In the section header beside YouTube's sort chip (CSS orders them), else above the rows.
  const header = list.closest('ytd-item-section-renderer')?.querySelector(':scope > #header') ?? null;
  keep(bar, [header ?? list, contents], () => {
    if (header && bar.parentElement !== header) header.prepend(bar);
    else if (!header && bar.nextElementSibling !== contents) contents.before(bar);
    for (const r of rows()) if (!r.querySelector(':scope > .kyt-pl-check')) r.prepend(check());
    if (input.value) search();
    sync();
  }, signal, { childList: true });
  signal.addEventListener('abort', () => {
    for (const r of rows()) {
      r.removeAttribute('kyt-picked');
      r.removeAttribute('kyt-pl-miss');
      r.querySelector(':scope > .kyt-pl-check')?.remove();
    }
  }, { once: true });

  contents.addEventListener('click', (e) => {
    const c = (e.target as Element).closest('.kyt-pl-check');
    if (!c) return;
    e.stopPropagation();
    c.parentElement!.toggleAttribute('kyt-picked');
    sync();
  }, { signal, capture: true });
  all.addEventListener('click', () => {
    const on = all.ariaChecked !== 'true';
    for (const r of shown()) r.toggleAttribute('kyt-picked', on);
    sync();
  }, { signal });

  // shortcut: filters the loaded rows only (100 per page); fetch the rest if users search long playlists.
  // Hidden rows drop their pick, so an action never touches a row you can't see.
  function search() {
    const hit = matcher(input.value);
    for (const r of rows()) {
      const miss = !hit(`${r.querySelector(S.rowTitle)?.textContent ?? ''} ${r.querySelector(S.rowChannel)?.textContent ?? ''}`);
      r.toggleAttribute('kyt-pl-miss', miss);
      if (miss) r.removeAttribute('kyt-picked');
    }
  }
  input.addEventListener('input', () => (search(), sync()), { signal });

  // Removal re-renders the list (rows are reused for other videos), so the picks go.
  remove.addEventListener('click', () => call('playlistRemove', S.playlistList).then(clear), { signal });
  queue.addEventListener('click', () => call('playlistQueue', S.playlistList).then(clear), { signal });
  wl.addEventListener('click', () => call('playlistSave', S.playlistList, 'WL').then(clear), { signal });

  let stop = () => {};
  const close = () => {
    stop();
    saveDd.removeAttribute('open');
    save.ariaExpanded = 'false';
  };
  save.addEventListener('click', async () => {
    if (saveDd.hasAttribute('open')) return close();
    menu.replaceChildren();
    menu.ariaBusy = 'true';
    saveDd.setAttribute('open', '');
    save.ariaExpanded = 'true';
    stop = outsideClick(saveDd, close, signal);
    const targets = await call('playlistTargets', S.playlistList).catch(() => []);
    if (!saveDd.hasAttribute('open')) return;
    menu.ariaBusy = null;
    menu.replaceChildren(...targets.filter((t) => t.id !== words.listId).map((t) => {
      const item = el('button', 'kyt-dd-item', t.title);
      item.role = 'menuitem';
      item.dataset.id = t.id;
      item.ariaDisabled = String(t.has);
      return item;
    }));
    placeMenu(saveDd, menu);
  }, { signal });
  menu.addEventListener('click', (e) => {
    const id = (e.target as Element).closest<HTMLElement>('[data-id]')?.dataset.id;
    if (!id) return;
    close();
    call('playlistSave', S.playlistList, id).then(clear);
  }, { signal });
  bar.addEventListener('keydown', (e) => e.key === 'Escape' && saveDd.hasAttribute('open') && (close(), save.focus()), { signal });
}

/** The view-model header's ⋮ menu rows as buttons in its action row. Each button opens YouTube's own menu (hidden
 *  while it happens) and taps the same row, so Add all to..., Settings and Delete keep YouTube's sheets and dialogs. */
function headerMenu(browse: Element | null, signal: AbortSignal, call: Call) {
  if (!browse) return;
  const html = document.documentElement;
  const row = () => browse.querySelector<HTMLElement>(':scope > yt-page-header-renderer .ytFlexibleActionsViewModelActionRow');
  const host = el('div', 'kyt-pl-hacts');
  let current: HTMLElement | null = null; // the row `host` was built for
  let items: MenuItem[] = [];

  // YouTube rebuilds the row whenever another playlist opens, with data that can arrive after the navigation events.
  const refresh = async (r: HTMLElement) => {
    const next = await call('playlistMenu', S.playlistBrowse).catch(() => []);
    if (signal.aborted || r !== row()) return;
    items = next.some((i) => MENU_ICONS[i.icon]) ? next : [];
    host.replaceChildren(...items.map((it, i) => {
      const b = el('button', 'kyt-pl-hact', icon(MENU_ICONS[it.icon] ?? 'more'));
      b.title = b.ariaLabel = it.title || local(WORDS).download;
      b.dataset.i = String(i);
      return b;
    }));
    r.closest('yt-page-header-renderer')?.toggleAttribute('kyt-pl-menu', items.length > 0);
    if (items.length) r.append(host);
    else host.remove();
  };
  const sync = () => {
    const r = row();
    if (!r) return;
    if (r !== current) {
      current = r;
      host.remove();
      refresh(r);
    } else if (items.length && host.parentElement !== r) r.append(host);
  };
  observe(browse, { childList: true, subtree: true }, sync, signal);
  sync();
  signal.addEventListener('abort', () => {
    host.remove();
    browse.querySelector('[kyt-pl-menu]')?.removeAttribute('kyt-pl-menu');
  }, { once: true });

  host.addEventListener('click', async (e) => {
    const i = Number((e.target as Element).closest<HTMLElement>('[data-i]')?.dataset.i);
    const more = [...(row()?.querySelectorAll<HTMLElement>('button-view-model button') ?? [])].filter((b) => !host.contains(b)).at(-1);
    if (Number.isNaN(i) || !more) return;
    // The menu flashes for one frame at most: hidden until its row is tapped.
    html.setAttribute('kyt-pl-proxy', '');
    try {
      more.click();
      const first = await waitFor(S.popupListItem, { signal, timeout: 3000 });
      const rows = first && [...document.querySelectorAll<HTMLElement>(S.popupListItem)];
      (rows?.[i]?.querySelector<HTMLElement>('.ytListItemViewModelContainer') ?? rows?.[i])?.click();
    } finally {
      requestAnimationFrame(() => html.removeAttribute('kyt-pl-proxy'));
    }
  }, { signal });
}
