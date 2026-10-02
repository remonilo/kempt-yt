// Paste into the DevTools console on a signed-in /watch page. Copies a JSON report to the clipboard.
(() => {
  const html = document.documentElement;
  const rect = (el) => el && (({ x, width }) => [Math.round(x), Math.round(width)])(el.getBoundingClientRect());
  const btn = (b) => {
    const r = b.getBoundingClientRect();
    return {
      label: b.ariaLabel,
      host: b.closest('[kyt-icon]')?.getAttribute('kyt-icon') ?? b.parentElement?.closest('*:not(button-view-model)')?.tagName,
      class: b.className,
      width: Math.round(r.width),
      kids: [...b.children].map((c) => {
        const cr = c.getBoundingClientRect(), cs = getComputedStyle(c);
        return `${c.tagName.toLowerCase()}.${c.classList[0]} ${cs.display} x+${Math.round(cr.x - r.x)} w${Math.round(cr.width)} m(${cs.margin}) p(${cs.padding})`;
      }),
      svgX: b.querySelector('svg') && Math.round(b.querySelector('svg').getBoundingClientRect().x - r.x),
    };
  };
  const report = {
    kytAttrs: html.getAttributeNames().filter((a) => a.startsWith('kyt')),
    loggedIn: typeof ytcfg !== 'undefined' ? ytcfg.get('LOGGED_IN') : 'no ytcfg',
    apisidCookies: document.cookie.split('; ').map((c) => c.split('=')[0]).filter((n) => n.includes('APISID')),
    avatar: !!document.querySelector('ytd-masthead #buttons > ytd-topbar-menu-button-renderer'),
    mastheadButtons: [...document.querySelectorAll('ytd-masthead #buttons > *')].map((e) => e.tagName.toLowerCase()),
    settingsBtn: rect(document.querySelector('.kyt-settings')),
    wlBtn: rect(document.querySelector('.kyt-wl')),
    moreBtn: !!document.querySelector('ytd-watch-metadata ytd-menu-renderer > #button-shape'),
    actions: [...document.querySelectorAll('ytd-watch-metadata #actions button')].filter((b) => b.offsetParent).map(btn),
  };
  const out = JSON.stringify(report, null, 1);
  copy(out);
  return out;
})();
