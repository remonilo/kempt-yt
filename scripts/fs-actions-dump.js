// Paste in the console on a watch page while in fullscreen (move the mouse so the controls show).
// Copies JSON about the fullscreen quick actions (like, dislike, comments, share, ⋯); save it as samples/fs-actions-dump.json.
(() => {
  const root = document.querySelector('#movie_player .ytp-fullscreen-quick-actions');
  const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  const data = (el) => { try { const d = el.rawProps?.data; return typeof d === 'function' ? d() : el.data; } catch { return null; } };
  const out = {
    url: location.href, ua: navigator.userAgent, flags: [...document.documentElement.attributes].map((a) => a.name).filter((n) => n.startsWith('kyt-')),
    found: !!root,
    buttons: [...(root?.querySelectorAll('button') ?? [])].map((b) => {
      const icon = b.querySelector('.ytSpecButtonShapeNextIcon');
      const cs = icon && getComputedStyle(icon);
      const host = b.closest('toggle-button-view-model, button-view-model');
      return {
        label: b.ariaLabel, pressed: b.ariaPressed, box: box(b),
        stamps: [...new Set([...root.querySelectorAll('[kyt-icon]')].filter((e) => e.contains(b)).map((e) => `${e.tagName}=${e.getAttribute('kyt-icon')}`))],
        icon: icon && { box: box(icon), mask: cs.maskImage, bg: cs.backgroundColor, display: cs.display, html: icon.innerHTML.replace(/ d="[^"]{40,}"/g, (m) => m.slice(0, 50) + '…"').slice(0, 800) },
        hostData: JSON.stringify(data(host), (_, v) => (typeof v === 'function' ? undefined : v))?.slice(0, 1500),
      };
    }),
  };
  const json = JSON.stringify(out, null, 1);
  copy(json);
  console.log(`copied ${json.length} chars`, out);
})();
