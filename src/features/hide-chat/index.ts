import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

export const hideChat: Feature = {
  id: 'hide-chat', label: 'Live chat', hint: 'Next to streams and replays', group: 'hide', icon: 'chat', defaultOn: false,
  coveredBy: ['hide-secondary'], routes: ['watch'],
  // The fullscreen quick-action button opens an empty panel; it is found by its stamped icon type. The player persists.
  async run({ signal, call }) {
    if (await waitFor(S.fsActions, { signal })) await call('stamp', S.fsActions, 'hide-chat');
  },
};
