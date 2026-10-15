// Paste in the console on a channel Home page with a Posts shelf (signed in). Copies JSON to the clipboard;
// save it as samples/post-menu.json. Measures the first post card's toolbar, pills and ⋮ button.
(() => {
  const p = document.querySelector('ytd-browse:not([hidden]) ytd-post-renderer');
  if (!p) return console.log('no ytd-post-renderer on this page');
  const box = (e) => e && (({ top, bottom, left, right, height }) =>
    ({ top: Math.round(top), bottom: Math.round(bottom), left: Math.round(left), right: Math.round(right), height: Math.round(height) }))(e.getBoundingClientRect());
  const css = (e) => e && (({ position, top, bottom, right, marginTop, marginBottom, alignSelf, display, alignItems, height, padding }) =>
    ({ position, top, bottom, right, marginTop, marginBottom, alignSelf, display, alignItems, height, padding }))(getComputedStyle(e));
  const chain = (e) => { const a = []; for (; e && e !== p.parentElement; e = e.parentElement) a.push({ tag: e.tagName.toLowerCase(), id: e.id, cls: String(e.className).slice(0, 80), box: box(e), css: css(e) }); return a; };
  const menu = p.querySelector('#action-menu button, ytd-menu-renderer button, button[aria-haspopup]');
  const like = p.querySelector('#like-button button');
  const out = {
    url: location.href, attrs: [...p.attributes].map((a) => a.name),
    post: box(p), toolbar: { box: box(p.querySelector('#toolbar')), css: css(p.querySelector('#toolbar')) },
    like: chain(like).slice(0, 6), menu: chain(menu),
  };
  const json = JSON.stringify(out, null, 1);
  copy(json);
  console.log(`copied ${json.length} chars`, out);
})();
