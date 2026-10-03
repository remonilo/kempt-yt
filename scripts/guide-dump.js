// Paste into the DevTools console on youtube.com (signed in). Copies a compact JSON of the sidebar's data to the clipboard.
(() => {
  const g = document.querySelector('ytd-guide-renderer');
  const url = (e) => e?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url;
  const text = (t) => t?.simpleText ?? t?.runs?.map((r) => r.text).join('');
  const entry = (it) => {
    const [type, r] = Object.entries(it)[0];
    const out = { type, title: r.formattedTitle?.simpleText ?? text(r.title) ?? r.title, icon: r.icon?.iconType, url: url(r), thumb: !!r.thumbnail, badge: r.badges && Object.keys(r.badges), presentation: r.presentationStyle };
    if (r.expandableItems) out.expandable = { count: r.expandableItems.length, sample: r.expandableItems.slice(0, 4).map(entry), last: entry(r.expandableItems.at(-1)) };
    if (r.headerEntry) out.header = entry(r.headerEntry);
    if (r.sectionItems) out.items = { count: r.sectionItems.length, all: r.sectionItems.map(entry) };
    if (r.expandableItems === undefined && r.items) out.items = { count: r.items.length, all: r.items.slice(0, 12).map(entry) };
    return out;
  };
  const d = g.data;
  const out = JSON.stringify({ keys: Object.keys(d), sections: d.items.map((s) => { const [type, r] = Object.entries(s)[0]; return { type, title: text(r.formattedTitle) ?? r.title, count: r.items?.length, items: r.items?.slice(0, 14).map(entry) }; }) }, null, 1);
  copy?.(out);
  return out;
})();
