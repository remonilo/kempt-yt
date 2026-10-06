// Paste into the DevTools console on youtube.com with a menu OPEN (avatar menu, or the ⋯ under a video).
// Prints each row's icon type, so src/features/icons/style.css can map it. Copy the output back to the agent.
(() => {
  const unwrap = (v) => {
    for (let i = 0; i < 3 && typeof v === 'function'; i++) { try { v = v(); } catch { return undefined; } }
    return v;
  };
  const json = (v) => { try { return JSON.stringify(v) ?? ''; } catch { return ''; } };
  // view-model rows bury the icon name (leadingImage...clientResource.imageName), so take the first imageName/iconType anywhere.
  const find = (v) => json(v).match(/"(?:imageName|iconType)":"(\w+)"/)?.[1];
  const els = [...document.querySelectorAll('ytd-popup-container :is(ytd-compact-link-renderer, ytd-toggle-theme-compact-link-renderer, ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer, ytd-menu-service-item-download-renderer, yt-list-item-view-model)')]
    .filter((e) => e.offsetParent);
  const lines = els.map((e) => {
    const icon = e.getAttribute('kyt-icon') ?? e.data?.icon?.iconType ?? e.data?.primaryIcon?.iconType ?? find(unwrap(e.rawProps?.data)) ?? find(unwrap(e.data));
    return `${icon} | ${e.data?.secondaryIcon?.iconType ?? ''} | ${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 28)} | ${e.tagName.toLowerCase()}`;
  });
  // Shape of the first row's data, in case the icon is still undefined.
  const e = els[0];
  const raw = e?.rawProps?.data;
  lines.push(`-- first row: rawProps=${typeof e?.rawProps} keys=${Object.keys(e?.rawProps ?? {}).join(',')} data=${typeof raw}` +
    ` unwrapped=${typeof unwrap(raw)} keys=${Object.keys(unwrap(raw) ?? {}).join(',')} el.data=${typeof e?.data}` +
    ` own=${Object.keys(e ?? {}).filter((k) => /data|props/i.test(k)).join(',')}`);
  console.log(lines.join('\n'));
  return els.length;
})();
