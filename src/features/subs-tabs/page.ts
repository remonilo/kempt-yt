import { endpoints, find, innertube, text, walk } from '../../page/youtube.ts';

export type Bell = 'all' | 'personalized' | 'none';

export interface SubChannel {
  id: string;
  title: string;
  url: string;
  thumb?: string;
  handle: string;
  /** "18.3m subscribers"; YouTube puts it in videoCountText (subscriberCountText holds the @handle). */
  subs: string;
  subscribed: boolean;
  bell: Bell | null;
  /** The bell menu's choices, in YouTube's order and words. */
  bells: { bell: Bell | null; label: string }[];
  /** YouTube's confirm text ("Unsubscribe from X?"), empty if the data had none. */
  confirm: string;
}

/** YouTube's own button and dialog words, so they follow the UI language. */
export interface SubWords {
  subscribe: string;
  subscribed: string;
  unsubscribe: string;
  cancel: string;
}

// Commands kept in the page world; the content side passes only channel ids.
const commands: Commands = new Map();

const BELLS: Record<string, Bell> = { NOTIFICATIONS_ACTIVE: 'all', NOTIFICATIONS_NONE: 'personalized', NOTIFICATIONS_OFF: 'none' };

// Used when an endpoint carries no apiUrl.
const API: Record<string, string> = {
  subscribeEndpoint: '/youtubei/v1/subscription/subscribe',
  unsubscribeEndpoint: '/youtubei/v1/subscription/unsubscribe',
  modifyChannelNotificationPreferenceEndpoint: '/youtubei/v1/notification/modify_channel_preference',
};

/** Sends a service endpoint the way YouTube's client does: its `*Endpoint` payload to its apiUrl. */
async function send(endpoint: any) {
  const key = Object.keys(endpoint ?? {}).find((k) => k in API);
  if (!key) throw new Error('kyt: no endpoint to send');
  const api: string = endpoint.commandMetadata?.webCommandMetadata?.apiUrl ?? API[key];
  return innertube(api.replace('/youtubei/v1/', ''), endpoint[key]);
}

const bellOf = (o: any): Bell | null => BELLS[(o?.buttonRenderer ?? o)?.icon?.iconType] ?? null;

type Commands = Map<string, { sub?: any; unsub?: any; bells: any[] }>;

/** Reads a FEchannels browse response. Pure, for tests; also registers each channel's link for `navigate`. */
export function parseChannels(res: any, commands: Commands = new Map()) {
  const words: SubWords = { subscribe: '', subscribed: '', unsubscribe: '', cancel: '' };
  const channels: SubChannel[] = [];
  for (const x of walk(res)) {
    const r = x.channelRenderer;
    if (!r?.channelId) continue;
    const nav = r.navigationEndpoint;
    const url: string = nav?.commandMetadata?.webCommandMetadata?.url ?? `/channel/${r.channelId}`;
    if (nav) endpoints.set(url, nav);
    const btn = r.subscribeButton?.subscribeButtonRenderer ?? {};
    const toggle = btn.notificationPreferenceButton?.subscriptionNotificationToggleButtonRenderer;
    const cur = toggle?.states?.find((s: any) => s.stateId === toggle.currentStateId)?.state;
    // The bell menu sits behind a command; its items are the ones that modify the preference.
    const items = [...walk(toggle?.command)].filter((i) => i.serviceEndpoint?.modifyChannelNotificationPreferenceEndpoint);
    const dialog = find(btn.onUnsubscribeEndpoints, (d) => d.confirmDialogRenderer)?.confirmDialogRenderer;
    commands.set(r.channelId, {
      sub: find(btn.onSubscribeEndpoints, (e) => e.subscribeEndpoint),
      unsub: find(btn.onUnsubscribeEndpoints, (e) => e.unsubscribeEndpoint),
      bells: items.map((i) => i.serviceEndpoint),
    });
    words.subscribe ||= text(btn.unsubscribedButtonText);
    words.subscribed ||= text(btn.subscribedButtonText);
    words.unsubscribe ||= text(btn.unsubscribeButtonText);
    words.cancel ||= text(dialog?.cancelButton?.buttonRenderer?.text);
    const thumbs = r.thumbnail?.thumbnails ?? [];
    const thumb: string | undefined = thumbs[thumbs.length - 1]?.url;
    channels.push({
      id: r.channelId,
      title: text(r.title),
      url,
      thumb: thumb?.startsWith('//') ? `https:${thumb}` : thumb,
      handle: text(r.subscriberCountText).startsWith('@') ? text(r.subscriberCountText) : '',
      subs: text(r.videoCountText),
      subscribed: !!(btn.subscribed ?? r.subscriptionButton?.subscribed),
      bell: bellOf(cur),
      bells: items.map((i) => ({ bell: BELLS[i.icon?.iconType] ?? null, label: text(i.text) })),
      confirm: text(dialog?.dialogMessages?.[0]),
    });
  }
  return { channels, words };
}

export const subsChannels = {
  /** Every subscribed channel from /feed/channels (FEchannels): one request, no paging (109 in one response). */
  async subsChannels() {
    return parseChannels(await innertube('browse', { browseId: 'FEchannels' }), commands);
  },

  async setSubscribed(id: string, on: boolean) {
    const c = commands.get(id);
    await send(on ? c?.sub : c?.unsub);
    return true;
  },

  async setBell(id: string, index: number) {
    await send(commands.get(id)?.bells[index]);
    return true;
  },
};
