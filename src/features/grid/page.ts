import { inst } from '../../page/youtube.ts';

const SHELF = 'ytd-rich-shelf-renderer[is-shorts]';
const observers = new Map<Element, MutationObserver>();
let perRow = 0;

function apply(shelf: Element) {
  const p = inst(shelf);
  if (perRow && p.elementsPerRow !== perRow) p.elementsPerRow = perRow;
}

export const gridPage = {
  // Re-applied on each change and on later shelves (docs/internals/youtube-quirks). 0 restores YouTube's count.
  shortsPerRow(sel: string, n: number) {
    perRow = n;
    const root = document.querySelector(sel);
    if (!n) {
      // Every root, not just the current one: off may come from another page, and Home roots get replaced.
      observers.forEach((o) => o.disconnect());
      observers.clear();
      root?.querySelectorAll(SHELF).forEach((s) => inst(s).refreshGridLayoutNew?.());
      return !!root;
    }
    if (!root) return false;
    root.querySelectorAll(SHELF).forEach(apply);
    if (!observers.has(root)) {
      const o = new MutationObserver((recs) => {
        for (const r of recs) if ((r.target as Element).matches(SHELF)) apply(r.target as Element);
      });
      o.observe(root, { subtree: true, attributeFilter: ['elements-per-row', 'is-shorts'] });
      observers.set(root, o);
    }
    return true;
  },
};
