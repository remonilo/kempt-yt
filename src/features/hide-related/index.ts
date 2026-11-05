import type { Feature } from '../../core/feature.ts';

export const hideRelated: Feature = {
  id: 'hide-related', label: 'Related videos', hint: 'Beside or under the video', group: 'hide', section: 'Watch page', icon: 'grid', defaultOn: false,
  coveredBy: ['hide-secondary'],
};
