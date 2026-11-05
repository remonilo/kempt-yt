import type { Feature } from '../../core/feature.ts';

export const hideAvatars: Feature = {
  id: 'hide-avatars', label: 'Comment avatars', hint: 'Profile photos in comments', group: 'hide', section: 'Watch page', icon: 'people', defaultOn: false,
  coveredBy: ['hide-comments', ['hide-secondary', 'watch-tabs']],
};
