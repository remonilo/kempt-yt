import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';
import { sortChips } from '../../core/sort-chips.ts';

/** Channel page tab row, Figma Channel 110:11316. The Playlists tab's Sort by dropdown becomes chips like Videos. */
export const channelTabs: Feature = {
  id: 'channel-tabs', label: 'Channel tabs', hint: 'Even spacing, search on the right, Playlists sort as chips', group: 'look', icon: 'search', defaultOn: true,
  routes: ['channel'],
  run({ signal }) {
    // Switching tabs or sort keeps the route, so restart per navigation.
    let page: AbortController | undefined;
    const start = () => {
      page?.abort();
      page = new AbortController();
      if (location.pathname.endsWith('/playlists')) mount(AbortSignal.any([signal, page.signal]));
    };
    start();
    document.addEventListener('kyt:navigate', start, { signal });
  },
};

async function mount(signal: AbortSignal) {
  const first = await waitFor(`${S.channelSubMenu} ${S.sortItems}`, { signal });
  const menu = first?.closest('ytd-channel-sub-menu-renderer');
  if (!menu || signal.aborted) return;
  sortChips(() => menu.querySelectorAll<HTMLElement>(S.sortItems), (row) => {
    if (row.parentElement !== menu) menu.prepend(row);
  }, menu, signal, { childList: true, subtree: true, attributeFilter: ['aria-selected'] });
}
