// Paste into the DevTools console on https://www.youtube.com/feed/playlists or a /playlist?list= page (signed in), or
// run with ext.mjs --dump. Copies compact JSON: header data, entry renderer types and shapes, row menu items, sort and
// filter chips, and the DOM tags that render them. Answers PLAN.md Playlist pages redesign (per-row date, likes, bulk).
(() => {
  const keys = (o) => (o && typeof o === 'object' ? Object.keys(o) : []);
  const text = (t) => t?.simpleText ?? t?.content ?? t?.runs?.map((r) => r.text).join('');
  const shape = (v, d = 0) => {
    if (v == null || typeof v !== 'object') return typeof v === 'string' ? v.slice(0, 80) : v;
    if (d > 6) return Array.isArray(v) ? `[${v.length}]` : `{${keys(v).join(',')}}`;
    if (Array.isArray(v)) return v.length ? [shape(v[0], d + 1), `…${v.length}`] : [];
    return Object.fromEntries(keys(v).map((k) => [k, shape(v[k], d + 1)]));
  };
  const browse = document.querySelector('ytd-browse:not([hidden])');
  const data = browse?.data;
  const ENTRY = /^(playlistVideoRenderer|lockupViewModel|gridPlaylistRenderer|playlistRenderer|richItemRenderer)$/;
  const found = [];
  const menus = new Set();
  const walk = (o, path) => {
    if (!o || typeof o !== 'object' || found.length > 400) return;
    for (const [k, v] of Object.entries(o)) {
      if (k === 'richItemRenderer') walk(v, `${path}.${k}`);
      else if (ENTRY.test(k)) found.push({ path: `${path}.${k}`, type: k, v });
      else if (/continuation/i.test(k)) found.push({ path: `${path}.${k}`, type: 'continuation', v });
      else walk(v, `${path}.${k}`);
    }
  };
  walk(data?.contents, 'contents');
  // Menu item labels and icon/endpoint kinds, from whatever menu shape a row carries.
  const menuOf = (v) => {
    const items = v?.menu?.menuRenderer?.items ?? [];
    return items.map((i) => {
      const r = i.menuServiceItemRenderer ?? i.menuNavigationItemRenderer ?? Object.values(i)[0];
      const ep = r?.serviceEndpoint ?? r?.navigationEndpoint ?? {};
      return `${text(r?.text)} [${r?.icon?.iconType}] ${keys(ep).filter((k) => k !== 'clickTrackingParams' && k !== 'commandMetadata').join(',')}`;
    });
  };
  const entries = found.filter((f) => f.type !== 'continuation');
  for (const e of entries) for (const m of menuOf(e.v)) menus.add(m);
  const tags = (root) => {
    const seen = {};
    for (const el of root?.querySelectorAll('*') ?? []) {
      const t = el.tagName.toLowerCase();
      if (t.includes('-') && !t.startsWith('yt-icon') && !t.startsWith('tp-yt')) seen[t] = (seen[t] ?? 0) + 1;
    }
    return seen;
  };
  const out = {
    url: location.href,
    pageSubtype: browse?.getAttribute('page-subtype'),
    topKeys: keys(data),
    header: shape(data?.header),
    sidebar: shape(data?.sidebar),
    entryTypes: [...new Set(entries.map((e) => e.type))],
    entryCount: entries.length,
    sample: entries.slice(0, 2).map((e) => ({ path: e.path, shape: shape(e.v) })),
    quick: entries.slice(0, 6).map(({ v }) => ({
      title: text(v.title),
      owner: text(v.shortBylineText),
      info: v.videoInfo ? text(v.videoInfo) : undefined,
      length: text(v.lengthText),
      editable: v.isEditable,
      setVideoId: v.setVideoId,
    })),
    rowMenu: [...menus],
    continuations: found.filter((f) => f.type === 'continuation').slice(0, 2).map((f) => ({ path: f.path, shape: shape(f.v) })),
    domTags: tags(browse),
  };
  copy(JSON.stringify(out, null, 1));
  console.log('copied', out.entryCount, 'entries', out.entryTypes);
  return out;
})();
