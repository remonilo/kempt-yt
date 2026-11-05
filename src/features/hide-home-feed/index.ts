import type { Feature } from '../../core/feature.ts';

export const hideHomeFeed: Feature = {
  id: 'hide-home-feed', label: 'Home feed', hint: 'Recommendations on Home', group: 'hide', section: 'Home & feeds', icon: 'home', defaultOn: false,
  coveredBy: ['subs-home'],
};
