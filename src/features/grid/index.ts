import { waitFor } from '../../core/dom.ts';
import type { Feature } from '../../core/feature.ts';
import { S } from '../../core/selectors.ts';

/**
 * Items per row of every rich grid: Home, Subscriptions, channel tabs. CSS only, except Home's Shorts shelf:
 * it draws just YouTube's own count of items, so page.ts raises that count.
 */
export const grid: Feature = {
  id: 'grid', label: 'Grid size', hint: 'Home, Subscriptions and channels', group: 'feeds', icon: 'grid', defaultOn: false,
  routes: ['home'],
  options: {
    videos: { type: 'number', label: 'Videos per row', default: 4, min: 2, max: 8, cssVar: '--kyt-grid-videos' },
    shorts: { type: 'number', label: 'Shorts per row', default: 6, min: 3, max: 10, cssVar: '--kyt-grid-shorts' },
  },
  async run({ signal, option, call }) {
    if (!(await waitFor(S.homeGrid, { signal, timeout: Infinity }))) return;
    let sent = 0;
    const send = () => {
      const n = Math.min(10, Math.max(3, Math.round(Number(option('shorts')) || 6)));
      if (n !== sent) call('shortsPerRow', S.homeGrid, (sent = n));
    };
    send();
    // Option changes land as the --kyt-grid-shorts property on <html>.
    const o = new MutationObserver(send);
    o.observe(document.documentElement, { attributeFilter: ['style'] });
    signal.addEventListener('abort', () => (o.disconnect(), call('shortsPerRow', S.homeGrid, 0)), { once: true });
  },
};
