import type { Feature } from '../../core/feature.ts';
import { keep, waitFor } from '../../core/dom.ts';
import { icon, setIcon, setIconUrl } from '../../core/icon.ts';
import { S } from '../../core/selectors.ts';
import { buildNav, EXPLORE, type Entry, type Nav, type Row, type Section } from './nav.ts';

/** YouTube icon type (minus _CAIRO) -> Figma icon. Unlisted types use YouTube's own SVG. */
const FIGMA: Record<string, string> = {
  TAB_HOME: 'home', EXPLORE: 'explore', TAB_SHORTS: 'shorts', TAB_SUBSCRIPTIONS: 'subs',
  ACCOUNT_CIRCLE: 'you', ACCOUNT_BOX: 'you', WATCH_HISTORY: 'history', PLAYLISTS: 'playlists',
  WATCH_LATER: 'watch-later', LIKES_PLAYLIST: 'liked-videos', OFFLINE_DOWNLOAD: 'download', COURSE: 'learning',
  MUSIC: 'music', GAMING_LOGO: 'games', NEWS: 'news', TROPHY: 'sports', STAR_SHOOTING_OUTLINE: 'trending',
  FASHION: 'fashion', LIVE: 'live', FLAG: 'report', SETTINGS: 'settings',
};
const NO_SELECTED = new Set(['download', 'report']); // Figma has no filled variant

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, ...kids: (Node | string)[]) {
  const e = document.createElement(tag);
  e.className = cls;
  e.append(...kids);
  return e;
}

/** Same page as `url`: equal path (or a sub-page of a channel), and every query param of `url` present. */
function isHere(url: string): boolean {
  if (!url.startsWith('/')) return false;
  const [path, query] = url.split('?');
  const here = location.pathname;
  if (path !== here && (path === '/' || !here.startsWith(`${path}/`))) return false;
  const params = new URLSearchParams(location.search);
  return [...new URLSearchParams(query)].every(([k, v]) => params.get(k) === v);
}

export const sidebar: Feature = {
  id: 'sidebar',
  label: 'Redesigned sidebar',
  defaultOn: true,
  options: {
    'hide-you': { type: 'boolean', label: 'Hide "You"', default: true },
    'hide-channel': { type: 'boolean', label: 'Hide "Your channel"', default: true },
    'hide-videos': { type: 'boolean', label: 'Hide "Your videos"', default: true },
    'hide-courses': { type: 'boolean', label: 'Hide "Courses"', default: true },
  },
  async run({ signal, call }) {
    const ytIcons = new Map<string, Promise<string | null>>();
    const ytIcon = (type: string) => {
      if (!ytIcons.has(type)) ytIcons.set(type, call('ytIcon', type).catch(() => null));
      return ytIcons.get(type)!;
    };

    function entryIcon(e: Entry): HTMLElement | undefined {
      if (e.thumb) {
        const img = el('img', 'kyt-nav-avatar');
        img.loading = 'lazy';
        img.alt = '';
        img.src = e.thumb;
        return img;
      }
      if (!e.icon) return undefined;
      const name = FIGMA[e.icon.replace(/_CAIRO$/, '')];
      if (name) {
        const i = icon(name);
        i.dataset.name = name;
        return i;
      }
      const i = el('span', 'kyt-icon');
      i.style.visibility = 'hidden'; // until loaded; an empty mask paints a solid square
      ytIcon(e.icon).then((svg) => {
        if (!svg) return;
        setIconUrl(i, `data:image/svg+xml,${encodeURIComponent(svg)}`);
        i.classList.toggle('kyt-icon-color', svg.includes('fill="#')); // brand logos (Premium, Music, Kids) keep their colours
        i.style.visibility = '';
      });
      return i;
    }

    /** Page links are <a> (middle-click works); entries without a URL (Shorts) are buttons. */
    function link(e: Entry, cls = 'kyt-nav-link', ico = entryIcon(e)) {
      const a = el(e.url.startsWith('kyt:') ? 'button' : 'a', cls, ...(ico ? [ico] : []), el('span', 'kyt-nav-title', e.title));
      if (a instanceof HTMLAnchorElement) a.href = e.url;
      a.dataset.url = e.url;
      return a;
    }

    const open = new Set<string>(); // expanded dropdowns, by URL; survives re-renders
    let playlists: Promise<Entry[]> | undefined;

    async function fill(box: HTMLElement, children: NonNullable<Row['children']>) {
      const cls = 'kyt-nav-link kyt-nav-child';
      if (children === 'playlists') {
        playlists ??= call('playlists').catch((err) => (console.warn('kyt: playlists failed', err), []));
        box.replaceChildren(...(await playlists).map((c) => link(c, cls, icon('video-library'))));
      } else box.replaceChildren(...children.map((c) => link(c, cls)));
      setActive();
    }

    function item(row: Row) {
      const { entry, children } = row;
      const box = el('div', 'kyt-nav-item');
      if (entry.icon) box.dataset.icon = entry.icon; // shorts/style.css hides TAB_SHORTS
      const head = el('div', 'kyt-nav-row', row.toggle ? el('button', 'kyt-nav-link', ...[entryIcon(entry)!, el('span', 'kyt-nav-title', entry.title)]) : link(entry));
      box.append(head);
      if (!children) return box;

      const arrow = el('button', 'kyt-nav-arrow', icon('arrow-down'));
      arrow.ariaLabel = entry.title;
      const list = el('div', 'kyt-nav-list');
      head.append(el('span', 'kyt-nav-divider'), arrow);
      box.append(el('div', 'kyt-nav-children', list));
      const toggle = async (to: boolean) => {
        arrow.ariaExpanded = String(to);
        if (to) {
          open.add(entry.url);
          if (!list.childElementCount) await fill(list, children); // filled first, so the open animates to full height
        } else open.delete(entry.url);
        box.toggleAttribute('open', open.has(entry.url));
      };
      arrow.addEventListener('click', () => toggle(!box.hasAttribute('open')));
      if (row.toggle) head.firstElementChild!.addEventListener('click', () => toggle(!box.hasAttribute('open')));
      toggle(open.has(entry.url));
      return box;
    }

    // ---- expanded: [main groups] [hidden #sections and #footer] [foot], ordered by CSS ----
    // The foot is a reversed dropdown: the copyright line at the bottom opens "More from YouTube",
    // the settings section and YouTube's footer links above its divider.
    const main = el('div', 'kyt-nav-main');
    const footLinks = el('div', 'kyt-foot-links');
    const more = el('div', 'kyt-nav-list');
    const copyright = el('button', 'kyt-foot-toggle', `\u00a9 ${new Date().getFullYear()} Google LLC`);
    copyright.ariaExpanded = 'false';
    const foot = el('div', 'kyt-foot', el('div', 'kyt-nav-children', more), copyright);
    copyright.addEventListener('click', () => {
      copyright.ariaExpanded = String(foot.toggleAttribute('open'));
    });
    const nav = el('nav', 'kyt-nav', main, foot);

    // ---- collapsed: the same groups as icons, in place of YouTube's mini guide ----
    const mini = el('nav', 'kyt-mini');

    /** Explore has no page: open the full sidebar with Explore expanded. */
    function openExplore() {
      const explore = nav.querySelector('.kyt-nav-item[data-icon="EXPLORE"]');
      if (explore && !explore.hasAttribute('open')) explore.querySelector<HTMLElement>('.kyt-nav-arrow')!.click();
      document.querySelector<HTMLElement>(S.guideButton)?.click();
    }

    function onClick(ev: MouseEvent) {
      const url = (ev.target as Element).closest<HTMLElement>('[data-url]')?.dataset.url;
      if (!url || url.startsWith('http') || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      if (url === EXPLORE) openExplore();
      else call('navigate', url);
    }
    nav.addEventListener('click', onClick, { signal });
    mini.addEventListener('click', onClick, { signal });

    /** YouTube's footer (About, Press, ... Terms, Privacy) as plain links; its own #footer is hidden. */
    function setFooter(footer: Element) {
      footLinks.replaceChildren(...[...footer.querySelectorAll(':scope > [id^="guide-links"]')].map((line) =>
        el('div', 'kyt-foot-line', ...[...line.querySelectorAll('a')].map((a) => {
          const t = el('a', 'kyt-foot-link', a.textContent!.trim());
          t.href = a.href;
          return t;
        }))));
      const text = footer.querySelector('#copyright')?.textContent?.trim();
      if (text) copyright.textContent = text;
    }

    function miniItem({ entry }: Row) {
      const a = el(entry.url.startsWith('kyt:') ? 'button' : 'a', 'kyt-mini-link', ...[entryIcon(entry)].filter((x) => !!x));
      if (a instanceof HTMLAnchorElement) a.href = entry.url;
      a.dataset.url = entry.url;
      a.title = a.ariaLabel = entry.title;
      const box = el('div', 'kyt-nav-item', a);
      if (entry.icon) box.dataset.icon = entry.icon; // same hide rules as the expanded sidebar
      return box;
    }

    function render(n: Nav) {
      main.replaceChildren(...n.groups.map((g) => el('div', 'kyt-nav-group', ...g.map(item))));
      more.replaceChildren(...n.more.map((g) => el('div', 'kyt-nav-group', ...g.map((entry) => item({ entry })))), footLinks);
      mini.replaceChildren(...n.groups.map((g) => el('div', 'kyt-mini-group', ...g.map(miniItem))));
    }

    function setActive() {
      for (const a of [...nav.querySelectorAll<HTMLElement>('[data-url]'), ...mini.querySelectorAll<HTMLElement>('[data-url]')]) {
        const on = isHere(a.dataset.url!);
        if (on === (a.ariaCurrent === 'page')) continue;
        a.ariaCurrent = on ? 'page' : null;
        const ico = a.querySelector<HTMLElement>('.kyt-icon[data-name]');
        const name = ico?.dataset.name;
        if (ico && name && !NO_SELECTED.has(name)) setIcon(ico, on ? `${name}-selected` : name);
      }
    }

    let json = '';
    async function refresh() {
      const sections = await call('guide');
      if (!sections || signal.aborted) return;
      const j = JSON.stringify(sections);
      if (j !== json) {
        json = j;
        render(buildNav(sections));
      }
      setActive();
    }

    await refresh();
    if (!json || signal.aborted) return; // no data: YouTube's own sidebar stays
    document.addEventListener('kyt:navigate', refresh, { signal });

    // Each sidebar mounts when YouTube creates its host: the mini guide on narrow or collapsed layouts,
    // the full guide on wide pages or on the first ☰ click.
    waitFor(S.miniGuide, { signal, timeout: Infinity }).then((host) => {
      if (host) keep(mini, host, () => host.firstElementChild !== mini && host.prepend(mini), signal);
    });
    const drawer = await waitFor(S.guideDrawer, { signal });
    const guide = drawer && (await waitFor(S.guideRenderer, { root: drawer, signal, timeout: Infinity }));
    if (!guide) return;
    const footer = guide.querySelector(':scope > #footer');
    if (footer) setFooter(footer);
    keep(nav, guide, () => {
      const sections = guide.querySelector(':scope > #sections');
      if (sections && nav.nextElementSibling !== sections) sections.before(nav);
    }, signal);
  },
};
