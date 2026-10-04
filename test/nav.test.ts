import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNav, EXPLORE, type Entry, type Nav, type Section } from '../src/features/sidebar/nav.ts';

const e = (title: string, icon?: string, extra: Partial<Entry> = {}): Entry => ({ title, url: `/${title}`, icon, ...extra });
const titles = (nav: Nav) => nav.groups.map((g) => g.map((r) => r.entry.title));
const more = [
  { type: 'guideSectionRenderer', title: 'More from YouTube', entries: [e('Music app', 'YOUTUBE_MUSIC'), e('Kids', 'YOUTUBE_KIDS_ROUND')] },
  { type: 'guideSectionRenderer', title: '', entries: [e('Report history', 'FLAG_CAIRO')] },
];
const explore = { type: 'guideSectionRenderer', title: 'Explore', entries: [e('Music', 'MUSIC_CAIRO'), e('Gaming', 'GAMING_LOGO_CAIRO')] };

test('signed in (shape of a real guide output)', () => {
  const sections: Section[] = [
    { type: 'guideSectionRenderer', title: '', entries: [e('Home', 'TAB_HOME_CAIRO'), e('Shorts', 'TAB_SHORTS_CAIRO', { url: 'kyt:TAB_SHORTS_CAIRO' })] },
    { type: 'guideSubscriptionsSectionRenderer', title: '', entries: [
      e('Subscriptions', 'TAB_SUBSCRIPTIONS_CAIRO', { header: true }),
      e('chan1', undefined, { thumb: 'a.jpg' }),
      e('chan2', undefined, { thumb: 'b.jpg' }),
    ] },
    { type: 'guideSectionRenderer', title: '', entries: [
      e('You', 'ACCOUNT_CIRCLE_CAIRO', { header: true }),
      e('History', 'WATCH_HISTORY_CAIRO'),
      e('Playlists', 'PLAYLISTS_CAIRO'),
      e('Watch Later', 'WATCH_LATER_CAIRO'),
      e('Liked', 'LIKES_PLAYLIST_CAIRO'),
      e('Courses', 'COURSE_CAIRO', { header: true }),
      e('Courses', 'COURSE_CAIRO'),
    ] },
    explore,
    ...more,
  ];
  const nav = buildNav(sections);
  assert.deepEqual(titles(nav), [
    ['Home', 'Shorts', 'Explore'],
    ['You', 'History', 'Liked', 'Watch Later', 'Playlists', 'Courses'],
    ['Subscriptions'],
  ]);
  const [top, lib, subs] = nav.groups;
  assert.equal(top[2].entry.url, EXPLORE);
  assert.equal(top[2].toggle, true);
  assert.deepEqual((top[2].children as Entry[]).map((x) => x.title), ['Music', 'Gaming']);
  assert.equal(lib[4].children, 'playlists');
  assert.deepEqual((subs[0].children as Entry[]).map((x) => x.title), ['chan1', 'chan2']);
  assert.deepEqual(nav.more.map((g) => g.map((x) => x.title)), [['Music app', 'Kids'], ['Report history']]);
});

test('signed out: subscriptions is a plain row, promo section ignored', () => {
  const nav = buildNav([
    { type: 'guideSectionRenderer', title: '', entries: [
      e('Home', 'TAB_HOME_CAIRO'), e('Shorts', 'TAB_SHORTS_CAIRO'), e('Subscriptions', 'TAB_SUBSCRIPTIONS_CAIRO'),
      e('You', 'ACCOUNT_CIRCLE_CAIRO'), e('History', 'WATCH_HISTORY_CAIRO'),
    ] },
    { type: 'guideSigninPromoRenderer', title: '', entries: [] },
    explore,
    ...more,
  ]);
  assert.deepEqual(titles(nav), [['Home', 'Shorts', 'Explore'], ['You', 'History'], ['Subscriptions']]);
  assert.equal(nav.groups[2][0].children, undefined);
});

test('no "More" section: everything stays in the groups', () => {
  const nav = buildNav([{ type: 'guideSectionRenderer', title: '', entries: [e('Home', 'TAB_HOME_CAIRO')] }]);
  assert.deepEqual(titles(nav), [['Home']]);
  assert.deepEqual(nav.more, []);
});
