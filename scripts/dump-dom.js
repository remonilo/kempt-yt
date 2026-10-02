// Paste into the DevTools console on youtube.com. Downloads a trimmed DOM sample as kyt-<page>.html.
// Strips SVG paths, image URLs, and long lists so the output stays small.
(() => {
  const sels = {
    masthead: 'ytd-masthead',
    guide: 'ytd-guide-renderer #sections',
    miniGuide: 'ytd-mini-guide-renderer',
    chips: 'ytd-feed-filter-chip-bar-renderer',
    owner: 'ytd-watch-metadata #owner',
    actions: 'ytd-watch-metadata #actions',
    secondary: 'ytd-watch-flexy #secondary-inner',
    comments: 'ytd-comments#comments #header',
  };
  const out = [`<!-- ${location.href} dark=${document.documentElement.hasAttribute('dark')} -->`];
  for (const [name, sel] of Object.entries(sels)) {
    const el = document.querySelector(sel);
    if (!el) { out.push(`<!-- ${name}: not found -->`); continue; }
    const c = el.cloneNode(true);
    c.querySelectorAll('path, g, defs, style').forEach((n) => n.remove());
    c.querySelectorAll('img').forEach((i) => i.removeAttribute('src'));
    c.querySelectorAll('#items, #contents').forEach((list) => [...list.children].slice(4, -1).forEach((n) => n.remove()));
    out.push(`<!-- ${name} -->\n${c.outerHTML}`);
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([out.join('\n\n')], { type: 'text/html' }));
  a.download = `kyt-${location.pathname === '/watch' ? 'watch' : 'home'}.html`;
  document.body.append(a); a.click(); a.remove();
  return `saved ${a.download}`;
})();
