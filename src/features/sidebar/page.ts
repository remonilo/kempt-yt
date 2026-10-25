import { endpoints, innertube, savePlaylists, sleep, text } from '../../page/youtube.ts';
import type { Entry, Section } from './nav.ts';
import { waitFor } from '../../core/dom.ts';

let guideFetch: Promise<any> | undefined;

// Shorts carries its endpoint as serviceEndpoint (url /shorts/). Entries with neither get a `kyt:<icon>` key.
function guideEntry(r: any, header?: boolean): Entry {
  const icon: string | undefined = r.icon?.iconType;
  const endpoint = r.navigationEndpoint ?? r.serviceEndpoint;
  const url: string = endpoint?.commandMetadata?.webCommandMetadata?.url ?? `kyt:${icon}`;
  if (endpoint) endpoints.set(url, endpoint);
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
    const rendered = () => (document.querySelector('ytd-guide-renderer') as any)?.data?.items;
    let data = rendered();
    // Once the fetch has run, the guide is known to be missing here: no need to wait for it again.
    for (let i = 0; i < 20 && !data && !guideFetch; i++) {
      await sleep(100);
      data = rendered();
    }
    // No expanded guide yet (collapsed sidebar, or an overlay guide never opened): fetch what it would show, once.
    // A failed fetch is forgotten so the next run retries.
    data ??= (await (guideFetch ??= innertube('guide', {}).catch(() => (guideFetch = undefined, null))))?.items;
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
      const svg = await waitFor('svg', { root: icon, timeout: 5000 });
      return svg && new XMLSerializer().serializeToString(svg); // keeps xmlns, needed as a standalone image
    } finally {
      host.remove();
    }
  },

  async playlists() {
    // ponytail: the add-to-playlist list (any video id works) has every playlist but no thumbnails;
    // browse FEplaylist_aggregation if the dropdown ever shows them.
    return (await savePlaylists()).filter((x) => x.id !== 'WL')
      .map((x) => {
        const url = `/playlist?list=${x.id}`;
        endpoints.set(url, {
          commandMetadata: { webCommandMetadata: { url, webPageType: 'WEB_PAGE_TYPE_PLAYLIST', rootVe: 5754 } },
          browseEndpoint: { browseId: `VL${x.id}` },
        });
        return { title: x.title, url };
      });
  },
};
