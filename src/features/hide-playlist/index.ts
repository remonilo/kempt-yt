import type { Feature } from '../../core/feature.ts';

export const hidePlaylist: Feature = {
  id: 'hide-playlist', label: 'Playlist panel', hint: 'Next to the video', group: 'hide', section: 'Watch page', icon: 'playlists', defaultOn: false,
  coveredBy: ['hide-secondary'],
};
