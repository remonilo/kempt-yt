import type { Feature } from '../../core/feature.ts';

export const hideHomeChips: Feature = {
  id: 'hide-home-chips', label: 'Home chips', hint: 'Topic chips above the feed', group: 'hide', section: 'Home & feeds', icon: 'filter', defaultOn: false,
  coveredBy: ['hide-home-feed', 'subs-home'],
};
