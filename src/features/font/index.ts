import type { Feature } from '../../core/feature.ts';
import { FACES } from './faces.ts';

/** Family names carry a prefix so a locally installed copy (another version) never stands in. */
export const familyOf = (id: string) => `kyt ${FACES[id].family}`;

/** @font-face rules for every bundled font; `url` maps a file in fonts/ to a loadable URL. Unused faces cost
 *  nothing: the browser downloads a face only when text on the page needs it. */
export function faceCss(url: (file: string) => string): string {
  return Object.entries(FACES).flatMap(([id, f]) => f.files.map(({ file, range }) =>
    `@font-face{font-family:"${familyOf(id)}";src:url("${url(file)}") format("woff2");font-weight:100 900;` +
    `font-display:block;unicode-range:${range}}`)).join('\n');
}

/**
 * One typeface for all of YouTube's UI text. The fonts ship in the extension (fonts/*.woff2, OFL-1.1, from
 * scripts/fetch-fonts.mjs); style.css applies the chosen one. Glyphs a font lacks (CJK, Devanagari) fall
 * back to YouTube's own stack.
 */
export const font: Feature = {
  id: 'font', label: 'Font', group: 'look', icon: 'text', defaultOn: true,
  options: {
    family: {
      type: 'choice', label: 'Font', default: 'plus-jakarta-sans',
      choices: { 'plus-jakarta-sans': 'Plus Jakarta Sans', inter: 'Inter', geist: 'Geist', figtree: 'Figtree', system: 'System' },
    },
  },
  run({ signal }) {
    const style = document.createElement('style');
    style.className = 'kyt-font-faces';
    style.textContent = faceCss((file) => chrome.runtime.getURL(`fonts/${file}`));
    (document.head ?? document.documentElement).append(style);
    signal.addEventListener('abort', () => style.remove(), { once: true });
  },
};
