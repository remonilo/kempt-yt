// Paste into the console on a channel page or a Short (signed in, subscribed). Copies JSON to the clipboard;
// save it as samples/bell-<page>.json. Dumps every visible subscribe button with its bell, plus any open menu.
(() => {
  const SEL = 'yt-subscribe-button-view-model, ytd-subscribe-button-renderer, ytd-subscription-notification-toggle-button-renderer-next, ytd-subscription-notification-toggle-button-renderer';
  const rect = (el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); };
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const path = (el) => { const p = []; for (let e = el.parentElement; e && p.length < 12; e = e.parentElement) p.push(e.localName + (e.id ? '#' + e.id : '')); return p.join(' < '); };
  const icons = (v, out = new Set(), d = 0) => {
    if (!v || typeof v !== 'object' || d > 12) return out;
    for (const [k, x] of Object.entries(v)) {
      if ((k === 'iconType' || k === 'iconName' || k === 'imageName' || k === 'stateId' || k === 'currentStateId') && typeof x !== 'object') out.add(`${k}=${x}`);
      else icons(x, out, d + 1);
    }
    return out;
  };
  const trim = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('path, g, defs, style, lottie-component svg').forEach((n) => n.remove());
    return c.outerHTML.replace(/\s(style|src)="[^"]*"/g, '').slice(0, 6000);
  };
  const seen = new Set();
  const buttons = [...document.querySelectorAll(SEL)].filter(shown).filter((el) => {
    const top = el.closest('yt-subscribe-button-view-model, ytd-subscribe-button-renderer') ?? el;
    if (seen.has(top)) return false;
    return seen.add(top), true;
  }).map((el) => {
    const top = el.closest('yt-subscribe-button-view-model, ytd-subscribe-button-renderer') ?? el;
    return { tag: top.localName, path: path(top), rect: rect(top), data: [...icons(top.data ?? top.__data)], html: trim(top) };
  });
  const menus = [...document.querySelectorAll('ytd-popup-container > *, tp-yt-iron-dropdown, yt-sheet-view-model')].filter(shown)
    .map((el) => ({ tag: el.localName, rect: rect(el), html: trim(el) }));
  const out = { url: location.href, width: innerWidth, buttons, menus };
  copy(JSON.stringify(out, null, 1));
  return out;
})();
