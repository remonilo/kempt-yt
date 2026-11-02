import { cfg, find, savePlaylists, text, walk } from '../../page/youtube.ts';

// Bulk actions reuse each row's own menu commands, sent through YouTube's handler (`yt-service-request`), so YouTube
// does the request, the toast and the list update. Picked rows carry [kyt-picked], set by the content script.
// Old list rows carry a playlistVideoRenderer, lockup rows (other people's playlists, Liked videos) a lockupViewModel.
const picked = (sel: string): any[] =>
  [...document.querySelectorAll<any>(`${sel} [kyt-picked]`)].map((r) => r.data).filter(Boolean);
const videoId = (row: any): string => row.videoId ?? row.contentId;

/** A row's Add to queue command: the old row's menu item, or the lockup's thumbnail hover button. */
const queueCommand = (row: any) => menuItem(row, 'ADD_TO_QUEUE_TAIL')?.serviceEndpoint
  ?? find(row, (x) => x.buttonViewModel?.iconName === 'ADD_TO_QUEUE_TAIL')?.buttonViewModel.onTap?.innertubeCommand;

/** A lockup row's length from its thumbnail badge ("1:02:03"); 0 for live, upcoming or missing. */
const badgeSeconds = (item: any): number => {
  const t: string = find(item, (x) => /^\d+(:\d\d)+$/.test(x?.thumbnailBadgeViewModel?.text ?? ''))?.thumbnailBadgeViewModel.text ?? '';
  return t ? t.split(':').reduce((n, p) => n * 60 + Number(p), 0) : 0;
};

const menuItem = (row: any, iconType: string) => row?.menu?.menuRenderer?.items
  ?.map((i: any) => Object.values(i)[0] as any).find((r: any) => r?.icon?.iconType === iconType);

function serviceRequest(from: Element | null, endpoint: unknown) {
  from?.dispatchEvent(new CustomEvent('yt-action', {
    bubbles: true, composed: true, detail: { actionName: 'yt-service-request', args: [from, endpoint], returnValue: [] },
  }));
}

/** The view-model header's ⋮ menu rows, raw. */
function headerItems(sel: string): any[] {
  // The ⋮ is the last action: other buttons (Save, Share) carry their own sheets with lists too.
  const more = find(document.querySelector<any>(sel)?.data, (x) => x.flexibleActionsViewModel)?.flexibleActionsViewModel.actionsRows?.at(-1)?.actions?.at(-1);
  for (const x of walk(more)) {
    const l = x.listItems;
    if (Array.isArray(l) && l.some((i) => i.downloadListItemViewModel || i.listItemViewModel?.leadingImage)) return l;
  }
  return [];
}

const editEndpoint = (playlistId: string, actions: unknown[], extra: Record<string, unknown> = {}) => ({
  commandMetadata: { webCommandMetadata: { sendPost: true, apiUrl: '/youtubei/v1/browse/edit_playlist' } },
  playlistEditEndpoint: { playlistId, actions, ...extra },
});

export interface PlaylistWords { listId: string; editable: boolean; queue: string; save: string; remove: string }
export interface LibraryCard { id: string; edit: boolean; del: boolean }
export interface MenuItem { title: string; icon: string }
export interface SaveTarget { id: string; title: string; has: boolean }

// A library card's own ⋮ rows (owned playlists: Edit, Delete), by YouTube's imageName.
const cardRows = (item: any): any[] => {
  const rows: any[] = [];
  for (const x of walk(item?.data?.content?.lockupViewModel?.metadata?.lockupMetadataViewModel?.menuButton)) {
    if (Array.isArray(x.listItems)) rows.push(...x.listItems.map((i: any) => i.listItemViewModel).filter(Boolean));
  }
  return rows;
};
const cardRow = (sel: string, id: string, kind: string) => {
  const item = [...document.querySelectorAll<any>(`${sel} ytd-rich-item-renderer`)].find((e) => e.data?.content?.lockupViewModel?.contentId === id);
  const row = cardRows(item).find((r) => r.leadingImage?.sources?.[0]?.clientResource?.imageName === kind);
  return { item, cmd: row?.rendererContext?.commandContext?.onTap?.innertubeCommand };
};

export const playlistsPage = {
  /** Which library cards can be edited or deleted (YouTube gives those rows only for the user's own playlists), plus the account name. */
  libraryCards(sel: string): { account: string; avatar: string; cards: LibraryCard[] } {
    const cards = [...document.querySelectorAll<any>(`${sel} ytd-rich-item-renderer`)].map((item) => {
      const kinds = cardRows(item).map((r) => r.leadingImage?.sources?.[0]?.clientResource?.imageName);
      return { id: item.data?.content?.lockupViewModel?.contentId as string, edit: kinds.includes('EDIT'), del: kinds.includes('DELETE') };
    });
    const avatar = find(document.querySelector<any>('ytd-masthead')?.data, (x) => x.avatar?.thumbnails)?.avatar.thumbnails[0]?.url ?? '';
    return { account: cfg('USER_ACCOUNT_NAME') || '', avatar, cards };
  },

  /** Runs a card's own Edit or Delete command through YouTube's handler. */
  libraryRun(sel: string, id: string, kind: 'EDIT' | 'DELETE') {
    const { item, cmd } = cardRow(sel, id, kind);
    if (cmd && item) serviceRequest(item, cmd);
  },

  /** Total length from the row data. Null while more rows can still load, so a partial sum never shows. */
  playlistSeconds(sel: string) {
    const items: any[] = document.querySelector<any>(sel)?.data?.contents ?? [];
    if (!items.length || items.some((i) => i.continuationItemRenderer || i.continuationItemViewModel)) return null;
    return items.reduce((n, i) => n + (i.playlistVideoRenderer ? Number(i.playlistVideoRenderer.lengthSeconds ?? 0) : badgeSeconds(i)), 0);
  },

  /** Button labels in the UI language, from the first row's menu. */
  playlistWords(sel: string): PlaylistWords | null {
    const d = document.querySelector<any>(sel)?.data;
    const row = d?.contents?.find((i: any) => i.playlistVideoRenderer?.menu)?.playlistVideoRenderer;
    if (!d || !row) return null;
    return {
      listId: d.playlistId, editable: !!d.isEditable,
      queue: text(menuItem(row, 'ADD_TO_QUEUE_TAIL')?.text), save: text(menuItem(row, 'BOOKMARK_BORDER')?.text),
      remove: text(menuItem(row, 'DELETE')?.text),
    };
  },

  /** Icon types of the view-model header's buttons, in DOM order. The page data is ready before the buttons' own data is. */
  playlistButtons(sel: string): string[] {
    for (const x of walk(document.querySelector<any>(sel)?.data)) {
      const a = x.flexibleActionsViewModel?.actionsRows?.[0]?.actions;
      if (Array.isArray(a)) return a.map((b: any) => b.buttonViewModel?.iconName ?? '');
    }
    return [];
  },

  /** Course headers: description and "...More" label (YouTube's own About dialog behind it). Null for other playlists. */
  playlistAbout(sel: string): { text: string; more: string } | null {
    const d = document.querySelector<any>(sel)?.data;
    return d?.onDescriptionTap ? { text: text(d.descriptionText), more: text(d.descriptionTapText) } : null;
  },

  /** Opens the course's About dialog, as YouTube's narrow header does. */
  playlistAboutOpen(sel: string) {
    const h = document.querySelector<any>(sel);
    if (h?.data?.onDescriptionTap) serviceRequest(h, h.data.onDescriptionTap);
  },

  /** The header ⋮ menu in YouTube's row order (Download is its own view model, titled by the client). */
  playlistMenu(sel: string): MenuItem[] {
    return headerItems(sel).map((i) => i.downloadListItemViewModel
      ? { title: '', icon: 'OFFLINE_DOWNLOAD' }
      : { title: i.listItemViewModel?.title?.content ?? '', icon: i.listItemViewModel?.leadingImage?.sources?.[0]?.clientResource?.imageName ?? '' });
  },

  /** Runs row `i`'s own command as a tap would. False when it needs the real menu row (Download, sheets). */
  playlistRun(sel: string, i: number): boolean {
    const cmd = headerItems(sel)[i]?.listItemViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand;
    const from = document.querySelector(sel);
    if (!cmd || !from) return false;
    if (cmd.commandMetadata?.webCommandMetadata?.url) {
      from.dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint: cmd } }));
    } else if (cmd.commandMetadata?.webCommandMetadata?.sendPost) serviceRequest(from, cmd);
    else return false;
    return true;
  },

  playlistQueue(sel: string) {
    const list = document.querySelector(sel);
    for (const row of picked(sel)) serviceRequest(list, queueCommand(row));
  },

  /** One request for every picked row: their remove commands merged (actions + the client-side row removal). */
  playlistRemove(sel: string) {
    const eps = picked(sel).map((r) => menuItem(r, 'DELETE')?.serviceEndpoint?.playlistEditEndpoint).filter(Boolean);
    if (!eps.length) return;
    serviceRequest(document.querySelector(sel), editEndpoint(eps[0].playlistId, eps.flatMap((e) => e.actions), {
      params: eps[0].params,
      clientActions: [{ playlistRemoveVideosAction: { setVideoIds: eps.flatMap((e) => e.clientActions?.[0]?.playlistRemoveVideosAction?.setVideoIds ?? []) } }],
    }));
  },

  /** The user's playlists for the Save menu, as YouTube's own Save dialog lists them. */
  async playlistTargets(sel: string): Promise<SaveTarget[]> {
    // The endpoint 400s on more than one id; the list is the same for any video, `has` only means something for one.
    const ids = picked(sel).map(videoId);
    const list = document.querySelector<any>(sel)?.data?.playlistId ?? new URLSearchParams(location.search).get('list');
    return (await savePlaylists(ids[0])).filter((p) => p.id !== list).map((p) => ({ id: p.id, title: p.title, has: ids.length === 1 && p.all }));
  },

  playlistSave(sel: string, target: string) {
    const ids = [...new Set(picked(sel).map(videoId))];
    if (ids.length) serviceRequest(document.querySelector(sel), editEndpoint(target, ids.map((v) => ({ action: 'ACTION_ADD_VIDEO', addedVideoId: v }))));
  },
};

