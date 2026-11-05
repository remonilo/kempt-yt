import type { Feature } from '../../core/feature.ts';

export const hideMerch: Feature = {
  id: 'hide-merch', label: 'Merch and offers', hint: 'Merch, tickets, fundraisers', group: 'hide', section: 'Watch page', icon: 'shopping', defaultOn: false,
  coveredBy: [['hide-secondary', 'watch-tabs']],
};
