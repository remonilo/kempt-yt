import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { routeOf, shortsId } from '../../core/router.ts';
import { S } from '../../core/selectors.ts';

const watchUrl = (path: string) => {
  const id = shortsId(path);
  return id && `/watch?v=${id}`;
};

// style.css hides Shorts shelves and cards. This file sends every Shorts link to the normal player.
export const shorts: Feature = {
  id: 'shorts',
  label: 'Hide Shorts, open them as normal videos',
  defaultOn: true,
  async run({ signal, call }) {
    // Clicks inside YouTube: SPA jump straight to /watch, the Shorts player never loads.
    window.addEventListener('click', (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href*="/shorts/"]');
      const url = a && watchUrl(a.pathname);
      if (!url) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      call('navigate', url);
    }, { capture: true, signal });

    // Everything else (typed or external links, new tabs, YouTube navigating on its own): replace the page.
    // Runs at document_start on a direct load, before the Shorts player starts.
    const onPage = () => {
      const url = watchUrl(location.pathname);
      if (url) return location.replace(url);
      if (routeOf(location.pathname) === 'channel')
        waitFor(S.channelTabs, { signal }).then((el) => el && call('stampTabs', S.channelTabs));
    };
    onPage();
    document.addEventListener('kyt:navigate', onPage, { signal });

    for (const sel of [S.guide, S.miniGuide])
      waitFor(sel, { signal }).then((el) => el && call('stamp', sel));
  },
};
