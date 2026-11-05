import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

export const hideExplore: Feature = {
  id: 'hide-explore', label: 'Explore', hint: 'Music, Gaming, News in the sidebar', group: 'hide', section: 'Top bar & sidebar', icon: 'explore', defaultOn: false,
  run({ signal, call }) {
    // YouTube's own guide (sidebar off): its sections are told apart by the stamped icon types.
    waitFor(S.guide, { signal }).then((el) => el && call('stamp', S.guide, 'hide-explore'));
  },
};
