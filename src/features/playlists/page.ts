import { innertube, text, walk } from '../../page/youtube.ts';

// Bulk actions reuse each row's own menu commands, sent through YouTube's handler (`yt-service-request`), so YouTube
// does the request, the toast and the list update. Picked rows carry [kyt-picked], set by the content script.
const picked = (sel: string): any[] =>
  [...document.querySelectorAll<any>(`${sel} ytd-playlist-video-renderer[kyt-picked]`)].map((r) => r.data).filter(Boolean);

const menuItem = (row: any, iconType: string) => row?.menu?.menuRenderer?.items
  ?.map((i: any) => Object.values(i)[0] as any).find((r: any) => r?.icon?.iconType === iconType);

function serviceRequest(from: Element | null, endpoint: unknown) {
  from?.dispatchEvent(new CustomEvent('yt-action', {
    bubbles: true, composed: true, detail: { actionName: 'yt-service-request', args: [from, endpoint], returnValue: [] },
  }));
}

const editEndpoint = (playlistId: string, actions: unknown[], extra: Record<string, unknown> = {}) => ({
  commandMetadata: { webCommandMetadata: { sendPost: true, apiUrl: '/youtubei/v1/browse/edit_playlist' } },
  playlistEditEndpoint: { playlistId, actions, ...extra },
});

export interface PlaylistWords { listId: string; editable: boolean; queue: string; save: string; remove: string }
export interface MenuItem { title: string; icon: string }
export interface SaveTarget { id: string; title: string; has: boolean }

export const playlistsPage = {
  /** Total length from the row data. Null while more rows can still load, so a partial sum never shows. */
  playlistSeconds(sel: string) {
    const items: any[] = document.querySelector<any>(sel)?.data?.contents ?? [];
    if (!items.length || items.some((i) => i.continuationItemRenderer)) return null;
    return items.reduce((n, i) => n + Number(i.playlistVideoRenderer?.lengthSeconds ?? 0), 0);
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

  /** The header ⋮ menu in YouTube's row order (Download is its own view model, titled by the client). */
  playlistMenu(sel: string): MenuItem[] {
    for (const x of walk(document.querySelector<any>(sel)?.data)) {
      const l = x.listItems;
      if (!Array.isArray(l) || !l.some((i) => i.downloadListItemViewModel || i.listItemViewModel?.leadingImage)) continue;
      return l.map((i) => i.downloadListItemViewModel
        ? { title: '', icon: 'OFFLINE_DOWNLOAD' }
        : { title: i.listItemViewModel?.title?.content ?? '', icon: i.listItemViewModel?.leadingImage?.sources?.[0]?.clientResource?.imageName ?? '' });
    }
    return [];
  },

  playlistQueue(sel: string) {
    const list = document.querySelector(sel);
    for (const row of picked(sel)) serviceRequest(list, menuItem(row, 'ADD_TO_QUEUE_TAIL')?.serviceEndpoint);
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
    const ids = picked(sel).map((r) => r.videoId);
    const res = await innertube('playlist/get_add_to_playlist', { videoIds: [ids[0] ?? 'dQw4w9WgXcQ'] });
    const list = document.querySelector<any>(sel)?.data?.playlistId;
    const out: SaveTarget[] = [];
    for (const x of walk(res)) {
      if (x.playlistId && x.playlistId !== list && 'containsSelectedVideos' in x) {
        out.push({ id: x.playlistId, title: text(x.title), has: ids.length === 1 && x.containsSelectedVideos === 'ALL' });
      }
    }
    return out;
  },

  playlistSave(sel: string, target: string) {
    const ids = [...new Set(picked(sel).map((r) => r.videoId as string))];
    if (ids.length) serviceRequest(document.querySelector(sel), editEndpoint(target, ids.map((v) => ({ action: 'ACTION_ADD_VIDEO', addedVideoId: v }))));
  },
};

