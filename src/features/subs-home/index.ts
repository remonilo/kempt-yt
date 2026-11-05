import type { Feature } from '../../core/feature.ts';

const SUBS = '/feed/subscriptions';

export const subsHome: Feature = {
  id: 'subs-home', label: 'Subscriptions as Home', hint: 'Home and the logo open Subscriptions', group: 'hide', section: 'Home & feeds', icon: 'subs',
  defaultOn: false,
  run({ signal, call }) {
    // Clicks on Home links (logo, guide): go straight to Subscriptions, Home never renders.
    window.addEventListener('click', (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href]');
      if (!a || a.origin !== location.origin || a.pathname !== '/') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      call('navigate', SUBS);
    }, { capture: true, signal });

    // Typed URLs, Back, and YouTube navigating on its own.
    const onPage = () => location.pathname === '/' && location.replace(SUBS);
    onPage();
    document.addEventListener('kyt:navigate', onPage, { signal });
  },
};
