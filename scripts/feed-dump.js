// Paste into the DevTools console (signed in) on /feed/subscriptions or /feed/history, after scrolling down
// once so a continuation has loaded. Downloads kyt-<page>.json: the page's element tree (tags only), a few
// trimmed items, and each item's data shape (renderer type, date text) for the timeline feature.
(() => {
  const page = location.pathname.split('/').pop();
  const browse = document.querySelector('ytd-browse:not([hidden])');
  const tree = (el, depth = 0) => depth > 7 || !el ? null : {
    tag: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''),
    attrs: [...el.attributes].map((a) => a.name).filter((n) => !['class', 'id', 'style'].includes(n)).slice(0, 8),
    n: el.children.length,
    kids: [...el.children].slice(0, 3).map((k) => tree(k, depth + 1)),
  };
  const trim = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('path, g, defs, style, svg').forEach((n) => n.remove());
    c.querySelectorAll('img').forEach((i) => i.removeAttribute('src'));
    return c.outerHTML.replace(/\s{2,}/g, ' ').slice(0, 6000);
  };
  const text = (t) => t?.simpleText ?? t?.runs?.map((r) => r.text).join('') ?? t?.content;
  const shape = (el) => {
    const d = el.data ?? el.__data?.data;
    if (!d) return { tag: el.tagName.toLowerCase(), data: false };
    const [type, r] = Object.entries(d.content ?? d)[0] ?? [];
    return {
      tag: el.tagName.toLowerCase(), type, keys: r && Object.keys(r).slice(0, 25),
      published: text(r?.publishedTimeText), length: text(r?.lengthText), title: text(r?.title)?.slice(0, 40),
      // 2025 lockup view-model: dates sit in metadata rows
      lockupRows: r?.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows
        ?.map((row) => row.metadataParts?.map((p) => p.text?.content).join(' | ')),
      overlays: r?.contentImage?.thumbnailViewModel?.overlays?.map((o) => Object.keys(o)[0]),
    };
  };
  const items = [...(browse?.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-item-section-renderer, ytd-continuation-item-renderer') ?? [])];
  const headers = [...(browse?.querySelectorAll('ytd-item-section-renderer #header, ytd-item-section-header-renderer') ?? [])].map((h) => h.textContent.trim().replace(/\s+/g, ' ')).slice(0, 15);
  const out = {
    url: location.href, lang: document.documentElement.lang, width: innerWidth,
    tree: tree(browse), headers,
    counts: items.reduce((m, e) => ((m[e.tagName.toLowerCase()] = (m[e.tagName.toLowerCase()] ?? 0) + 1), m), {}),
    shapes: items.filter((e) => !e.matches('ytd-item-section-renderer')).slice(0, 40).map(shape),
    samples: items.filter((e) => !e.matches('ytd-item-section-renderer')).slice(0, 3).map(trim),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
  a.download = `kyt-${page}.json`;
  document.body.append(a); a.click(); a.remove();
  return `saved ${a.download}`;
})();
