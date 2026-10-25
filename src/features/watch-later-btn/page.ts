import { innertube, savePlaylists } from '../../page/youtube.ts';

export const watchLater = {
  async inWatchLater(videoId: string) {
    return (await savePlaylists(videoId)).some((p) => p.id === 'WL' && p.all);
  },

  async setWatchLater(videoId: string, add: boolean) {
    const action = add
      ? { action: 'ACTION_ADD_VIDEO', addedVideoId: videoId }
      : { action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID', removedVideoId: videoId };
    const res = await innertube('browse/edit_playlist', { playlistId: 'WL', actions: [action] });
    if (res.status !== 'STATUS_SUCCEEDED') throw new Error(`edit_playlist: ${res.status}`);
    return true;
  },
};
