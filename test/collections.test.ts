import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromStorage, hashRoute, sortVideos } from '../src/features/subs-tabs/collections.ts';
import { parseChannelVideos } from '../src/features/subs-tabs/page.ts';

test('fromStorage: only collection keys, oldest first, bad data tolerated', () => {
  const list = fromStorage({
    'kempt-yt': { features: {} },
    'kempt-yt-collection:b': { name: 'B', channels: ['UC2', 3], order: 2 },
    'kempt-yt-collection:a': { name: 'A', channels: ['UC1'], order: 1 },
    'kempt-yt-collection:x': null,
    'kempt-yt-collection:y': { order: 3 },
  });
  assert.deepEqual(list, [
    { id: 'a', name: 'A', channels: ['UC1'], order: 1 },
    { id: 'b', name: 'B', channels: ['UC2'], order: 2 },
    { id: 'y', name: '', channels: [], order: 3 },
  ]);
});

test('hashRoute', () => {
  assert.deepEqual(hashRoute('#collections'), { tab: 'collections' });
  assert.deepEqual(hashRoute('#collection=mw5ijr9m'), { feed: 'mw5ijr9m' });
  assert.equal(hashRoute(''), null);
  assert.equal(hashRoute('#collection='), null);
  assert.equal(hashRoute('#t=30'), null);
});

test('sortVideos: newest first, duplicates dropped, unreadable ages last', () => {
  const v = (id: string, ageLong: string, live = false) => ({ id, ageLong, live });
  const out = sortVideos([v('a', '3 days ago'), v('b', 'Premieres soon'), v('c', '5 hours ago'), v('a', '3 days ago'), v('d', '2 weeks ago'), v('e', '2.2K watching', true)], new Date(2026, 10, 7, 12));
  assert.deepEqual(out.map((x) => x.id), ['e', 'c', 'a', 'd', 'b']);
});

test('parseChannelVideos: lockups to cards, long age kept for grouping', () => {
  const lockup = (id: string, type = 'LOCKUP_CONTENT_TYPE_VIDEO') => ({
    lockupViewModel: {
      contentId: id,
      contentType: type,
      contentImage: { thumbnailViewModel: {
        image: { sources: [{ url: 'small' }, { url: 'big' }] },
        overlays: [{ thumbnailBottomOverlayViewModel: { badges: [{ thumbnailBadgeViewModel: { text: '6:01' } }] } }],
      } },
      metadata: { lockupMetadataViewModel: {
        title: { content: `Video ${id}` },
        metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [
          { text: { content: '577K' }, accessibilityLabel: '577 thousand views' },
          { text: { content: '5h ago' }, accessibilityLabel: '5 hours ago' },
        ] }] } },
      } },
    },
  });
  const res = { contents: { tabs: [{ items: [lockup('v1'), lockup('p1', 'LOCKUP_CONTENT_TYPE_PLAYLIST')] }] } };
  assert.deepEqual(parseChannelVideos(res), [
    { id: 'v1', title: 'Video v1', thumb: 'big', duration: '6:01', views: '577K', age: '5h ago', ageLong: '5 hours ago', live: false },
  ]);
});
