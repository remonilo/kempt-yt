import { cfg, endpoints, sleep } from './youtube.ts';

// Icon types (SHARE, PLAYLIST_ADD) are the same in every UI language.
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

// The DOM has only the localized title, so the slug comes from the tab data.
function stampTabs(group: Element) {
  const tabs = (group.closest('ytd-browse') as any)?.data?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
  group.querySelectorAll('yt-tab-shape').forEach((el, i) => {
    const r = tabs[i]?.tabRenderer ?? tabs[i]?.expandableTabRenderer; // same order as the DOM
    const slug = r?.endpoint?.commandMetadata?.webCommandMetadata?.url?.split('/').pop();
    if (!slug) el.removeAttribute('kyt-tab');
    else if (el.getAttribute('kyt-tab') !== slug) el.setAttribute('kyt-tab', slug);
  });
}

// Personalized has no stamp (the default glyph). The bell is one animated Lottie icon for every state, so the state
// comes from the toggle's data.
function stampBell(root: Element) {
  for (const el of root.querySelectorAll<any>('ytd-subscription-notification-toggle-button-renderer-next, ytd-subscription-notification-toggle-button-renderer')) {
    const d = el.data;
    const cur = d?.states?.find((s: any) => s.stateId === d.currentStateId)?.state;
    const type: string | undefined = (cur?.buttonRenderer ?? cur)?.icon?.iconType;
    const v = type === 'NOTIFICATIONS_ACTIVE' ? 'all' : type === 'NOTIFICATIONS_OFF' ? 'none' : null;
    if (v) el.setAttribute('kyt-bell', v);
    else el.removeAttribute('kyt-bell');
  }
}

const watched = new WeakMap<Element, Set<string>>();

// Synchronous (before paint): a rAF delay paints re-rendered elements unstamped for one frame (flicker).
function keepStamped(root: Element, kind: string, fn: () => void, init: MutationObserverInit = { childList: true, subtree: true }) {
  fn();
  const kinds = watched.get(root) ?? new Set();
  if (kinds.has(kind)) return;
  watched.set(root, kinds.add(kind));
  new MutationObserver(fn).observe(root, init);
}

export const core = {

  /** ytcfg's own login flag; cookies can be hidden from the page (Firefox privacy settings, containers). */
  async signedIn() {
    // ytcfg exists early, but LOGGED_IN is set by a later inline script.
    for (let i = 0; i < 100 && typeof cfg('LOGGED_IN') !== 'boolean'; i++) await sleep(100);
    return cfg('LOGGED_IN') === true;
  },

  // Idempotent: several features can stamp the same root.
  stamp(sel: string) {
    const root = document.querySelector(sel);
    if (root) keepStamped(root, 'icon', () => stampIcons(root));
    return !!root;
  },

  // aria-label changes with the state, the cheap signal that data changed.
  stampBell(sel: string) {
    const root = document.querySelector(sel);
    if (root) keepStamped(root, 'bell', () => stampBell(root), { childList: true, subtree: true, attributeFilter: ['aria-label'] });
    return !!root;
  },

  stampTabs(sel: string) {
    const root = document.querySelector(sel);
    if (root) keepStamped(root, 'tabs', () => stampTabs(root), { childList: true, subtree: true, attributeFilter: ['tab-title'] });
    return !!root;
  },

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
