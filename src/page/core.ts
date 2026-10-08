import { cfg, endpoints, sleep, walk } from './youtube.ts';

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

// Menu rows are re-used across menus (account menu, its submenus), so stale stamps are removed.
const MENU_ITEMS = 'ytd-compact-link-renderer, ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer, ytd-menu-service-item-download-renderer, yt-list-item-view-model';

// Video card menus (yt-list-item-view-model rows) keep no data on the rows. Their icon types sit in the card's data, so a
// click on a card remembers title -> icon type and the rows are matched by title (the same localized string).
const CARDS = 'yt-lockup-view-model, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2';
let cardMenu: Map<string, string> | null = null;

function menuItems(v: any) {
  const out = new Map<string, string>();
  for (const x of walk(v)) {
    const it = x.listItemViewModel;
    const n = it?.leadingImage?.sources?.[0]?.clientResource?.imageName;
    if (it?.title?.content && n) out.set(it.title.content, n);
  }
  return out;
}

function onClick(e: Event) {
  const card = (e.target as Element).closest?.(CARDS) as any;
  const raw = card?.rawProps?.data ?? card?.data;
  const items = card && (e.target as Element).closest('button') ? menuItems(typeof raw === 'function' ? raw() : raw) : null;
  cardMenu = items?.size ? items : null;
}

function listIcon(el: Element) {
  if (!cardMenu || el.tagName !== 'YT-LIST-ITEM-VIEW-MODEL') return undefined;
  // YouTube adds Download on the client, so it is the one card row missing from the card's data.
  return cardMenu.get(el.querySelector('.ytListItemViewModelTitle')?.textContent?.trim() ?? '') ?? 'OFFLINE_DOWNLOAD';
}

function stampMenus(root: Element) {
  const set = (el: Element, name: string, v?: string) => (v ? el.getAttribute(name) !== v && el.setAttribute(name, v) : el.removeAttribute(name));
  for (const el of root.querySelectorAll<any>(MENU_ITEMS)) {
    set(el, 'kyt-icon', iconName(el) ?? listIcon(el));
    set(el, 'kyt-icon2', el.data?.secondaryIcon?.iconType); // CHEVRON_RIGHT, CHECK
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

function watchRoot(sel: string, kind: string, fn: (root: Element) => void, init?: MutationObserverInit) {
  const root = document.querySelector(sel);
  if (root) keepStamped(root, kind, () => fn(root), init);
  return !!root;
}

export const core = {

  /** ytcfg's own login flag; cookies can be hidden from the page (Firefox privacy settings, containers). */
  async signedIn() {
    // ytcfg exists early, but LOGGED_IN is set by a later inline script.
    for (let i = 0; i < 100 && typeof cfg('LOGGED_IN') !== 'boolean'; i++) await sleep(100);
    return cfg('LOGGED_IN') === true;
  },

  // Idempotent: several features can stamp the same root.
  stamp: (sel: string) => watchRoot(sel, 'icon', stampIcons),

  // Items appear when a menu opens, so this watches the popup container (small, only menus and dialogs live there).
  // Re-used rows may only swap their text, hence characterData.
  stampMenus(sel: string) {
    document.addEventListener('click', onClick, { capture: true }); // same listener twice is a no-op
    return watchRoot(sel, 'menus', stampMenus, { childList: true, subtree: true, characterData: true });
  },

  // aria-label changes with the state, the cheap signal that data changed.
  stampBell: (sel: string) => watchRoot(sel, 'bell', stampBell, { childList: true, subtree: true, attributeFilter: ['aria-label'] }),

  stampTabs: (sel: string) => watchRoot(sel, 'tabs', stampTabs, { childList: true, subtree: true, attributeFilter: ['tab-title'] }),

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
