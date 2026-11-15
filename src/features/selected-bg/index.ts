import type { Feature } from '../../core/feature.ts';

export const selectedBg: Feature = {
  id: 'selected-bg',
  label: 'Tinted hover & selected',
  group: 'look',
  icon: 'grid',
  defaultOn: true,
  run({ signal }) {
    // YouTube focuses ☰ by script on page load and after a search, which matches :focus-visible.
    // Our ring on the masthead buttons shows only after a Tab press, until the next click.
    const html = document.documentElement;
    const set = (on: boolean) => html.hasAttribute('kyt-selected-bg-tab') !== on && html.toggleAttribute('kyt-selected-bg-tab', on);
    document.addEventListener('keydown', (e) => e.key === 'Tab' && set(true), { capture: true, signal });
    document.addEventListener('pointerdown', () => set(false), { capture: true, signal });
    signal.addEventListener('abort', () => set(false));
  },
};
