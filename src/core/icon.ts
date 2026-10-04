/**
 * A Figma icon (src/icons/<name>.svg) painted with currentColor. Size via --kyt-icon-size.
 * The SVG loads from the extension as a CSS mask (web_accessible_resources), so icons cost nothing in content.js.
 */
export function icon(name: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'kyt-icon';
  setIcon(s, name);
  return s;
}

/** URL of a Figma icon, for CSS: `url("${iconUrl(name)}")`. */
export const iconUrl = (name: string) => chrome.runtime.getURL(`icons/${name}.svg`);

export const setIcon = (el: HTMLElement, name: string) => setIconUrl(el, iconUrl(name));

/** Any image URL as the mask, e.g. a data: URL of one of YouTube's own SVGs. */
export const setIconUrl = (el: HTMLElement, url: string) => el.style.setProperty('--kyt-icon-src', `url("${url}")`);
