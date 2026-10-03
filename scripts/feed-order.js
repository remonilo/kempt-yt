// Paste into the console on /feed/subscriptions (signed in), after scrolling down twice.
// Downloads kyt-subs-order.json: every grid child in DOM order with its shelf, video id and age text,
// to check whether the main grid is chronological and whether shelves duplicate or remove grid items.
(() => {
  const grid = document.querySelector('ytd-browse:not([hidden]) ytd-rich-grid-renderer > #contents');
  const text = (t) => t?.simpleText ?? t?.runs?.map((r) => r.text).join('') ?? t?.content;
  const info = (item) => {
    const d = item.data ?? item.__data?.data;
    const [type, r] = Object.entries(d?.content ?? d ?? {})[0] ?? [];
    const rows = r?.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
    return { type, id: r?.contentId ?? r?.entityId, meta: rows?.map((row) => row.metadataParts?.map((p) => p.text?.content).join(' | ')).join(' / ') };
  };
  const out = [...(grid?.children ?? [])].map((el, i) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'ytd-rich-section-renderer') {
      const d = el.data ?? el.__data?.data;
      const [type, r] = Object.entries(d?.content ?? {})[0] ?? [];
      return { i, tag, type, title: text(r?.title), hidden: el.hidden, items: [...el.querySelectorAll('ytd-rich-item-renderer')].map(info) };
    }
    return { i, tag, hidden: el.hidden || el.offsetParent === null, ...info(el) };
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ url: location.href, out }, null, 1)], { type: 'application/json' }));
  a.download = 'kyt-subs-order.json';
  document.body.append(a); a.click(); a.remove();
  return `saved ${out.length} children`;
})();
