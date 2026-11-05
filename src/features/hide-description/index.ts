import type { Feature } from '../../core/feature.ts';

export const hideDescription: Feature = {
  id: 'hide-description', label: 'Description', hint: 'Under the video', group: 'hide', section: 'Watch page', icon: 'info', defaultOn: false,
  coveredBy: [['hide-secondary', 'watch-tabs']],
};
