// Paste into the console on https://www.youtube.com/feed/history (signed in). Copies JSON to the clipboard;
// save it as samples/history-actions.json. Dumps the right column (search box + action buttons) and the chips row.
(() => {
  const browse = document.querySelector('ytd-browse[page-subtype="history"]');
  const rect = (el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); };
  const node = (el, depth = 0) => ({
    tag: el.localName + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].join('.') : ''),
    attrs: [...el.attributes].filter((a) => !['class', 'id', 'style'].includes(a.name)).map((a) => `${a.name}=${a.value.slice(0, 60)}`),
    rect: rect(el),
    icon: el.data?.icon?.iconType ?? el.data?.iconName ?? el.data?.buttonRenderer?.icon?.iconType,
    text: el.children.length ? undefined : el.textContent.trim().slice(0, 40) || undefined,
    kids: depth > 14 ? [] : [...el.children].filter((c) => !['style', 'path', 'yt-touch-feedback-shape'].includes(c.localName)).map((c) => node(c, depth + 1)),
  });
  const secondary = browse?.querySelector('#secondary');
  // Title and chips: the page header portal, plus the section list's own header (chips may live in either).
  const header = browse?.querySelector('#page-header-container') ?? browse?.querySelector('yt-page-header-renderer')?.parentElement;
  const listHeader = browse?.querySelector('ytd-section-list-renderer > #header-container');
  const out = {
    url: location.href, width: innerWidth,
    header: header && node(header),
    listHeader: listHeader && node(listHeader),
    secondary: secondary && node(secondary),
  };
  copy(JSON.stringify(out, null, 1));
  return out;
})();
