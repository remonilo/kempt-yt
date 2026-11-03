import type { Feature } from '../../core/feature.ts';

export const hideComments: Feature = {
  id: 'hide-comments', label: 'Comments', hint: 'Under videos', group: 'hide', icon: 'comments', defaultOn: false,
  coveredBy: [['hide-secondary', 'watch-tabs']],
};
