import type { Feature } from '../../core/feature.ts';
import { keep, waitFor } from '../../core/dom.ts';
import { icon } from '../../core/icon.ts';
import { S } from '../../core/selectors.ts';

export const settingsTopbar: Feature = {
  id: 'settings-topbar',
  label: 'Settings in top bar', group: 'navigation', icon: 'settings',
  defaultOn: true,
  async run({ signal, call }) {
    if (!(await call('signedIn'))) return console.info('kyt: signed out, settings-topbar off');
    const masthead = await waitFor(S.masthead, { signal });
    if (!masthead) return;
    const a = document.createElement('a');
    a.href = '/account'; // ponytail: full page load; SPA navigation if it ever feels slow
    a.className = 'kyt-settings';
    a.title = a.ariaLabel = 'Settings';
    a.append(icon('settings'));
    keep(a, masthead, () => {
      const avatar = masthead.querySelector(S.mastheadMenu);
      if (avatar && a.nextElementSibling !== avatar) avatar.before(a);
    }, signal);
  },
};
