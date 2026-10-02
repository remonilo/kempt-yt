/** A Figma icon painted with currentColor. Pass an imported .svg (data: URL). Size via --kyt-icon-size. */
export function icon(src: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'kyt-icon';
  setIcon(s, src);
  return s;
}

export const setIcon = (el: HTMLElement, src: string) => el.style.setProperty('--kyt-icon-src', `url("${src}")`);
