import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChannels } from '../src/features/subs-tabs/page.ts';

// Shape from samples/feed-channels.json (signed-in dump of /feed/channels), trimmed; the bell menu shape is YouTube's
// menuServiceItemRenderer list behind the toggle's command.
const bellItem = (iconType: string, label: string) => ({
  menuServiceItemRenderer: {
    text: { runs: [{ text: label }] },
    icon: { iconType },
    serviceEndpoint: { modifyChannelNotificationPreferenceEndpoint: { params: iconType } },
  },
});
const channel = {
  channelId: 'UCq6',
  title: { simpleText: 'penguinz0' },
  navigationEndpoint: { commandMetadata: { webCommandMetadata: { url: '/@penguinz0' } }, browseEndpoint: { browseId: 'UCq6' } },
  thumbnail: { thumbnails: [{ url: '//yt3.googleusercontent.com/a=s88-c' }, { url: '//yt3.googleusercontent.com/a=s176-c' }] },
  videoCountText: { simpleText: '18.3m subscribers' },
  subscriberCountText: { simpleText: '@penguinz0' },
  subscribeButton: {
    subscribeButtonRenderer: {
      subscribed: true,
      subscribedButtonText: { runs: [{ text: 'Subscribed' }] },
      unsubscribedButtonText: { runs: [{ text: 'Subscribe' }] },
      unsubscribeButtonText: { runs: [{ text: 'Unsubscribe' }] },
      notificationPreferenceButton: {
        subscriptionNotificationToggleButtonRenderer: {
          states: [
            { stateId: 0, nextStateId: 0, state: { buttonRenderer: { icon: { iconType: 'NOTIFICATIONS_NONE' } } } },
            { stateId: 2, nextStateId: 2, state: { buttonRenderer: { icon: { iconType: 'NOTIFICATIONS_ACTIVE' } } } },
          ],
          currentStateId: 2,
          command: { commandExecutorCommand: { commands: [{ openPopupAction: { popup: { menuPopupRenderer: { items: [
            bellItem('NOTIFICATIONS_ACTIVE', 'All'), bellItem('NOTIFICATIONS_NONE', 'Personalized'), bellItem('NOTIFICATIONS_OFF', 'None'),
          ] } } } }] } },
        },
      },
      onSubscribeEndpoints: [{ subscribeEndpoint: { channelIds: ['UCq6'], params: 'x' } }],
      onUnsubscribeEndpoints: [{ signalServiceEndpoint: { actions: [{ openPopupAction: { popup: { confirmDialogRenderer: {
        dialogMessages: [{ runs: [{ text: 'Unsubscribe from penguinz0?' }] }],
        cancelButton: { buttonRenderer: { text: { runs: [{ text: 'Cancel' }] } } },
        confirmButton: { buttonRenderer: { serviceEndpoint: { unsubscribeEndpoint: { channelIds: ['UCq6'], params: 'y' } } } },
      } } } }] } }],
    },
  },
};
const res = { contents: { twoColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { content: { items: [{ channelRenderer: channel }] } } }] } } };

test('parseChannels: count, handle swap, bell state and menu, YouTube words', () => {
  const commands = new Map();
  const { channels, words } = parseChannels(res, commands);
  assert.equal(channels.length, 1);
  const [c] = channels;
  assert.equal(c.url, '/@penguinz0');
  assert.equal(c.thumb, 'https://yt3.googleusercontent.com/a=s176-c');
  assert.equal(c.handle, '@penguinz0');
  assert.equal(c.subs, '18.3m subscribers');
  assert.equal(c.subscribed, true);
  assert.equal(c.bell, 'all');
  assert.deepEqual(c.bells.map((b) => b.bell), ['all', 'personalized', 'none']);
  assert.equal(c.bells[1].label, 'Personalized');
  assert.equal(c.confirm, 'Unsubscribe from penguinz0?');
  assert.deepEqual(words, { subscribe: 'Subscribe', subscribed: 'Subscribed', unsubscribe: 'Unsubscribe', cancel: 'Cancel' });
  const cmd = commands.get('UCq6');
  assert.ok(cmd.sub.subscribeEndpoint && cmd.unsub.unsubscribeEndpoint);
  assert.equal(cmd.bells.length, 3);
});
