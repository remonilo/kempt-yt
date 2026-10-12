import type { Feature } from '../../core/feature.ts';
import { onCommentsPanel } from '../../core/comments-panel.ts';
import { el, keep, waitFor } from '../../core/dom.ts';
import { routeOf, type Route } from '../../core/router.ts';
import { S } from '../../core/selectors.ts';

const ITEMS = 'tp-yt-paper-listbox > a';
const HEADER_ITEMS = `#sort-menu ${ITEMS}`;

// Each chip clicks the matching item in the hidden dropdown, so YouTube still does the reload.
// Labels come from the dropdown items, so they follow the UI language.
export const commentSort: Feature = {
  id: 'comment-sort',
  label: 'Comment sort as buttons', group: 'watch', icon: 'sort',
  defaultOn: true,
  routes: ['watch', 'post'],
  run({ signal }) {
    // The watch page keeps its comments header across videos. A post page may not, and post -> post keeps the
    // feature running (same route), so restart per post.
    let page: AbortController | undefined;
    const post = () => {
      page?.abort();
      page = new AbortController();
      mount(AbortSignal.any([signal, page.signal]));
    };
    if (routeOf(location.pathname) === 'post') post();
    else {
      mount(signal);
      onCommentsPanel(signal, mountPanel);
    }
    document.addEventListener('kyt:navigate', (e) => {
      if ((e as CustomEvent<{ route: Route }>).detail.route === 'post') post();
    }, { signal });
  },
};

/** A chip per dropdown item; `items()` lists the current items, `place(row)` puts the row in the page. */
function chips(items: () => NodeListOf<HTMLElement> | [], place: (row: HTMLElement) => void, root: Node,
  signal: AbortSignal, init?: MutationObserverInit) {
  const row = el('div', 'kyt-sort');
  row.role = 'group';
  row.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button');
    if (b) items()[[...row.children].indexOf(b)]?.click();
  }, { signal });
  keep(row, root, () => {
    const list = items();
    if (!list.length) return;
    place(row);
    list.forEach((a, i) => {
      const b = row.children[i] ?? row.appendChild(el('button', 'kyt-chip'));
      const label = a.querySelector('.item')?.textContent?.trim() ?? '';
      if (b.textContent !== label) b.textContent = label;
      const on = a.getAttribute('aria-selected') ?? 'false';
      if (b.ariaPressed !== on) b.ariaPressed = on;
    });
    while (row.children.length > list.length) row.lastElementChild?.remove();
  }, signal, init);
}

async function mount(signal: AbortSignal) {
  // Comments render lazily (when scrolled to, or when their tab opens), so no timeout. On the watch page only the
  // comments element is observed, not every player tick.
  const scope = routeOf(location.pathname) === 'watch' ? await waitFor(S.comments, { signal }) : document;
  if (!scope) return;
  const first = await waitFor(`:is(ytd-watch-flexy, ytd-browse:not([hidden])) ytd-comments-header-renderer ${HEADER_ITEMS}`, { root: scope, signal, timeout: Infinity });
  // YouTube swaps the header renderer (post pages re-render it on every visit) but keeps its #header container,
  // so the row follows whichever header is current.
  const root = first?.closest('ytd-comments-header-renderer')?.parentElement;
  if (!root || signal.aborted) return;
  const header = () => root.querySelector('ytd-comments-header-renderer');
  chips(() => header()?.querySelectorAll<HTMLElement>(HEADER_ITEMS) ?? [], (row) => {
    const menu = header()?.querySelector('#sort-menu');
    if (menu && menu.nextElementSibling !== row) menu.after(row);
  }, root, signal, { childList: true, subtree: true, attributeFilter: ['aria-selected'] });
}

// The comments panel (fullscreen, narrow windows) sorts from its title bar's icon menu. The row goes under the title.
function mountPanel(title: Element, _panel: Element, signal: AbortSignal) {
  chips(() => title.querySelectorAll<HTMLElement>(S.panelSortItems), (row) => {
    const sub = title.querySelector('#subheader');
    if (sub && row.parentElement !== sub) sub.prepend(row);
  }, title, signal, { childList: true, subtree: true, attributeFilter: ['aria-selected'] });
}
