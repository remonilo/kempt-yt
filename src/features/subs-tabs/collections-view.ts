// The Collections tab (one section per collection) and a collection's feed (#collection=<id>). Figma 97:5429, 254:10735.
import type { Ctx } from '../../core/feature.ts';
import { el, observe } from '../../core/dom.ts';
import { icon } from '../../core/icon.ts';
import { local, uiLang as lang } from '../../core/i18n.ts';
import { matcher } from '../../core/text.ts';
import { parseAge, plan } from '../timeline/dates.ts';
import { inRange, inType, kindOf, type Range, type Type } from '../timeline/filter.ts';
import { spy, toolbar } from '../timeline/index.ts';
import {
  COLLECTIONS_URL, collectionUrl, sortVideos, deleteCollection, loadCollections, newCollection, onCollectionsChange, saveCollection,
  type Collection,
} from './collections.ts';
import type { ChannelVideo, SubChannel } from './page.ts';

export const WORDS = {
  en: { collections: 'Collections', newCollection: 'New collection', name: 'Collection name', save: 'Save', cancel: 'Cancel', rename: 'Rename', delete: 'Delete', deleteAsk: 'Delete this collection?', addChannels: 'Add channels', view: 'View', manage: 'Manage', none: 'No collections yet. A collection is a feed of only the channels you put in it.', emptyCol: 'No channels yet', addTo: 'Add to collection', noVideos: 'No videos', done: 'Done', search: 'Search channels' },
  es: { collections: 'Colecciones', newCollection: 'Nueva colección', name: 'Nombre de la colección', save: 'Guardar', cancel: 'Cancelar', rename: 'Cambiar nombre', delete: 'Eliminar', deleteAsk: '¿Eliminar esta colección?', addChannels: 'Añadir canales', view: 'Ver', manage: 'Gestionar', none: 'Aún no hay colecciones. Una colección es un feed solo con los canales que añadas.', emptyCol: 'Aún no hay canales', addTo: 'Añadir a colección', noVideos: 'No hay vídeos', done: 'Listo', search: 'Buscar canales' },
  pt: { collections: 'Coleções', newCollection: 'Nova coleção', name: 'Nome da coleção', save: 'Salvar', cancel: 'Cancelar', rename: 'Renomear', delete: 'Excluir', deleteAsk: 'Excluir esta coleção?', addChannels: 'Adicionar canais', view: 'Ver', manage: 'Gerenciar', none: 'Nenhuma coleção ainda. Uma coleção é um feed só com os canais que você adicionar.', emptyCol: 'Nenhum canal ainda', addTo: 'Adicionar à coleção', noVideos: 'Nenhum vídeo', done: 'Concluir', search: 'Pesquisar canais' },
  de: { collections: 'Sammlungen', newCollection: 'Neue Sammlung', name: 'Name der Sammlung', save: 'Speichern', cancel: 'Abbrechen', rename: 'Umbenennen', delete: 'Löschen', deleteAsk: 'Diese Sammlung löschen?', addChannels: 'Kanäle hinzufügen', view: 'Ansehen', manage: 'Verwalten', none: 'Noch keine Sammlungen. Eine Sammlung ist ein Feed nur mit den Kanälen, die du hinzufügst.', emptyCol: 'Noch keine Kanäle', addTo: 'Zur Sammlung hinzufügen', noVideos: 'Keine Videos', done: 'Fertig', search: 'Kanäle durchsuchen' },
  fr: { collections: 'Collections', newCollection: 'Nouvelle collection', name: 'Nom de la collection', save: 'Enregistrer', cancel: 'Annuler', rename: 'Renommer', delete: 'Supprimer', deleteAsk: 'Supprimer cette collection ?', addChannels: 'Ajouter des chaînes', view: 'Voir', manage: 'Gérer', none: 'Aucune collection. Une collection est un flux limité aux chaînes que vous y ajoutez.', emptyCol: 'Aucune chaîne', addTo: 'Ajouter à une collection', noVideos: 'Aucune vidéo', done: 'OK', search: 'Rechercher des chaînes' },
  ru: { collections: 'Коллекции', newCollection: 'Новая коллекция', name: 'Название коллекции', save: 'Сохранить', cancel: 'Отмена', rename: 'Переименовать', delete: 'Удалить', deleteAsk: 'Удалить эту коллекцию?', addChannels: 'Добавить каналы', view: 'Открыть', manage: 'Изменить', none: 'Коллекций пока нет. Коллекция — это лента только из добавленных в неё каналов.', emptyCol: 'Каналов пока нет', addTo: 'Добавить в коллекцию', noVideos: 'Нет видео', done: 'Готово', search: 'Поиск каналов' },
  ja: { collections: 'コレクション', newCollection: '新しいコレクション', name: 'コレクション名', save: '保存', cancel: 'キャンセル', rename: '名前を変更', delete: '削除', deleteAsk: 'このコレクションを削除しますか？', addChannels: 'チャンネルを追加', view: '表示', manage: '管理', none: 'コレクションはまだありません。コレクションは追加したチャンネルだけのフィードです。', emptyCol: 'チャンネルはまだありません', addTo: 'コレクションに追加', noVideos: '動画はありません', done: '完了', search: 'チャンネルを検索' },
  ko: { collections: '컬렉션', newCollection: '새 컬렉션', name: '컬렉션 이름', save: '저장', cancel: '취소', rename: '이름 바꾸기', delete: '삭제', deleteAsk: '이 컬렉션을 삭제할까요?', addChannels: '채널 추가', view: '보기', manage: '관리', none: '아직 컬렉션이 없습니다. 컬렉션은 추가한 채널만 모은 피드입니다.', emptyCol: '아직 채널이 없습니다', addTo: '컬렉션에 추가', noVideos: '동영상 없음', done: '완료', search: '채널 검색' },
  hi: { collections: 'कलेक्शन', newCollection: 'नया कलेक्शन', name: 'कलेक्शन का नाम', save: 'सेव करें', cancel: 'रद्द करें', rename: 'नाम बदलें', delete: 'मिटाएं', deleteAsk: 'यह कलेक्शन मिटाएं?', addChannels: 'चैनल जोड़ें', view: 'देखें', manage: 'मैनेज करें', none: 'अभी कोई कलेक्शन नहीं है। कलेक्शन सिर्फ़ आपके जोड़े चैनलों की फ़ीड है।', emptyCol: 'अभी कोई चैनल नहीं', addTo: 'कलेक्शन में जोड़ें', noVideos: 'कोई वीडियो नहीं', done: 'हो गया', search: 'चैनल खोजें' },
  id: { collections: 'Koleksi', newCollection: 'Koleksi baru', name: 'Nama koleksi', save: 'Simpan', cancel: 'Batal', rename: 'Ganti nama', delete: 'Hapus', deleteAsk: 'Hapus koleksi ini?', addChannels: 'Tambahkan channel', view: 'Lihat', manage: 'Kelola', none: 'Belum ada koleksi. Koleksi adalah feed yang hanya berisi channel yang Anda tambahkan.', emptyCol: 'Belum ada channel', addTo: 'Tambahkan ke koleksi', noVideos: 'Tidak ada video', done: 'Selesai', search: 'Telusuri channel' },
  tr: { collections: 'Koleksiyonlar', newCollection: 'Yeni koleksiyon', name: 'Koleksiyon adı', save: 'Kaydet', cancel: 'İptal', rename: 'Yeniden adlandır', delete: 'Sil', deleteAsk: 'Bu koleksiyon silinsin mi?', addChannels: 'Kanal ekle', view: 'Görüntüle', manage: 'Yönet', none: 'Henüz koleksiyon yok. Koleksiyon, yalnızca eklediğiniz kanalların akışıdır.', emptyCol: 'Henüz kanal yok', addTo: 'Koleksiyona ekle', noVideos: 'Video yok', done: 'Bitti', search: 'Kanallarda ara' },
};

type Words = ReturnType<typeof local<typeof WORDS.en>>;

const MAX_VIDEOS = 240; // about a week for 30 channels; each channel gives its last ~30 uploads
const html = document.documentElement;

export function collectionsView({ signal, call, subs, navigate, onList }: {
  signal: AbortSignal;
  call: Ctx['call'];
  /** /feed/channels, shared with the Channels tab (fetched once). */
  subs: () => Promise<SubChannel[]>;
  navigate: (url: string, push: boolean) => void;
  /** Collections changed (count in the tab, the Channels tab menu). */
  onList: (list: Collection[]) => void;
}) {
  const w: Words = local(WORDS);
  let list: Collection[] = [];
  let byId = new Map<string, SubChannel>();

  // ── Collections tab ──
  const add = el('button', 'kyt-chip kyt-col-new', icon('add'), w.newCollection);
  const input = el('input');
  input.type = 'text';
  input.placeholder = w.search;
  const sections = el('div', 'kyt-col-list');
  const tab = el('div', 'kyt-subs-channels kyt-col-tab',
    el('div', 'kyt-subs-bar', el('div', 'kyt-subs-tools', add), el('label', 'kyt-search', icon('search'), input)), sections);
  tab.hidden = true;

  const closed = new Set<string>(); // collapsed sections, per visit

  const channelCard = (id: string, col: Collection) => {
    const ch = byId.get(id);
    const img = el('img');
    img.loading = 'lazy';
    img.alt = '';
    if (ch?.thumb) img.src = ch.thumb.replace(/=s\d+-/, '=s240-');
    const text = el('span', 'kyt-subs-text', el('span', 'kyt-subs-name', ch?.title ?? id));
    if (ch?.subs) text.append(el('span', 'kyt-subs-meta', ch.subs));
    const a = el('a', 'kyt-subs-link', img, text);
    a.href = a.dataset.url = ch?.url ?? `/channel/${id}`;
    const x = el('button', 'kyt-col-icon kyt-col-remove', icon('close'));
    x.title = x.ariaLabel = `${w.delete}: ${ch?.title ?? id}`;
    x.dataset.remove = id;
    x.dataset.col = col.id;
    const c = el('div', 'kyt-subs-chan', a, x);
    c.dataset.name = ch?.title ?? id;
    return c;
  };

  const iconBtn = (name: string, label: string, action: string, col: string) => {
    const b = el('button', 'kyt-col-icon', icon(name));
    b.title = b.ariaLabel = label;
    b.dataset.action = action;
    b.dataset.col = col;
    return b;
  };

  const renderTab = () => {
    const hit = matcher(input.value);
    sections.replaceChildren(...list.map((col) => {
      const open = !closed.has(col.id);
      const arrow = iconBtn('arrow-down', col.name, 'toggle', col.id);
      arrow.ariaExpanded = String(open);
      const view = el('a', 'kyt-chip kyt-col-view', w.view);
      view.href = view.dataset.url = collectionUrl(col.id);
      const head = el('div', 'kyt-col-head',
        icon('collection'), el('h3', 'kyt-col-name', col.name), el('span', 'kyt-col-count', String(col.channels.length)),
        iconBtn('edit', w.rename, 'rename', col.id), el('span', 'kyt-col-line'),
        el('button', 'kyt-chip', icon('add'), w.addChannels),
        view, iconBtn('delete', w.delete, 'delete', col.id), arrow);
      for (const b of head.querySelectorAll<HTMLElement>('button.kyt-chip')) Object.assign(b.dataset, { action: 'pick', col: col.id });
      const cards = col.channels.map((id) => channelCard(id, col)).filter((c) => hit(c.dataset.name!));
      const body = cards.length
        ? el('div', 'kyt-subs-ch', ...cards)
        : el('p', 'kyt-col-empty', col.channels.length ? '' : w.emptyCol);
      const s = el('section', 'kyt-col', head, el('div', 'kyt-col-body', body));
      s.toggleAttribute('open', open);
      return s;
    }));
    if (!list.length) sections.append(el('p', 'kyt-col-empty', w.none));
  };
  input.addEventListener('input', renderTab, { signal });

  // ── Dialogs: name (new and rename), delete, channel picker ──
  const dialog = (cls: string, ...kids: Node[]) => {
    const d = el('dialog', `kyt-subs-confirm ${cls}`, ...kids);
    d.addEventListener('click', (e) => e.target === d && d.close(), { signal }); // backdrop
    tab.append(d);
    return d;
  };
  const btn = (label: string, cls = '') => el('button', `kyt-chip ${cls}`, label);

  const nameIn = el('input', 'kyt-col-input');
  nameIn.type = 'text';
  nameIn.maxLength = 60;
  nameIn.placeholder = w.name;
  const nameOk = btn(w.save, 'kyt-subs-yes');
  const nameNo = btn(w.cancel);
  const nameForm = el('form', '', nameIn, el('div', 'kyt-subs-confirm-btns', nameNo, nameOk));
  const nameDlg = dialog('kyt-col-name-dlg', nameForm);
  let naming: Collection | null = null;
  const askName = (col: Collection | null) => {
    naming = col;
    nameIn.value = col?.name ?? '';
    nameDlg.showModal();
    nameIn.select();
  };
  nameNo.type = 'button';
  nameNo.addEventListener('click', () => nameDlg.close(), { signal });
  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameIn.value.trim();
    if (!name) return nameIn.focus();
    nameDlg.close();
    const col = naming ? { ...naming, name } : newCollection(name);
    save(col);
    if (!naming) pick(col.id);
  }, { signal });

  const delAsk = el('p');
  const delYes = btn(w.delete, 'kyt-subs-yes');
  const delNo = btn(w.cancel);
  const delDlg = dialog('', delAsk, el('div', 'kyt-subs-confirm-btns', delNo, delYes));
  let deleting = '';
  delNo.addEventListener('click', () => delDlg.close(), { signal });
  delYes.addEventListener('click', () => {
    delDlg.close();
    list = list.filter((c) => c.id !== deleting);
    changed();
    deleteCollection(deleting);
  }, { signal });

  const pickIn = el('input');
  pickIn.type = 'text';
  pickIn.placeholder = w.search;
  const pickList = el('div', 'kyt-col-pick-list');
  const pickDone = btn(w.done, 'kyt-subs-yes');
  const pickTitle = el('p', 'kyt-col-pick-title');
  const pickDlg = dialog('kyt-col-pick', pickTitle, el('label', 'kyt-search', icon('search'), pickIn), pickList,
    el('div', 'kyt-subs-confirm-btns', pickDone));
  let picking = '';
  pickDone.addEventListener('click', () => pickDlg.close(), { signal });
  const pick = async (colId: string) => {
    picking = colId;
    const col = list.find((c) => c.id === colId);
    if (!col) return;
    pickTitle.textContent = `${w.addChannels}: ${col.name}`;
    pickIn.value = '';
    pickList.ariaBusy = 'true';
    pickDlg.showModal();
    const all = await subs();
    pickList.ariaBusy = null;
    pickList.replaceChildren(...all.map((ch) => {
      const box = el('input');
      box.type = 'checkbox';
      box.checked = col.channels.includes(ch.id);
      box.dataset.id = ch.id;
      const img = el('img');
      img.alt = '';
      img.loading = 'lazy';
      if (ch.thumb) img.src = ch.thumb;
      const row = el('label', 'kyt-col-pick-row', box, img, el('span', '', ch.title));
      row.dataset.name = ch.title;
      return row;
    }));
  };
  pickIn.addEventListener('input', () => {
    const hit = matcher(pickIn.value);
    for (const r of pickList.children as HTMLCollectionOf<HTMLElement>) r.hidden = !hit(r.dataset.name!);
  }, { signal });
  pickList.addEventListener('change', (e) => {
    const box = e.target as HTMLInputElement;
    if (box.dataset.id) toggle(picking, box.dataset.id, box.checked);
  }, { signal });

  // ── Storage ──
  const save = (col: Collection) => {
    const i = list.findIndex((c) => c.id === col.id);
    if (i < 0) list.push(col);
    else list[i] = col;
    changed();
    saveCollection(col).catch((e) => console.warn('kyt: saving the collection failed', e));
  };
  /** Adds or removes a channel; `on` undefined flips it. */
  const toggle = (colId: string, chId: string, on?: boolean) => {
    const col = list.find((c) => c.id === colId);
    if (!col) return;
    const has = col.channels.includes(chId);
    if ((on ?? !has) === has) return;
    save({ ...col, channels: has ? col.channels.filter((x) => x !== chId) : [...col.channels, chId] });
  };
  let feedFor = '';
  const changed = () => {
    onList(list);
    renderTab();
    if (feedFor) renderFeed();
  };
  const reload = async () => {
    list = await loadCollections();
    if (!signal.aborted) changed();
  };
  onCollectionsChange(reload, signal);

  tab.addEventListener('click', (e) => {
    const t = e.target as Element;
    const b = t.closest<HTMLElement>('[data-action], [data-remove]');
    if (!b) return;
    const col = list.find((c) => c.id === b.dataset.col);
    if (!col) return;
    if (b.dataset.remove) return toggle(col.id, b.dataset.remove, false);
    switch (b.dataset.action) {
      case 'toggle':
        if (closed.has(col.id)) closed.delete(col.id);
        else closed.add(col.id);
        b.closest('section')!.toggleAttribute('open', !closed.has(col.id));
        b.ariaExpanded = String(!closed.has(col.id));
        break;
      case 'rename': askName(col); break;
      case 'pick': pick(col.id); break;
      case 'delete':
        deleting = col.id;
        delAsk.textContent = `${w.deleteAsk} ${col.name}`;
        delDlg.showModal();
        break;
    }
  }, { signal });
  add.addEventListener('click', () => askName(null), { signal });

  // ── Feed: the Videos tab's toolbar (View as, types, date range, layout, search) over our own cards ──
  const fname = el('h2', 'kyt-col-name');
  const manage = el('a', 'kyt-chip kyt-col-view', icon('edit'), w.manage);
  manage.href = manage.dataset.url = COLLECTIONS_URL;
  const grid = el('div', 'kyt-col-grid');
  const days = spy(signal); // fills the dot of the day at mid-screen, as on the Videos tab
  const filter: { type: Type; range: Range; query: string } = { type: 'all', range: 'any', query: '' };
  const feed = el('div', 'kyt-subs-channels kyt-col-feed',
    el('div', 'kyt-col-head', icon('collection'), fname, el('span', 'kyt-col-line'), manage),
    toolbar(filter, () => draw(), signal), grid);
  feed.hidden = true;

  // A few channels at a time, not 50 requests at once; each channel once per visit.
  const uploads = new Map<string, Promise<ChannelVideo[]>>();
  let active = 0;
  const waiting: (() => void)[] = [];
  const slot = async <T>(fn: () => Promise<T>) => {
    if (active >= 6) await new Promise<void>((r) => waiting.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
  const fetchAll = (ids: string[]) => Promise.all(ids.map((id) => {
    if (!uploads.has(id)) {
      uploads.set(id, slot(() => call('channelVideos', id)).catch((e) => (console.warn('kyt: channel videos failed', id, e), [])));
    }
    return uploads.get(id)!.then((vs) => vs.map((v) => ({ ...v, ch: id })));
  }));

  type Video = ChannelVideo & { ch: string };
  const cards = new Map<string, HTMLElement>(); // per visit: filters and views re-use them (no image reloads)
  const videoCard = (v: Video) => {
    const old = cards.get(v.id);
    if (old) return old;
    const ch = byId.get(v.ch);
    const thumb = el('img');
    thumb.loading = 'lazy';
    thumb.alt = '';
    thumb.src = v.thumb;
    const frame = el('span', 'kyt-col-thumb', thumb);
    // Live now: YouTube's red badge (its own localized "LIVE" text) and a ringed avatar with the same label.
    if (v.live) frame.append(el('span', 'kyt-col-time kyt-col-live', icon('live'), v.duration));
    else if (v.duration) frame.append(el('span', 'kyt-col-time', v.duration));
    const img = el('img', 'kyt-col-avatar');
    img.alt = '';
    img.loading = 'lazy';
    if (ch?.thumb) img.src = ch.thumb;
    const avatar = v.live ? el('span', 'kyt-col-onair', img, el('span', 'kyt-col-live', v.duration)) : img;
    // YouTube's own card: a play icon before the short view count ("▷ 577K • 5h ago").
    const meta = el('span', 'kyt-subs-meta kyt-col-stats', ...(v.views ? [icon('play'), `${v.views} • `] : []), v.age);
    const a = el('a', 'kyt-col-video', frame, el('span', 'kyt-col-info', avatar, el('span', 'kyt-subs-text',
      el('span', 'kyt-col-title', v.title), el('span', 'kyt-subs-meta', ch?.title ?? ''), meta)));
    a.href = a.dataset.url = `/watch?v=${v.id}`;
    cards.set(v.id, a);
    return a;
  };
  const channelHead = (id: string) => {
    const ch = byId.get(id);
    const img = el('img', 'kyt-col-avatar');
    img.alt = '';
    if (ch?.thumb) img.src = ch.thumb;
    const a = el('a', 'kyt-col-day kyt-col-chan', img, ch?.title ?? id);
    a.href = a.dataset.url = ch?.url ?? `/channel/${id}`;
    return a;
  };

  let videos: Video[] = [];
  let feedRun = 0;
  const renderFeed = async () => {
    const col = list.find((c) => c.id === feedFor);
    fname.textContent = col?.name ?? '';
    if (!col) return grid.replaceChildren();
    const run = ++feedRun;
    grid.ariaBusy = 'true';
    const [all] = await Promise.all([fetchAll(col.channels), subs()]);
    if (run !== feedRun || signal.aborted) return;
    grid.ariaBusy = null;
    videos = sortVideos(all.flat(), new Date(), lang());
    draw();
  };

  /** Filters and groups what is loaded; no requests. */
  const draw = () => {
    const col = list.find((c) => c.id === feedFor);
    if (!col || grid.ariaBusy) return;
    const now = new Date();
    const hit = matcher(filter.query);
    const shown = videos.filter((v) => {
      const age = parseAge(v.ageLong, lang());
      return inType(kindOf({ short: false, badge: v.live, age, readable: true }), filter.type) && inRange(age, filter.range)
        && hit(`${v.title} ${byId.get(v.ch)?.title ?? ''}`);
    }).slice(0, MAX_VIDEOS);
    const view = html.getAttribute('kyt-timeline-view') ?? 'timeline';
    const out: Node[] = [];
    grid.classList.toggle('kyt-col-tl', view === 'timeline');
    for (const h of grid.querySelectorAll<HTMLElement>('.kyt-col-day')) days.drop(h);
    if (view === 'channels') {
      // Channels in order of their newest upload, each with its videos.
      const by = new Map<string, Video[]>();
      for (const v of shown) by.set(v.ch, [...(by.get(v.ch) ?? []), v]);
      for (const [id, vs] of by) out.push(channelHead(id), ...vs.map(videoCard));
    } else {
      const starts = view === 'timeline' ? plan(shown.map((v) => v.ageLong), now, lang()) : new Map();
      shown.forEach((v, i) => {
        const g = starts.get(i);
        if (g) out.push(el('h3', 'kyt-col-day', g.label));
        out.push(videoCard(v));
      });
    }
    grid.replaceChildren(...(out.length ? out : [el('p', 'kyt-col-empty', col.channels.length ? w.noVideos : w.emptyCol)]));
    if (view === 'timeline') for (const h of grid.querySelectorAll<HTMLElement>('.kyt-col-day')) days.add(h);
  };
  observe(html, { attributeFilter: ['kyt-timeline-view'] }, () => feedFor && draw(), signal);

  for (const v of [tab, feed]) {
    v.addEventListener('click', (e) => {
      // Same as YouTube's links: its router on a plain left click, a new tab with a modifier.
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-url]');
      const url = a?.dataset.url;
      if (!url || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (url.includes('#')) navigate(url, true);
      else call('navigate', url);
    }, { signal });
  }

  const ready = Promise.all([reload(), subs().then((all) => (byId = new Map(all.map((c) => [c.id, c]))))]).then(() => {
    if (!signal.aborted) changed();
  });

  return {
    tab,
    feed,
    ready,
    list: () => list,
    toggle,
    /** Shows the tab (null) or one collection's feed. */
    show(id: string | null) {
      if (id !== feedFor) cards.clear();
      feedFor = id ?? '';
      if (id) renderFeed();
    },
  };
}
