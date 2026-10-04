import { find, innertube } from '../../page/youtube.ts';

// Page-world handlers of watch-later-btn (see main-world.ts): read and edit the Watch later playlist.

export const watchLater = {
  async inWatchLater(videoId: string) {
    const res = await innertube('playlist/get_add_to_playlist', { videoIds: [videoId] });
    return find(res, (x) => x.playlistId === 'WL' && 'containsSelectedVideos' in x)?.containsSelectedVideos === 'ALL';
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
