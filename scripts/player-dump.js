// Paste in the console on a watch page with the player's settings menu open. Copies the result to the clipboard.
// Dumps each control button's structure and each settings row's icon path start (what icons/style.css matches on).
(() => {
  const p = document.querySelector('#movie_player');
  const strip = (h) => h.replace(/ d="([^"]{0,16})[^"]*"/g, ' d="$1…"');
  const out = {
    player: p.className,
    buttons: [...p.querySelectorAll('.ytp-chrome-bottom .ytp-button')].map((b) => ({
      cls: b.className, pressed: b.getAttribute('aria-pressed'), html: strip(b.innerHTML).slice(0, 600),
    })),
    rows: [...p.querySelectorAll('.ytp-settings-menu .ytp-menuitem')].map((m) => ({
      role: m.getAttribute('role'), label: m.querySelector('.ytp-menuitem-label')?.textContent,
      d: m.querySelector('.ytp-menuitem-icon path')?.getAttribute('d')?.slice(0, 24),
    })),
  };
  copy(JSON.stringify(out, null, 1));
  return out;
})();
