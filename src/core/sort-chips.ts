import { el, keep } from './dom.ts';

/**
 * A `div.kyt-sort` row with a chip per item of a hidden YouTube sort dropdown. Each chip clicks its item, so YouTube
 * still does the reload; labels come from the items, so they follow the UI language. `items()` lists the current
 * items, `place(row)` puts the row in the page; both run whenever `root` changes (`init`).
 */
export function sortChips(items: () => NodeListOf<HTMLElement> | [], place: (row: HTMLElement) => void, root: Node,
  signal: AbortSignal, init?: MutationObserverInit) {
  const row = el('div', 'kyt-sort');
  row.role = 'group';
  row.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button');
    if (b) items()[[...row.children].indexOf(b)]?.click();
  }, { signal });
  keep(row, root, () => {
    const list = items();
    if (!list.length) return;
    place(row);
    list.forEach((a, i) => {
      const b = row.children[i] ?? row.appendChild(el('button', 'kyt-chip'));
      const label = a.querySelector('.item')?.textContent?.trim() ?? '';
      if (b.textContent !== label) b.textContent = label;
      const on = a.getAttribute('aria-selected') ?? 'false';
      if (b.ariaPressed !== on) b.ariaPressed = on;
    });
    while (row.children.length > list.length) row.lastElementChild?.remove();
  }, signal, init);
}
