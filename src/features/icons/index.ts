import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { iconUrl } from '../../core/icon.ts';
import { S } from '../../core/selectors.ts';
import type { Route } from '../../core/router.ts';
import { routeOf } from '../../core/router.ts';

// CSS can't build a url() from parts and the extension origin differs per install and browser, so each icon is a
// custom property on <html>: --kyt-i-<name>.
const NAMES = ['menu', 'arrow-left', 'search', 'mic', 'close', 'add', 'notifs', 'notifs-selected', 'notifs-disabled', 'more', 'you',
  'liked', 'liked-selected', 'dislike', 'dislike-selected', 'share', 'save', 'download', 'clip', 'ask', 'thanks',
  // popup menus: account menu and the watch page's ⋯ menu
  'report', 'arrow-right', 'keyboard', 'settings', 'help', 'feedback', 'switch-account', 'sign-out', 'studio', 'your-data',
  'appearance', 'language', 'restricted', 'globe',
  'add-to-queue', 'watch-later', 'not-interested', 'exclude', 'hide',
  // player controls and its settings menu
  'play', 'pause', 'backward', 'next', 'volume', 'volume-muted', 'cc', 'cc-selected', 'theater', 'theater-selected',
  'fullscreen', 'fullscreen-selected', 'pip', 'cast', 'ambient-mode', 'annotations', 'sleep-timer', 'speed', 'quality-hd',
  'stable-audio', 'audio-channel', 'comments',
  // channel header, About dialog (...more), posts
  'link', 'info', 'date', 'mail', 'phone', 'people', 'views', 'your-videos',
  // History's right column, playlist menus
  'delete', 'edit', 'eye', 'image', 'repeat', 'repeat-one', 'shuffle', 'arrow-down'];

export const icons: Feature = {
  id: 'icons',
  label: 'Icons', group: 'look', icon: 'explore',
  defaultOn: true,
  run({ signal, call }) {
    const run = signal;
    // Synchronous, before the first paint with html[kyt-icons]: a mask without its var paints a solid square.
    const html = document.documentElement;
    for (const n of NAMES) html.style.setProperty(`--kyt-i-${n}`, `url("${iconUrl(n)}")`);
    signal.addEventListener('abort', () => NAMES.forEach((n) => html.style.removeProperty(`--kyt-i-${n}`)), { once: true });

    // Menu rows (account menu, ⋯ menu) are stamped with their icon type once the popup container exists.
    waitFor(S.popups, { signal }).then((el) => el && call('stampMenus', S.popups, 'icons'));

    // Share, Save, Download and Clip are told apart by their stamped icon type (labels are localized).
    // The action row persists across watch pages, so one stamp per page load is enough.
    let stamped = false;
    let page: AbortController | undefined;
    const onRoute = async (route: Route) => {
      // The waits below observe the whole document: stop them when the user moves on.
      page?.abort();
      page = new AbortController();
      const signal = AbortSignal.any([run, page.signal]);
      // History's right column (Search, Clear all, Pause, Manage); stamp is idempotent per root.
      if (route === 'history') waitFor(S.historyActions, { signal }).then((el) => el && call('stamp', S.historyActions, 'icons'));
      // Channel header Subscribe bell; a new header per channel, stampBell is idempotent per root.
      if (route === 'channel') waitFor(S.channelHeader, { signal }).then((el) => el && call('stampBell', S.channelHeader, 'icons'));
      if (route !== 'watch') return;
      // The Subscribe button's bell state; idempotent per root, so every watch page is fine.
      waitFor(S.watchSubscribe, { signal }).then((el) => el && call('stampBell', S.watchSubscribe, 'icons'));
      // Fullscreen quick actions live in the player, which persists; stamp is idempotent per root.
      waitFor(S.fsActions, { signal }).then((el) => el && call('stamp', S.fsActions, 'icons'));
      if (stamped) return;
      stamped = true;
      if (await waitFor(S.watchActions, { signal })) await call('stamp', S.watchActions, 'icons');
      else stamped = false; // retry on the next watch page
    };
    document.addEventListener('kyt:navigate', (e) => onRoute((e as CustomEvent<{ route: Route }>).detail.route), { signal });
    onRoute(routeOf(location.pathname));
  },
};
