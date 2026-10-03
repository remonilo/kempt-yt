import BUILD from 'kyt:build';

// Runs in YouTube's page context: can read ytcfg and element data.
// Add handlers here; call them from features with ctx.call('name', ...args). Return JSON-safe values.

declare const ytcfg: { get(key: string): any };

const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];

/** Icon type of a YouTube button, e.g. SHARE, PLAYLIST_ADD. Same in every UI language. */
function iconName(el: any): string | undefined {
  const raw = el.rawProps?.data; // yt-*-view-model components
  const d = typeof raw === 'function' ? raw() : el.data; // Polymer ytd-* elements
  return d?.iconName ?? d?.icon?.iconType ?? d?.buttonViewModel?.iconName;
}

const BUTTONS = 'yt-button-view-model, ytd-button-renderer, ytd-toggle-button-renderer, ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer';

function stampAll(root: Element) {
  for (const el of root.querySelectorAll(BUTTONS)) {
    const n = iconName(el);
    if (n && el.getAttribute('kyt-icon') !== n) el.setAttribute('kyt-icon', n);
  }
}

/** kyt-tab="<url slug>" on channel tabs (featured, videos, shorts, ...). The DOM has only the localized title. */
function stampTabs(group: Element) {
  const tabs = (group.closest('ytd-browse') as any)?.data?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
  group.querySelectorAll('yt-tab-shape').forEach((el, i) => {
    const r = tabs[i]?.tabRenderer ?? tabs[i]?.expandableTabRenderer; // same order as the DOM
    const slug = r?.endpoint?.commandMetadata?.webCommandMetadata?.url?.split('/').pop();
    if (!slug) el.removeAttribute('kyt-tab');
    else if (el.getAttribute('kyt-tab') !== slug) el.setAttribute('kyt-tab', slug);
  });
}

const watched = new WeakMap<Element, Set<string>>();

/**
 * Runs `fn` now and again whenever YouTube re-renders under `root`, once per root and kind.
 * Synchronous (before paint): a rAF delay paints re-rendered elements unstamped for one frame (flicker).
 */
function keepStamped(root: Element, kind: string, fn: () => void, init: MutationObserverInit = { childList: true, subtree: true }) {
  fn();
  const kinds = watched.get(root) ?? new Set();
  if (kinds.has(kind)) return;
  watched.set(root, kinds.add(kind));
  new MutationObserver(fn).observe(root, init);
}

/** Innertube POST with the signed-in user's session (SAPISIDHASH auth, as YouTube's own web client does).
 *  Signed out it goes without auth, which public endpoints (guide) accept. */
async function innertube(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Origin': location.origin,
    'X-Goog-AuthUser': String(ytcfg.get('SESSION_INDEX') ?? 0),
    'X-Youtube-Client-Name': String(ytcfg.get('INNERTUBE_CONTEXT_CLIENT_NAME')),
    'X-Youtube-Client-Version': String(ytcfg.get('INNERTUBE_CLIENT_VERSION')),
  };
  const sapisid = cookie('SAPISID') ?? cookie('__Secure-3PAPISID');
  if (sapisid) {
    const ts = Math.floor(Date.now() / 1000);
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${ts} ${sapisid} ${location.origin}`));
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    headers.Authorization = `SAPISIDHASH ${ts}_${hash}`;
  }
  const pageId = ytcfg.get('DELEGATED_SESSION_ID'); // brand accounts
  if (pageId) headers['X-Goog-PageId'] = pageId;
  const res = await fetch(`/youtubei/v1/${endpoint}?prettyPrint=false`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ context: ytcfg.get('INNERTUBE_CONTEXT'), ...body }),
  });
  if (!res.ok) throw new Error(`innertube ${endpoint}: ${res.status}`);
  return res.json();
}

/** Every object in `o`, depth-first. */
function* walk(o: any): Generator<any> {
  if (!o || typeof o !== 'object') return;
  yield o;
  for (const v of Object.values(o)) yield* walk(v);
}
function find(o: any, test: (x: any) => boolean): any {
  for (const x of walk(o)) if (test(x)) return x;
}

const text = (t: any): string => t?.simpleText ?? t?.runs?.map((r: any) => r.text).join('') ?? t?.content ?? '';

/** Endpoints of links we render ourselves, by URL, so navigate() can follow them like YouTube does. */
const endpoints = new Map<string, any>();

let guideFetch: Promise<any> | undefined;

/** One guide entry as JSON. Entries without a URL (Shorts) get a `kyt:<icon>` key; navigate() resolves both. */
function guideEntry(r: any, header?: boolean) {
  const icon: string | undefined = r.icon?.iconType;
  const url: string = r.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ?? `kyt:${icon}`;
  if (r.navigationEndpoint) endpoints.set(url, r.navigationEndpoint);
  return { title: r.formattedTitle?.simpleText ?? text(r.title), url, icon, thumb: r.thumbnail?.thumbnails?.[0]?.url, header };
}

/** Section items flattened: collapsibles ("Show more", "You") expanded in place, their header marked. */
function guideEntries(items: any[] = []): ReturnType<typeof guideEntry>[] {
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

/** askAi(): our edited menu data -> YouTube's original, and the mode it was edited for. */
const askOrig = new WeakMap<object, any>();
const askMode = new WeakMap<object, string>();

const handlers: Record<string, (...args: any[]) => unknown> = {
  ping: () => 'pong',

  /** ytcfg's own login flag; cookies can be hidden from the page (Firefox privacy settings, containers). */
  async signedIn() {
    // ytcfg exists early, but LOGGED_IN is set by a later inline script.
    const flag = () => (typeof ytcfg === 'undefined' ? undefined : ytcfg.get('LOGGED_IN'));
    for (let i = 0; i < 100 && typeof flag() !== 'boolean'; i++) await new Promise((r) => setTimeout(r, 100));
    return flag() === true;
  },

  /** Sets kyt-icon="<ICON_TYPE>" on buttons and guide entries under `sel`, and keeps doing so as YouTube re-renders them. */
  stamp(sel: string) {
    const root = document.querySelector(sel);
    if (root) keepStamped(root, 'icon', () => stampAll(root));
    return !!root;
  },

  /** Sets kyt-tab="<slug>" on the channel tabs in `sel` (a yt-tab-group-shape), kept across re-renders. */
  stampTabs(sel: string) {
    const root = document.querySelector(sel);
    if (root) keepStamped(root, 'tabs', () => stampTabs(root), { childList: true, subtree: true, attributeFilter: ['tab-title'] });
    return !!root;
  },

  /** SPA navigation through YouTube's own router (no page reload): links from guide()/playlists(), or /watch?v= URLs. */
  navigate(url: string) {
    const videoId = new URL(url, location.origin).searchParams.get('v');
    const endpoint = endpoints.get(url) ?? (videoId && {
      commandMetadata: { webCommandMetadata: { url, webPageType: 'WEB_PAGE_TYPE_WATCH', rootVe: 3832 } },
      watchEndpoint: { videoId },
    });
    if (!endpoint) return location.assign(url);
    document.querySelector('ytd-app')?.dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint } }));
    const drawer = document.querySelector<any>('tp-yt-app-drawer#guide'); // the overlay guide (watch pages) closes, as for YouTube's own links
    if (drawer?.opened && !drawer.persistent) drawer.close();
  },

  /** The sidebar's data as [{ type, title, entries }] (guide-dump.js shows the raw shape). Null if it never loads. */
  async guide() {
    let data;
    for (let i = 0; i < 20 && !(data = (document.querySelector('ytd-guide-renderer') as any)?.data?.items); i++)
      await new Promise((r) => setTimeout(r, 100));
    // No expanded guide yet (collapsed sidebar, or an overlay guide never opened): fetch what it would show, once.
    data ??= (await (guideFetch ??= innertube('guide', {}).catch(() => null)))?.items;
    return data?.map((s: any) => {
      const [type, r] = Object.entries(s)[0] as [string, any];
      return { type, title: text(r.formattedTitle), entries: guideEntries(r.items) };
    }) ?? null;
  },

  /** YouTube's own SVG for any icon type, for icons the Figma set lacks. Drawn by a hidden yt-icon,
   *  so it works for entries YouTube hasn't rendered (collapsed "Show more" items such as Memberships). */
  async ytIcon(type: string) {
    const host = document.body.appendChild(document.createElement('div'));
    host.hidden = true;
    const icon: any = host.appendChild(document.createElement('yt-icon'));
    icon.icon = type;
    try {
      for (let i = 0; i < 50; i++) {
        const svg = icon.querySelector('svg');
        if (svg) return new XMLSerializer().serializeToString(svg); // keeps xmlns, needed as a standalone image
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    } finally {
      host.remove();
    }
  },

  /** The signed-in user's playlists, newest activity first. */
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

  /** Re-measures text expanders under `sel` that rendered while hidden (their "...more" is missing otherwise). */
  relayout(sel: string) {
    for (const el of document.querySelectorAll<any>(`${sel} ytd-text-inline-expander`)) (el.polymerController ?? el.inst ?? el).resize?.(false);
  },

  /**
   * YouTube's Ask (AI) button in the watch action row. It's a flexible item: the row drops flexible items from
   * the end into the ⋯ menu as it narrows. 'front' moves it first so it's dropped last, 'off' takes it out of
   * the row and the menu, 'restore' puts YouTube's data back. Reassigning `data` re-stamps the row.
   * Returns whether the page has an Ask button at all.
   */
  askAi(mode: 'front' | 'off' | 'restore') {
    const m = document.querySelector<any>('ytd-watch-metadata #actions ytd-menu-renderer');
    const d = m?.data;
    if (!d) return false;
    const orig = askOrig.get(d) ?? d;
    const isAsk = (it: any) => !!find(it, (x) => x?.panelIdentifier === 'PAyouchat' || x?.iconName === 'SPARK');
    const top: any[] = orig.topLevelButtons ?? [];
    const flex: any[] = orig.flexibleItems ?? [];
    const ask = flex.find(isAsk);
    const has = !!ask || top.some(isAsk);
    let next = orig;
    if (mode === 'off' && has) next = { ...orig, topLevelButtons: top.filter((x) => !isAsk(x)), flexibleItems: flex.filter((x) => x !== ask) };
    if (mode === 'front' && ask && flex[0] !== ask) next = { ...orig, flexibleItems: [ask, ...flex.filter((x) => x !== ask)] };
    if (next === d || (askOrig.get(d) === orig && askMode.get(d) === mode)) return has;
    if (next !== orig) {
      askOrig.set(next, orig);
      askMode.set(next, mode);
    }
    m.data = next;
    return has;
  },

  async inWatchLater(videoId: string) {
    const res = await innertube('playlist/get_add_to_playlist', { videoIds: [videoId] });
    return find(res, (x) => x.playlistId === 'WL' && 'containsSelectedVideos' in x)?.containsSelectedVideos === 'ALL';
  },

  async setWatchLater(videoId: string, add: boolean) {
    const action = add
      ? { action: 'ACTION_ADD_VIDEO', addedVideoId: videoId }
      : { action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID', removedVideoId: videoId };
    const res = await innertube('browse/edit_playlist', { playlistId: 'WL', actions: [action] });
    if (res.status !== 'STATUS_SUCCEEDED') throw new Error(`edit_playlist: ${res.status}`);
    return true;
  },
};

document.addEventListener(`kyt:req:${BUILD}`, async (e) => {
  let req;
  try {
    req = JSON.parse((e as CustomEvent<string>).detail);
  } catch {
    return; // not ours
  }
  const { id, method, args } = req;
  let res;
  try {
    res = { id, result: await handlers[method](...args) };
  } catch (err) {
    res = { id, error: String(err) };
  }
  document.dispatchEvent(new CustomEvent(`kyt:res:${BUILD}`, { detail: JSON.stringify(res) }));
});

// Tell bridge.ts we're listening (attribute for late readers, event for early ones).
document.documentElement.setAttribute('kyt-mw', BUILD);
document.dispatchEvent(new CustomEvent(`kyt:ready:${BUILD}`));
