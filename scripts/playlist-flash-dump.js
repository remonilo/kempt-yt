// Paste in the console on any YouTube page (signed in), then within 20s cycle between feeds and a playlist
// (Home -> Watch later / a playlist -> Subscriptions -> ...). Logs every frame where what's painted changes:
// URL, each visible ytd-browse, which header kind it shows and whether it's styled. Downloads playlist-flash.json
// when done; move it to samples/.
(() => {
  const SECONDS = 20;
  const vis = (e) => {
    if (!e) return null;
    const r = e.getBoundingClientRect(), c = getComputedStyle(e);
    if (!r.width || !r.height || c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') return null;
    return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
  };
  const snap = () => [...document.querySelectorAll('ytd-browse')].map((b) => {
    const at = vis(b);
    if (!at) return null;
    const old = b.querySelector(':scope > ytd-playlist-header-renderer');
    const vm = b.querySelector(':scope > yt-page-header-renderer');
    return {
      subtype: b.getAttribute('page-subtype'), hidden: b.hasAttribute('hidden'), at,
      kyt: [...b.attributes].map((a) => a.name).filter((n) => n.startsWith('kyt')),
      // Size and background tell YouTube's own look (tall, blurred thumbnail) from our restyle.
      oldHeader: vis(old) && { at: vis(old), title: old.querySelector('yt-dynamic-sizing-formatted-string, #title, h1')?.textContent?.trim().slice(0, 40),
        bg: getComputedStyle(old.querySelector('.immersive-header-container') ?? old).backgroundImage.slice(0, 40) },
      vmHeader: vis(vm) && { at: vis(vm), title: vm.querySelector('h1, .ytPageHeaderViewModelTitle')?.textContent?.trim().slice(0, 40) },
      firstRow: b.querySelector('ytd-playlist-video-renderer #video-title, yt-lockup-view-model h3, ytd-rich-item-renderer #video-title')?.textContent?.trim().slice(0, 40),
    };
  }).filter(Boolean);
  const log = [];
  let last = '', t0 = performance.now();
  const tick = (now) => {
    const s = { url: location.pathname + location.search, browses: snap() };
    const k = JSON.stringify(s);
    if (k !== last) {
      log.push({ ms: Math.round(now - t0), ...s });
      last = k;
    }
    if (now - t0 < SECONDS * 1000) requestAnimationFrame(tick);
    else {
      // A download: the console's copy() is gone by the time a later frame runs (Firefox).
      const json = JSON.stringify(log, null, 1);
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([json])), download: 'playlist-flash.json' });
      a.click();
      console.log(`downloaded playlist-flash.json: ${log.length} frames, ${json.length} chars`, log);
    }
  };
  for (const ev of ['yt-navigate-start', 'yt-navigate-finish', 'yt-page-data-updated'])
    document.addEventListener(ev, () => log.push({ ms: Math.round(performance.now() - t0), event: ev, url: location.pathname + location.search }));
  requestAnimationFrame(tick);
  console.log(`logging for ${SECONDS}s: cycle between feeds and a playlist now`);
})();
