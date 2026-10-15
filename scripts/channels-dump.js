// Paste into the DevTools console on https://www.youtube.com/feed/channels (signed in). Copies a compact JSON of the
// page's data to the clipboard: whether it still renders, what each channel entry carries (subscriber count, subscribe
// and bell commands), and how paging works. Answers PLAN.md Subscriptions step 2 (counts + working buttons).
(() => {
  const keys = (o) => (o && typeof o === 'object' ? Object.keys(o) : []);
  const text = (t) => t?.simpleText ?? t?.content ?? t?.runs?.map((r) => r.text).join('');
  // Shape of a value, depth-limited: keys and leaf types, strings cut short.
  const shape = (v, d = 0) => {
    if (v == null || typeof v !== 'object') return typeof v === 'string' ? v.slice(0, 80) : v;
    if (d > 5) return Array.isArray(v) ? `[${v.length}]` : `{${keys(v).join(',')}}`;
    if (Array.isArray(v)) return v.length ? [shape(v[0], d + 1), `…${v.length}`] : [];
    return Object.fromEntries(keys(v).map((k) => [k, shape(v[k], d + 1)]));
  };
  const browse = document.querySelector('ytd-browse:not([hidden])');
  const data = browse?.data ?? document.querySelector('ytd-app')?.data?.response;
  // Every renderer that looks like a channel entry, wherever it sits.
  const found = [];
  const walk = (o, path) => {
    if (!o || typeof o !== 'object' || found.length > 400) return;
    for (const [k, v] of Object.entries(o)) {
      if (/^(channelRenderer|gridChannelRenderer|lockupViewModel|channelListItemRenderer)$/.test(k)) found.push({ path: `${path}.${k}`, type: k, v });
      else if (/continuation/i.test(k)) found.push({ path: `${path}.${k}`, type: 'continuation', v });
      else walk(v, `${path}.${k}`);
    }
  };
  walk(data, 'data');
  const entries = found.filter((f) => f.type !== 'continuation');
  const out = {
    url: location.href,
    title: document.title,
    rendered: !!browse,
    pageSubtype: browse?.getAttribute('page-subtype'),
    topKeys: keys(data),
    entryTypes: [...new Set(entries.map((e) => e.type))],
    entryCount: entries.length,
    domCards: [...(browse?.querySelectorAll('ytd-channel-renderer, ytd-grid-channel-renderer, yt-lockup-view-model') ?? [])].length,
    sample: entries.slice(0, 2).map((e) => ({ path: e.path, shape: shape(e.v) })),
    quick: entries.slice(0, 8).map(({ v }) => ({
      title: text(v.title),
      subs: text(v.subscriberCountText) ?? text(v.videoCountText),
      subscribed: v.subscriptionButton?.subscribed ?? v.subscribeButton?.subscribeButtonRenderer?.subscribed,
      hasSubscribe: !!v.subscribeButton,
    })),
    continuations: found.filter((f) => f.type === 'continuation').slice(0, 3).map((f) => ({ path: f.path, shape: shape(f.v) })),
    header: shape(data?.header),
  };
  copy(JSON.stringify(out, null, 1));
  console.log('copied', out.entryCount, 'entries,', out.domCards, 'cards; paste into samples/feed-channels.json');
  return out;
})();
