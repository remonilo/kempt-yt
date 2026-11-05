import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

export const hideSubs: Feature = {
  id: 'hide-subs', label: 'Subscriptions', hint: 'Sidebar entry, channel list and feed', group: 'hide', section: 'Top bar & sidebar', icon: 'subs', defaultOn: false,
  run({ signal, call }) {
    for (const sel of [S.guide, S.miniGuide])
      waitFor(sel, { signal }).then((el) => el && call('stamp', sel, 'hide-subs'));
  },
};
