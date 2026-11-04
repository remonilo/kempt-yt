// Paste into the DevTools console on a /shorts/ page with the Shorts ⋮ menu OPEN (Description, Save to playlist, ...).
// Finds the open menu wherever it renders and copies its rows (container chain, row tag, icon type, svg path start).
(() => {
  const unwrap = (v) => {
    for (let i = 0; i < 3 && typeof v === 'function'; i++) { try { v = v(); } catch { return undefined; } }
    return v;
  };
  const json = (v) => { try { return JSON.stringify(v) ?? ''; } catch { return ''; } };
  const find = (v) => json(v).match(/"(?:imageName|iconType|iconName)":"(\w+)"/)?.[1];
  const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const ROWS = 'yt-list-item-view-model, ytd-menu-service-item-renderer, ytd-toggle-menu-service-item-renderer, ytd-menu-navigation-item-renderer, ytd-compact-link-renderer, .ytp-menuitem, [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
  // Outermost matching rows only (a role=menuitem inside a list item would double up).
  const rows = [...document.querySelectorAll(ROWS)].filter((e) => shown(e) && !e.parentElement.closest(ROWS));
  const chain = (e) => {
    const a = [];
    for (let p = e.parentElement; p && p !== document.body && a.length < 10; p = p.parentElement)
      a.push(p.tagName.toLowerCase() + (p.id ? '#' + p.id : '') + (p.classList[0] ? '.' + p.classList[0] : ''));
    return a.join(' < ');
  };
  const lines = rows.map((e) => {
    const icon = e.getAttribute('kyt-icon') ?? find(unwrap(e.rawProps?.data)) ?? find(unwrap(e.data)) ?? find(unwrap(e.__data));
    const paths = [...e.querySelectorAll('svg path')].map((p) => p.getAttribute('d')?.slice(0, 16)).join(' / ');
    const cls = e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').slice(0, 2).join('.') : '';
    return `${icon ?? '?'} | ${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 32)} | ${e.tagName.toLowerCase()}${cls} role=${e.getAttribute('role')} aria-checked=${e.getAttribute('aria-checked')} | ${paths}`;
  });
  if (rows[0]) lines.unshift(`-- container: ${chain(rows[0])}`);
  const out = lines.join('\n') || 'no open menu rows found';
  copy(out);
  console.log(out);
  return rows.length;
})();
