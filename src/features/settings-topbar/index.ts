import type { Feature } from '../../core/feature.ts';
import { el, keep, waitFor } from '../../core/dom.ts';
import { icon } from '../../core/icon.ts';
import { S } from '../../core/selectors.ts';
import { local } from '../../core/i18n.ts';

/** YouTube's name for its settings page. */
const WORDS = {
  en: 'Settings', es: 'Configuración', pt: 'Configurações', de: 'Einstellungen', fr: 'Paramètres', ru: 'Настройки',
  ja: '設定', ko: '설정', hi: 'सेटिंग', id: 'Setelan', tr: 'Ayarlar',
};

export const settingsTopbar: Feature = {
  id: 'settings-topbar',
  label: 'Settings in top bar', group: 'navigation', icon: 'settings',
  defaultOn: true,
  async run({ signal, call }) {
    if (!(await call('signedIn'))) return console.info('kyt: signed out, settings-topbar off');
    const masthead = await waitFor(S.masthead, { signal });
    if (!masthead) return;
    const a = el('a', 'kyt-settings', icon('settings'));
    a.href = '/account'; // ponytail: full page load; SPA navigation if it ever feels slow
    a.title = a.ariaLabel = local(WORDS);
    keep(a, masthead, () => {
      const avatar = masthead.querySelector(S.mastheadMenu);
      if (avatar && a.nextElementSibling !== avatar) avatar.before(a);
    }, signal);
  },
};
