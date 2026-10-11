// Paste into the DevTools console on /feed/subscriptions (scroll a few pages first so many items are loaded).
// Then drag the window edge back and forth for ~5 s and run kytResize() to print and copy the report.
// Repeat (no reload): turn Grid size off in the popup, resize, kytResize(); then Timeline off, resize, kytResize().
// Read-only: one MutationObserver on the grid and a rAF loop, both removed by kytResizeStop().
(() => {
  window.kytResizeStop?.();
  const grid = document.querySelector('ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer > #contents');
  if (!grid) return console.warn('No Subscriptions grid on this page');
  let s;
  const reset = () => (s = { frames: [], resizes: 0, added: 0, removed: 0, kytMoved: 0, itemAttrs: {}, gridAttrs: {} });
  reset();
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'childList') {
        for (const n of r.addedNodes) n.nodeType === 1 && (n.localName === 'kyt-bar' || n.classList.contains('kyt-tl-head')) ? s.kytMoved++ : s.added++;
        s.removed += r.removedNodes.length;
      } else {
        const bag = r.target === grid ? s.gridAttrs : s.itemAttrs;
        bag[r.attributeName] = (bag[r.attributeName] || 0) + 1;
      }
    }
  });
  mo.observe(grid, { childList: true, attributes: true, subtree: false });
  // Children's attributes (YouTube may stamp row/column state on items): observe the first 400 items.
  for (const c of [...grid.children].slice(0, 400)) mo.observe(c, { attributes: true });
  const onResize = () => s.resizes++;
  addEventListener('resize', onResize);
  let last = performance.now(), raf;
  const tick = (t) => (s.frames.push(t - last), (last = t), (raf = requestAnimationFrame(tick)));
  raf = requestAnimationFrame(tick);
  window.kytResizeStop = () => (mo.disconnect(), removeEventListener('resize', onResize), cancelAnimationFrame(raf));
  window.kytResize = () => {
    const f = s.frames.slice(1).sort((a, b) => a - b);
    const pct = (p) => Math.round(f[Math.min(f.length - 1, Math.floor(f.length * p))] || 0);
    const html = document.documentElement;
    const report = {
      kyt: html.getAttributeNames().filter((a) => a.startsWith('kyt')).join(' '),
      items: grid.querySelectorAll(':scope > ytd-rich-item-renderer').length,
      heads: grid.querySelectorAll(':scope > .kyt-tl-head').length,
      perRow: getComputedStyle(grid.parentElement).getPropertyValue('--ytd-rich-grid-items-per-row').trim(),
      width: innerWidth,
      resizeEvents: s.resizes,
      frames: f.length, p50ms: pct(0.5), p90ms: pct(0.9), maxMs: Math.round(f.at(-1) || 0), over50ms: f.filter((x) => x > 50).length,
      ytAdded: s.added, ytRemoved: s.removed, kytMoved: s.kytMoved,
      gridAttrs: s.gridAttrs, itemAttrs: s.itemAttrs,
    };
    console.log(JSON.stringify(report, null, 1));
    copy?.(JSON.stringify(report));
    reset();
    return 'copied; resize again for the next run';
  };
  console.log('Recording. Resize the window for ~5 s, then run kytResize()');
})();
