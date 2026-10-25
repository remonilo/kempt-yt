import type { Feature } from '../../core/feature.ts';
import { onCommentsPanel } from '../../core/comments-panel.ts';
import { waitFor } from '../../core/dom.ts';
import { eachRoute, routeOf } from '../../core/router.ts';
import { S } from '../../core/selectors.ts';
import { sortChips } from '../../core/sort-chips.ts';

const HEADER_ITEMS = S.sortItems;

export const commentSort: Feature = {
  id: 'comment-sort',
  label: 'Comment sort as buttons', group: 'watch', icon: 'sort',
  defaultOn: true,
  routes: ['watch', 'shorts', 'post'],
  run({ signal }) {
    eachRoute(signal, (route, s) => {
      if (route === 'watch') mount(s);
      if (route !== 'post') return onCommentsPanel(s, mountPanel);
      // The watch page keeps its comments header across videos. A post page may not, and post -> post keeps the
      // route, so restart per post.
      let page: AbortController | undefined;
      const post = () => {
        page?.abort();
        page = new AbortController();
        mount(AbortSignal.any([s, page.signal]));
      };
      post();
      document.addEventListener('kyt:navigate', post, { signal: s });
    });
  },
};

async function mount(signal: AbortSignal) {
  // Comments render lazily (when scrolled to, or when their tab opens), so no timeout. On the watch page only the
  // comments element is observed, not every player tick.
  const scope = routeOf(location.pathname) === 'watch' ? await waitFor(S.comments, { signal }) : document;
  if (!scope) return;
  const first = await waitFor(`${S.pageCommentsHeader} ${HEADER_ITEMS}`, { root: scope, signal, timeout: Infinity });
  // YouTube swaps the header renderer (post pages re-render it on every visit) but keeps its #header container,
  // so the row follows whichever header is current.
  const root = first?.closest(S.commentsHeader)?.parentElement;
  if (!root || signal.aborted) return;
  const header = () => root.querySelector(S.commentsHeader);
  sortChips(() => header()?.querySelectorAll<HTMLElement>(HEADER_ITEMS) ?? [], (row) => {
    const menu = header()?.querySelector('#sort-menu');
    if (menu && menu.nextElementSibling !== row) menu.after(row);
  }, root, signal, { childList: true, subtree: true, attributeFilter: ['aria-selected'] });
}

// The comments panel (fullscreen, narrow windows) sorts from its title bar's icon menu. The row goes under the title.
function mountPanel(title: Element, _panel: Element, signal: AbortSignal) {
  sortChips(() => title.querySelectorAll<HTMLElement>(S.panelSortItems), (row) => {
    const sub = title.querySelector('#subheader');
    if (sub && row.parentElement !== sub) sub.prepend(row);
  }, title, signal, { childList: true, subtree: true, attributeFilter: ['aria-selected'] });
}
