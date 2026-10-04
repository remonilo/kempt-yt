import { cfg, endpoints, sleep } from './youtube.ts';

// Page-world handlers shared by several features. Feature-specific ones live in features/<id>/page.ts.

/** Icon type of a YouTube button, e.g. SHARE, PLAYLIST_ADD. Same in every UI language. */
function iconName(el: any): string | undefined {
  const raw = el.rawProps?.data; // yt-*-view-model components
  const d = typeof raw === 'function' ? raw() : el.data; // Polymer ytd-* elements
  return d?.iconName ?? d?.icon?.iconType ?? d?.buttonViewModel?.iconName;
}

const BUTTONS = 'yt-button-view-model, ytd-button-renderer, ytd-toggle-button-renderer, ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer';

function stampIcons(root: Element) {
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

export const core = {
  ping: () => 'pong',

  /** ytcfg's own login flag; cookies can be hidden from the page (Firefox privacy settings, containers). */
  async signedIn() {
    // ytcfg exists early, but LOGGED_IN is set by a later inline script.
    for (let i = 0; i < 100 && typeof cfg('LOGGED_IN') !== 'boolean'; i++) await sleep(100);
    return cfg('LOGGED_IN') === true;
  },

  /** Sets kyt-icon="<ICON_TYPE>" on buttons and guide entries under `sel`, and keeps doing so as YouTube
   *  re-renders them. Idempotent: several features can stamp the same root. */
  stamp(sel: string) {
    const root = document.querySelector(sel);
    if (root) keepStamped(root, 'icon', () => stampIcons(root));
    return !!root;
  },

  /** Sets kyt-tab="<slug>" on the channel tabs in `sel` (a yt-tab-group-shape), kept across re-renders. */
  stampTabs(sel: string) {
    const root = document.querySelector(sel);
    if (root) keepStamped(root, 'tabs', () => stampTabs(root), { childList: true, subtree: true, attributeFilter: ['tab-title'] });
    return !!root;
  },

  /** SPA navigation through YouTube's own router (no page reload): links from `endpoints`, or /watch?v= URLs. */
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
};
