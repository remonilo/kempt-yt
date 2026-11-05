import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

export const hideSecondary: Feature = {
  id: 'hide-secondary', label: 'Watch column', hint: 'All beside the video, tabs too', group: 'hide', section: 'Watch page', icon: 'list', defaultOn: false,
  routes: ['watch'],
  // The fullscreen Show chat / Comments buttons open the column's parts; found by stamped icon type. The player persists.
  async run({ signal, call }) {
    if (await waitFor(S.fsActions, { signal })) await call('stamp', S.fsActions, 'hide-secondary');
  },
};
