import type { Feature } from '../../core/feature.ts';
import { el, keep, observe, waitFor } from '../../core/dom.ts';
import { outsideClick, placeMenu } from '../../core/dropdown.ts';
import { icon, iconUrl } from '../../core/icon.ts';
import { local } from '../../core/i18n.ts';
import { S } from '../../core/selectors.ts';
import { layoutToggle } from '../../core/layout.ts';
import { matcher } from '../../core/text.ts';
import type { LibraryCard, MenuItem, PlaylistWords } from './page.ts';
import { WATCH_LATER } from '../watch-later-btn/index.ts';


const WORDS = {
  en: { search: 'Search playlists', find: 'Search playlist', sortBy: 'Sort by:', download: 'Download', playAll: 'Play all', share: 'Copy link', edit: 'Edit', remove: 'Delete', addTo: 'Add to playlist', queue: 'Add to queue' },
  es: { search: 'Buscar listas', find: 'Buscar en la lista', sortBy: 'Ordenar por:', download: 'Descargar', playAll: 'Reproducir todo', share: 'Copiar enlace', edit: 'Editar', remove: 'Eliminar', addTo: 'Añadir a lista', queue: 'Añadir a la cola' },
  pt: { search: 'Pesquisar playlists', find: 'Pesquisar na playlist', sortBy: 'Ordenar por:', download: 'Fazer download', playAll: 'Reproduzir tudo', share: 'Copiar link', edit: 'Editar', remove: 'Excluir', addTo: 'Adicionar à playlist', queue: 'Adicionar à fila' },
  de: { search: 'Playlists durchsuchen', find: 'Playlist durchsuchen', sortBy: 'Sortieren nach:', download: 'Herunterladen', playAll: 'Alle wiedergeben', share: 'Link kopieren', edit: 'Bearbeiten', remove: 'Löschen', addTo: 'Zu Playlist hinzufügen', queue: 'Zur Warteschlange hinzufügen' },
  fr: { search: 'Rechercher des playlists', find: 'Rechercher dans la playlist', sortBy: 'Trier par :', download: 'Télécharger', playAll: 'Tout lire', share: 'Copier le lien', edit: 'Modifier', remove: 'Supprimer', addTo: 'Ajouter à une playlist', queue: 'Ajouter à la file d\'attente' },
  ru: { search: 'Поиск плейлистов', find: 'Поиск в плейлисте', sortBy: 'Сортировка:', download: 'Скачать', playAll: 'Воспроизвести все', share: 'Копировать ссылку', edit: 'Изменить', remove: 'Удалить', addTo: 'Добавить в плейлист', queue: 'Добавить в очередь' },
  ja: { search: '再生リストを検索', find: '再生リスト内を検索', sortBy: '並べ替え:', download: 'ダウンロード', playAll: 'すべて再生', share: 'リンクをコピー', edit: '編集', remove: '削除', addTo: '再生リストに追加', queue: 'キューに追加' },
  ko: { search: '재생목록 검색', find: '재생목록에서 검색', sortBy: '정렬 기준:', download: '오프라인 저장', playAll: '모두 재생', share: '링크 복사', edit: '수정', remove: '삭제', addTo: '재생목록에 추가', queue: '현재 재생목록에 추가' },
  hi: { search: 'प्लेलिस्ट खोजें', find: 'प्लेलिस्ट में खोजें', sortBy: 'क्रम से लगाएं:', download: 'डाउनलोड करें', playAll: 'सभी चलाएं', share: 'लिंक कॉपी करें', edit: 'संपादित करें', remove: 'हटाएं', addTo: 'प्लेलिस्ट में जोड़ें', queue: 'कतार में जोड़ें' },
  id: { search: 'Telusuri playlist', find: 'Telusuri di playlist', sortBy: 'Urutkan:', download: 'Download', playAll: 'Putar semua', share: 'Salin link', edit: 'Edit', remove: 'Hapus', addTo: 'Tambahkan ke playlist', queue: 'Tambahkan ke antrean' },
  tr: { search: 'Oynatma listelerinde ara', find: 'Oynatma listesinde ara', sortBy: 'Sıralama ölçütü:', download: 'İndir', playAll: 'Tümünü oynat', share: 'Bağlantıyı kopyala', edit: 'Düzenle', remove: 'Sil', addTo: 'Oynatma listesine ekle', queue: 'Sıraya ekle' },
};

type Call = Parameters<NonNullable<Feature['run']>>[0]['call'];

// Header menu rows (YouTube's imageName) -> our icon. A menu with none of these (saved playlists) keeps YouTube's own ⋮;
// an unknown extra row (some playlists have one) gets the generic `more` icon.
const MENU_ICONS: Record<string, string> = {
  SHUFFLE: 'shuffle', OFFLINE_DOWNLOAD: 'download', VISIBILITY: 'eye', VISIBILITY_OFF: 'hide', PLAYLIST_ADD: 'add-to-playlist',
  SETTINGS: 'settings', DELETE: 'delete', FLAG: 'report', PEOPLE: 'people',
};

// Icons the stylesheet masks in (stat and row pills): --kyt-pl-<key>.
const ICONS = { shuffle: 'shuffle', download: 'download', add: 'add', edit: 'edit', share: 'share', save: 'save', views: 'eye', date: 'date', videos: 'play', duration: 'timelapse', check: 'check', comments: 'comments' };

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
      if (location.pathname === '/feed/playlists') library(sig, call);
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
  const stats = await waitFor(S.playlistByline, { signal });
  if (!stats || signal.aborted) return;
  // The header works without the old list: other people's playlists render rows as lockups (no list renderer).
  if (stats.matches('yt-content-metadata-view-model')) headerMenu(stats.closest('ytd-browse'), signal, call);
  else courseAbout(signal, call);

  // Opening another playlist swaps the list element (old list and lockup section trade places), and the previous one
  // lingers for a moment after the navigation: rebind whenever the live one changes.
  const browse = stats.closest('ytd-browse');
  if (!browse) return;
  let cur: Element | null = null;
  let sub: AbortController | undefined;
  const bind = () => {
    const list = document.querySelector(`${S.playlistList}, ${S.playlistLockups}`);
    if (list === cur || (list && !list.querySelector(':scope > #contents'))) return;
    cur = list;
    sub?.abort();
    if (!list) return;
    sub = new AbortController();
    rows(list, stats, AbortSignal.any([signal, sub.signal]), call);
  };
  observe(browse, { childList: true, subtree: true }, bind, signal);
  bind();
}

/** Duration and bulk select for one list element. */
function rows(list: Element, stats: Element, signal: AbortSignal, call: Call) {
  const contents = list.querySelector(':scope > #contents');
  if (!contents) return;
  const sel = list.matches(S.playlistList) ? S.playlistList : S.playlistLockups;

  // Total duration: only once every row has loaded.
  const duration = el('span', 'kyt-pl-duration');
  duration.hidden = true;
  keep(duration, stats, () => duration.parentElement !== stats && stats.append(duration), signal, { childList: true });
  // Lockup rows render before their data lands, with no row added after, so watch the subtree until a sum shows.
  let deep = sel === S.playlistLockups;
  const update = async () => {
    const s = await call('playlistSeconds', sel).catch(() => null);
    if (signal.aborted) return;
    duration.hidden = s == null;
    duration.textContent = s == null ? '' : clock(s);
    if (deep && s != null) {
      deep = false;
      obs.disconnect();
      obs.observe(contents, { childList: true });
    }
  };
  const obs = observe(contents, { childList: true, subtree: deep }, update, signal);
  update();

  // Lockup rows carry no menu, and the section's data can land without a DOM change, so their labels are ours.
  if (sel === S.playlistLockups) {
    const w = local(WORDS);
    bulk(list, contents, sel, { listId: new URLSearchParams(location.search).get('list') ?? '', editable: false, remove: '', save: w.addTo, queue: w.queue }, signal, call);
    return;
  }
  call('playlistWords', sel).catch(() => null).then((words) => words && !signal.aborted && bulk(list, contents, sel, words, signal, call));
}

/** Course playlists: the long description becomes one line with YouTube's "...More", which opens its About dialog. */
async function courseAbout(signal: AbortSignal, call: Call) {
  const about = await call('playlistAbout', S.playlistHeaderOld).catch(() => null);
  const header = document.querySelector(S.playlistHeaderOld);
  const desc = header?.querySelector('.metadata-wrapper > .description');
  if (!about || !header || !desc || signal.aborted) return;
  header.setAttribute('kyt-pl-course', '');
  signal.addEventListener('abort', () => header.removeAttribute('kyt-pl-course'), { once: true });
  // Our own line: YouTube empties its snippet below about 1000px wide.
  const more = el('button', 'kyt-pl-more', about.more);
  more.type = 'button';
  const line = el('div', 'kyt-pl-about', el('span', '', about.text.replace(/\s+/g, ' ')), more);
  keep(line, desc, () => line.parentElement !== desc && desc.append(line), signal, { childList: true });
  line.addEventListener('click', (e) => {
    e.preventDefault();
    call('playlistAboutOpen', S.playlistHeaderOld).catch(() => {});
  }, { signal });
}

/** Library > Playlists (Figma 125:12932): grid/list toggle and a title search beside YouTube's chips. */
async function library(signal: AbortSignal, call: Call) {
  const grid = await waitFor(S.playlistsGrid, { signal });
  const header = grid?.querySelector(':scope > #header');
  const contents = grid?.querySelector(':scope > #contents');
  if (!grid || !header || !contents || signal.aborted) return;
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

  // Owner, stat line and actions under each card (Figma 125:12932), built from what the lockup already shows. Edit and
  // Delete exist only on the user's own playlists: YouTube gives those ⋮ rows to nobody else.
  let info: { account: string; avatar: string; cards: LibraryCard[] } | undefined;
  const idOf = (it: Element) => {
    const href = it.querySelector<HTMLAnchorElement>('a.ytLockupViewModelContentImage')?.href;
    try { return href ? new URL(href).searchParams.get('list') : null; } catch { return null; }
  };
  // Sorting re-renders the lockups after the items are added, so a card can lack its footer without a childList change on contents.
  const stale = () => [...items()].some((it) => {
    const id = idOf(it);
    return id && it.querySelector(S.lockupMeta) && it.querySelector<HTMLElement>('.kyt-pl-foot')?.dataset.id !== id;
  });
  const decorate = async () => {
    if (!stale()) return;
    await waitFor(S.mastheadMenu, { signal }); // its data carries the avatar
    info = await call('libraryCards', S.playlistsGrid).catch(() => undefined);
    if (signal.aborted) return;
    const avatar = info?.avatar;
    for (const it of items()) {
      const href = it.querySelector<HTMLAnchorElement>('a.ytLockupViewModelContentImage')?.href;
      const id = idOf(it);
      if (!href) continue;
      const meta = it.querySelector(S.lockupMeta);
      const old = it.querySelector<HTMLElement>('.kyt-pl-foot');
      if (!id || !meta || old?.dataset.id === id) continue;
      old?.remove();
      const card = info?.cards.find((c) => c.id === id);
      const own = !!(card?.edit || card?.del) || id === 'WL' || id === 'LL';
      const rows = it.querySelectorAll('.ytContentMetadataViewModelMetadataRow');
      const first = rows[0]?.querySelector('.ytContentMetadataViewModelMetadataText')?.textContent?.trim();
      const updated = rows[1] && !rows[1].querySelector('a') ? rows[1].textContent : '';
      const stat = (name: string, text?: string | null) => text ? el('span', 'kyt-pl-stat', icon(name), text.trim()) : '';
      // Own playlists show "Private" in the owner slot, so the owner is the account; others show their owner there.
      const name = own ? info?.account : first;
      const owner = el('div', 'kyt-pl-owner');
      if (own && avatar) {
        const img = el('img', 'kyt-pl-avatar');
        img.src = avatar;
        img.alt = '';
        owner.append(img);
      }
      if (name) owner.append(el('span', 'kyt-pl-name', name));
      const btn = (cls: string, name: string, label: string) => {
        const b = el('button', `kyt-pl-btn ${cls}`, icon(name));
        b.title = b.ariaLabel = label;
        return b;
      };
      const play = el('a', 'kyt-pl-play', icon('play'), words.playAll);
      play.href = href;
      const btns = el('div', 'kyt-pl-btns', play);
      // Watch later and Liked videos are not shareable or editable.
      if (id !== 'WL' && id !== 'LL') {
        const copy = btn('kyt-pl-share', 'share', words.share);
        // Copies the link: YouTube's share dialog needs an entity id we can't build for playlists (a guessed one spins forever).
        copy.addEventListener('click', () => {
          navigator.clipboard.writeText(`${location.origin}/playlist?list=${id}`);
          copy.setAttribute('kyt-copied', '');
        }, { signal });
        copy.addEventListener('animationend', () => copy.removeAttribute('kyt-copied'), { signal });
        btns.append(copy);
      }
      if (card?.edit) {
        const edit = btn('kyt-pl-edit', 'edit', words.edit);
        edit.addEventListener('click', () => call('libraryRun', S.playlistsGrid, id, 'EDIT'), { signal });
        btns.append(edit);
      }
      if (card?.del) {
        // No timers: the first click arms the button, the second deletes, leaving the button disarms it.
        const del = btn('kyt-pl-delete', 'delete', words.remove);
        del.addEventListener('click', () => {
          if (!del.hasAttribute('kyt-armed')) return del.setAttribute('kyt-armed', '');
          call('libraryRun', S.playlistsGrid, id, 'DELETE');
        }, { signal });
        del.addEventListener('mouseleave', () => del.removeAttribute('kyt-armed'), { signal });
        del.addEventListener('blur', () => del.removeAttribute('kyt-armed'), { signal });
        btns.append(del);
      }
      const foot = el('div', 'kyt-pl-foot', owner, el('div', 'kyt-pl-stats', own ? stat('hide', first) : '', stat('date', updated)), btns);
      foot.dataset.id = id;
      meta.append(foot);
    }
  };
  decorate();
  observe(contents, { childList: true, subtree: true }, decorate, signal);
  signal.addEventListener('abort', () => {
    grid.removeAttribute('kyt-pl-library');
    for (const it of items()) it.hidden = false;
    for (const f of contents.querySelectorAll('.kyt-pl-foot')) f.remove();
  }, { once: true });
}

/** Bulk select (Figma 125:13891): a round checkbox per row, a bar with select-all and the actions. */
function bulk(list: Element, contents: Element, sel: string, words: PlaylistWords, signal: AbortSignal, call: Call) {
  // Lockup rows (other people's playlists, Liked videos) are bare divs; the last div holds the continuation.
  const row = sel === S.playlistList ? ':scope > ytd-playlist-video-renderer' : ':scope > div:has(> yt-lockup-view-model)';
  const rows = () => contents.querySelectorAll<HTMLElement>(row);
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
  const header = list.closest('ytd-item-section-renderer, yt-item-section-renderer')?.querySelector(':scope > #header') ?? null;
  keep(bar, [header ?? list, contents], () => {
    if (header && bar.parentElement !== header) header.prepend(bar);
    else if (!header && bar.nextElementSibling !== contents) contents.before(bar);
    for (const r of rows()) if (!r.querySelector(':scope > .kyt-pl-check')) r.prepend(check());
    if (input.value) search();
    sync();
    // Opening another playlist reuses this list while words still describe the previous one ("Remove from X").
    if (sel === S.playlistList) call('playlistWords', sel).then((w) => {
      if (!w || signal.aborted || w.listId === words.listId) return;
      Object.assign(words, w);
      remove.hidden = !words.editable || !words.remove;
      wl.hidden = words.listId === 'WL';
      remove.lastChild!.textContent = remove.title = words.remove;
    }).catch(() => {});
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
      const miss = !hit(`${r.querySelector(`${S.rowTitle}, ${S.lockupTitle}`)?.textContent ?? ''} ${r.querySelector(`${S.rowChannel}, ${S.lockupChannel}`)?.textContent ?? ''}`);
      r.toggleAttribute('kyt-pl-miss', miss);
      if (miss) r.removeAttribute('kyt-picked');
    }
  }
  input.addEventListener('input', () => (search(), sync()), { signal });

  // Removal re-renders the list (rows are reused for other videos), so the picks go.
  remove.addEventListener('click', () => call('playlistRemove', sel).then(clear), { signal });
  queue.addEventListener('click', () => call('playlistQueue', sel).then(clear), { signal });
  wl.addEventListener('click', () => call('playlistSave', sel, 'WL').then(clear), { signal });

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
    const targets = await call('playlistTargets', sel).catch(() => []);
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
    call('playlistSave', sel, id).then(clear);
  }, { signal });
  bar.addEventListener('keydown', (e) => e.key === 'Escape' && saveDd.hasAttribute('open') && (close(), save.focus()), { signal });
}

/** The view-model header's ⋮ menu rows as buttons in its action row. A button runs its row's command directly when it
 *  can; otherwise (Download, Add all to...'s sheet) it opens YouTube's own menu hidden and taps the same row. */
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
    if (await call('playlistRun', S.playlistBrowse, i).catch(() => false)) return;
    // Hidden until its row is tapped; the tap closes the menu in the same frame.
    html.setAttribute('kyt-pl-proxy', '');
    try {
      more.click();
      const menu = await waitFor(S.openPopupMenu, { signal, timeout: 3000, attributes: ['focused', 'aria-hidden'] });
      const rows = menu && [...menu.querySelectorAll<HTMLElement>('yt-list-item-view-model')];
      (rows?.[i]?.querySelector<HTMLElement>('.ytListItemViewModelContainer') ?? rows?.[i])?.click();
    } finally {
      requestAnimationFrame(() => html.removeAttribute('kyt-pl-proxy'));
    }
  }, { signal });
}
