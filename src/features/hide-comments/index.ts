import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

export const hideComments: Feature = {
  id: 'hide-comments', label: 'Comments', hint: 'Under videos', group: 'hide', icon: 'comments', defaultOn: false,
  coveredBy: [['hide-secondary', 'watch-tabs']], routes: ['watch'],
  // The fullscreen quick-action button opens an empty panel; it is found by its stamped icon type. The player persists.
  async run({ signal, call }) {
    if (await waitFor(S.fsActions, { signal })) await call('stamp', S.fsActions, 'hide-comments');
  },
};
