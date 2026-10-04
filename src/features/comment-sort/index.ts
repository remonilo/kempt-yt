import type { Feature } from '../../core/feature.ts';
import { keep, waitFor } from '../../core/dom.ts';

const ITEMS = '#sort-menu tp-yt-paper-listbox > a';

/**
 * Comment sort as a row of chips (Figma "Comments section") instead of YouTube's dropdown.
 * Each chip clicks the matching item in the hidden dropdown, so YouTube still does the reload.
 * Labels come from the dropdown items, so they follow the UI language.
 */
export const commentSort: Feature = {
  id: 'comment-sort',
  label: 'Comment sort as buttons', group: 'watch', icon: 'sort',
  defaultOn: true,
  routes: ['watch'],
  async run({ signal }) {
    // Comments render lazily (when scrolled to, or when their tab opens), so no timeout.
    const first = await waitFor(`ytd-watch-flexy ytd-comments-header-renderer ${ITEMS}`, { signal, timeout: Infinity });
    const header = first?.closest('ytd-comments-header-renderer');
    if (!header || signal.aborted) return;

    const row = document.createElement('div');
    row.className = 'kyt-sort';
    row.role = 'group';
    row.addEventListener('click', (e) => {
      const b = (e.target as Element).closest('button');
      if (b) header.querySelectorAll<HTMLElement>(ITEMS)[[...row.children].indexOf(b)]?.click();
    }, { signal });

    const mount = () => {
      const menu = header.querySelector('#sort-menu');
      const items = header.querySelectorAll(ITEMS);
      if (!menu || !items.length) return;
      if (menu.nextElementSibling !== row) menu.after(row);
      items.forEach((a, i) => {
        const b = row.children[i] ?? row.appendChild(document.createElement('button'));
        const label = a.querySelector('.item')?.textContent?.trim() ?? '';
        if (b.textContent !== label) b.textContent = label;
        const on = a.getAttribute('aria-selected') ?? 'false';
        if (b.ariaPressed !== on) b.ariaPressed = on;
      });
      while (row.children.length > items.length) row.lastElementChild?.remove();
    };
    keep(row, header, mount, signal, { childList: true, subtree: true, attributeFilter: ['aria-selected'] });
  },
};
