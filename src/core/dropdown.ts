import { el } from './dom.ts';
import { icon } from './icon.ts';

/**
 * Opens `root`'s menu upward when there is more room above. Room ends at the nearest clipping ancestor: YouTube's
 * ytd-browse is overflow: hidden, so on a short page (one search hit) a downward menu is cut at the page end.
 */
export function placeMenu(root: HTMLElement, menu: HTMLElement): void {
  let top = 56; // the masthead
  let bottom = innerHeight;
  for (let p = root.parentElement; p && p !== document.body; p = p.parentElement) {
    if (getComputedStyle(p).overflowY === 'visible') continue;
    const r = p.getBoundingClientRect();
    top = Math.max(top, r.top);
    bottom = Math.min(bottom, r.bottom);
    break;
  }
  const r = root.getBoundingClientRect();
  const below = bottom - r.bottom;
  root.toggleAttribute('kyt-up', below < menu.offsetHeight + 8 && r.top - top > below);
}

/**
 * A chip that opens a menu of choices ("View as: Timeline ▾"). Styled in theme/tokens.css. The outside-click
 * listener exists only while the menu is open. Call `sync()` when the value changes elsewhere. `opts.on` marks
 * several choices selected (every click then picks, so a selected one can toggle off); `opts.text` overrides the
 * chip's value text. Callers may append their own content to the menu (`.kyt-dd-menu`).
 */
export function dropdown(prefix: string, choices: Record<string, string>, get: () => string,
  pick: (v: string) => void, signal: AbortSignal,
  opts: { on?: (v: string) => boolean; text?: () => string } = {}): { root: HTMLElement; sync: () => void; close: () => void } {
  const value = el('span', 'kyt-dd-value');
  const arrow = icon('arrow-down');
  arrow.classList.add('kyt-dd-arrow'); // the only icon that turns; callers may prepend their own
  const btn = el('button', 'kyt-chip kyt-dd-btn', el('span', 'kyt-dd-prefix', `${prefix}:`), value, arrow);
  btn.ariaHasPopup = 'listbox';
  const menu = el('div', 'kyt-dd-menu');
  menu.role = 'listbox';
  for (const [k, label] of Object.entries(choices)) {
    const o = el('button', 'kyt-dd-item', label);
    o.role = 'option';
    o.dataset.value = k;
    menu.append(o);
  }
  const root = el('div', 'kyt-dd', btn, menu);

  let outside: AbortController | undefined;
  const open = (on: boolean) => {
    if (on) placeMenu(root, menu);
    root.toggleAttribute('open', on);
    btn.ariaExpanded = String(on);
    outside?.abort();
    if (!on) return;
    outside = new AbortController();
    const sig = AbortSignal.any([signal, outside.signal]);
    document.addEventListener('pointerdown', (e) => root.contains(e.target as Node) || open(false), { signal: sig, capture: true });
  };
  const sync = () => {
    const v = get();
    const on = opts.on ?? ((k: string) => k === v);
    value.textContent = opts.text?.() ?? choices[v] ?? '';
    for (const o of menu.querySelectorAll<HTMLElement>(':scope > .kyt-dd-item')) o.ariaSelected = String(on(o.dataset.value!));
  };
  btn.addEventListener('click', () => open(!root.hasAttribute('open')), { signal });
  menu.addEventListener('click', (e) => {
    const v = (e.target as Element).closest<HTMLElement>('[data-value]')?.dataset.value;
    if (!v) return;
    open(false);
    if (opts.on || v !== get()) pick(v);
    sync();
  }, { signal });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !root.hasAttribute('open')) return;
    open(false);
    btn.focus();
  }, { signal });
  signal.addEventListener('abort', () => outside?.abort(), { once: true });
  open(false);
  sync();
  return { root, sync, close: () => open(false) };
}
