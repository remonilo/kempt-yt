import { endpoints, innertube, sleep, text, walk } from '../../page/youtube.ts';
import type { Entry, Section } from './nav.ts';

let guideFetch: Promise<any> | undefined;

// Entries without a URL (Shorts) get a `kyt:<icon>` key; navigate resolves both.
function guideEntry(r: any, header?: boolean): Entry {
  const icon: string | undefined = r.icon?.iconType;
  const url: string = r.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ?? `kyt:${icon}`;
  if (r.navigationEndpoint) endpoints.set(url, r.navigationEndpoint);
  // NEW_CONTENT is YouTube's blue dot on a channel with uploads the user hasn't seen. The data has no count.
  const isNew = r.presentationStyle === 'GUIDE_ENTRY_PRESENTATION_STYLE_NEW_CONTENT' || undefined;
  return { title: r.formattedTitle?.simpleText ?? text(r.title), url, icon, thumb: r.thumbnail?.thumbnails?.[0]?.url as string | undefined, header, isNew };
}

function guideEntries(items: any[] = []): Entry[] {
  return items.flatMap((it) => {
    const [type, r] = Object.entries(it)[0] as [string, any];
    if (type === 'guideEntryRenderer') return [guideEntry(r)];
    if (type === 'guideDownloadsEntryRenderer') return [guideEntry(r.entryRenderer.guideEntryRenderer)];
    if (type === 'guideCollapsibleEntryRenderer') return guideEntries(r.expandableItems);
    if (type === 'guideCollapsibleSectionEntryRenderer')
      return [guideEntry(r.headerEntry.guideEntryRenderer, true), ...guideEntries(r.sectionItems)];
    return []; // sign-in promo and anything new
  });
}

export const sidebar = {
  async guide() {
    let data;
    for (let i = 0; i < 20 && !(data = (document.querySelector('ytd-guide-renderer') as any)?.data?.items); i++) await sleep(100);
    // No expanded guide yet (collapsed sidebar, or an overlay guide never opened): fetch what it would show, once.
    data ??= (await (guideFetch ??= innertube('guide', {}).catch(() => null)))?.items;
    return (data?.map((s: any) => {
      const [type, r] = Object.entries(s)[0] as [string, any];
      return { type, title: text(r.formattedTitle), entries: guideEntries(r.items) };
    }) ?? null) as Section[] | null;
  },

  // Drawn by a hidden yt-icon, so it works for entries YouTube hasn't rendered (collapsed "Show more" items such
  // as Memberships).
  async ytIcon(type: string) {
    const host = document.body.appendChild(document.createElement('div'));
    host.hidden = true;
    const icon: any = host.appendChild(document.createElement('yt-icon'));
    icon.icon = type;
    try {
      for (let i = 0; i < 50; i++) {
        const svg = icon.querySelector('svg');
        if (svg) return new XMLSerializer().serializeToString(svg) as string; // keeps xmlns, needed as a standalone image
        await sleep(100);
      }
      return null;
    } finally {
      host.remove();
    }
  },

  async playlists() {
    // ponytail: the add-to-playlist list (any video id works) has every playlist but no thumbnails;
    // browse FEplaylist_aggregation if the dropdown ever shows them.
    const res = await innertube('playlist/get_add_to_playlist', { videoIds: ['dQw4w9WgXcQ'] });
    return [...walk(res)].filter((x) => typeof x.playlistId === 'string' && 'containsSelectedVideos' in x && x.playlistId !== 'WL')
      .map((x) => {
        const url = `/playlist?list=${x.playlistId}`;
        endpoints.set(url, {
          commandMetadata: { webCommandMetadata: { url, webPageType: 'WEB_PAGE_TYPE_PLAYLIST', rootVe: 5754 } },
          browseEndpoint: { browseId: `VL${x.playlistId}` },
        });
        return { title: text(x.title), url };
      });
  },
};
