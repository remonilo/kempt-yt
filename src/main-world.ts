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

/** Innertube POST with the signed-in user's session (SAPISIDHASH auth, as YouTube's own web client does). */
async function innertube(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const sapisid = cookie('SAPISID') ?? cookie('__Secure-3PAPISID');
  if (!sapisid) throw new Error('signed out');
  const ts = Math.floor(Date.now() / 1000);
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${ts} ${sapisid} ${location.origin}`));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `SAPISIDHASH ${ts}_${hash}`,
    'X-Origin': location.origin,
    'X-Goog-AuthUser': String(ytcfg.get('SESSION_INDEX') ?? 0),
    'X-Youtube-Client-Name': String(ytcfg.get('INNERTUBE_CONTEXT_CLIENT_NAME')),
    'X-Youtube-Client-Version': String(ytcfg.get('INNERTUBE_CLIENT_VERSION')),
  };
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

/** Depth-first search for the first object matching `test`. */
function find(o: any, test: (x: any) => boolean): any {
  if (!o || typeof o !== 'object') return undefined;
  if (test(o)) return o;
  for (const v of Object.values(o)) {
    const hit = find(v, test);
    if (hit) return hit;
  }
  return undefined;
}

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

  /** SPA navigation through YouTube's own router (no page reload). Only /watch?v= URLs for now. */
  navigate(url: string) {
    const videoId = new URL(url, location.origin).searchParams.get('v');
    document.querySelector('ytd-app')?.dispatchEvent(new CustomEvent('yt-navigate', {
      bubbles: true,
      composed: true,
      detail: { endpoint: {
        commandMetadata: { webCommandMetadata: { url, webPageType: 'WEB_PAGE_TYPE_WATCH', rootVe: 3832 } },
        watchEndpoint: { videoId },
      } },
    }));
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
