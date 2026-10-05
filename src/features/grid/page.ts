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
    if (!root) return false;
    if (!n) {
      observers.get(root)?.disconnect();
      observers.delete(root);
      for (const s of root.querySelectorAll(SHELF)) inst(s).refreshGridLayoutNew?.();
      return true;
    }
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
