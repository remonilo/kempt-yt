import type { Feature } from '../../core/feature.ts';
import { observe, waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

// The player's own switch is clicked, so YouTube stores the choice as if the user had; off restores it.
export const hideAutoplay: Feature = {
  id: 'hide-autoplay', label: 'Autoplay', hint: 'Turns it off and hides the switch', group: 'hide', section: 'Watch page', icon: 'next',
  defaultOn: false, routes: ['watch'],
  async run({ signal }) {
    const btn = await waitFor<HTMLElement>(S.autonav, { signal });
    const state = btn?.querySelector(S.autonavState);
    if (!btn || !state) return;
    let turnedOff = false;
    const off = () => {
      if (state.getAttribute('aria-checked') !== 'true') return;
      turnedOff = true;
      btn.click();
    };
    off();
    // Each video can bring YouTube's saved state back.
    observe(state, { attributeFilter: ['aria-checked'] }, off, signal);
    signal.addEventListener('abort', () => {
      if (turnedOff && state.getAttribute('aria-checked') === 'false') btn.click();
    }, { once: true });
  },
};
