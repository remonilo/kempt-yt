import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { iconUrl } from '../../core/icon.ts';
import { S } from '../../core/selectors.ts';
import type { Route } from '../../core/router.ts';
import { routeOf } from '../../core/router.ts';

// CSS can't build a url() from parts and the extension origin differs per install and browser, so each icon is a
// custom property on <html>: --kyt-i-<name>.
const NAMES = ['menu', 'arrow-left', 'search', 'mic', 'close', 'add', 'notifs', 'notifs-selected', 'notifs-disabled', 'more', 'you',
  'liked', 'liked-selected', 'dislike', 'dislike-selected', 'share', 'save', 'download', 'clip', 'ask', 'thanks'];

export const icons: Feature = {
  id: 'icons',
  label: 'Icons', group: 'look', icon: 'explore',
  defaultOn: true,
  run({ signal, call }) {
    // Synchronous, before the first paint with html[kyt-icons]: a mask without its var paints a solid square.
    const html = document.documentElement;
    for (const n of NAMES) html.style.setProperty(`--kyt-i-${n}`, `url("${iconUrl(n)}")`);
    signal.addEventListener('abort', () => NAMES.forEach((n) => html.style.removeProperty(`--kyt-i-${n}`)), { once: true });

    // Share, Save, Download and Clip are told apart by their stamped icon type (labels are localized).
    // The action row persists across watch pages, so one stamp per page load is enough.
    let stamped = false;
    const onRoute = async (route: Route) => {
      if (route !== 'watch') return;
      // The Subscribe button's bell state; idempotent per root, so every watch page is fine.
      waitFor(S.watchSubscribe, { signal }).then((el) => el && call('stampBell', S.watchSubscribe));
      if (stamped) return;
      stamped = true;
      if (await waitFor(S.watchActions, { signal })) await call('stamp', S.watchActions);
      else stamped = false; // retry on the next watch page
    };
    document.addEventListener('kyt:navigate', (e) => onRoute((e as CustomEvent<{ route: Route }>).detail.route), { signal });
    onRoute(routeOf(location.pathname));
  },
};
