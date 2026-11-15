import type { Feature } from '../../core/feature.ts';
import { S } from '../../core/selectors.ts';

export const searchBar: Feature = {
  id: 'search-bar',
  label: 'Outlined search bar',
  group: 'look',
  icon: 'search',
  defaultOn: true,
  run({ signal }) {
    // A search moves focus from the box to ☰ by script, so the browser draws its keyboard focus ring there.
    // Tab never goes from the box to ☰ (☰ comes first), so this only drops that scripted focus.
    document.addEventListener('focusin', (e) => {
      const from = e.relatedTarget;
      if (from instanceof Element && from.closest(S.searchbox) && (e.target as Element).matches?.(S.guideButton)) {
        (e.target as HTMLElement).blur();
      }
    }, { capture: true, signal });
  },
};
