import { el, observe } from './dom.ts';
import { icon } from './icon.ts';
import { local } from './i18n.ts';
import { saveOption } from './settings.ts';

/** Words several features share. */
export const COMMON = {
  en: { grid: 'Grid', list: 'List', videos: 'Videos' },
  es: { grid: 'Cuadrícula', list: 'Lista', videos: 'Vídeos' },
  pt: { grid: 'Grade', list: 'Lista', videos: 'Vídeos' },
  de: { grid: 'Raster', list: 'Liste', videos: 'Videos' },
  fr: { grid: 'Grille', list: 'Liste', videos: 'Vidéos' },
  ru: { grid: 'Сетка', list: 'Список', videos: 'Видео' },
  ja: { grid: 'グリッド', list: 'リスト', videos: '動画' },
  ko: { grid: '그리드', list: '목록', videos: '동영상' },
  hi: { grid: 'ग्रिड', list: 'सूची', videos: 'वीडियो' },
  id: { grid: 'Petak', list: 'Daftar', videos: 'Video' },
  tr: { grid: 'Izgara', list: 'Liste', videos: 'Videolar' },
};

/**
 * Grid/List chips. The choice is the `layout` option's value of feature `id`, mirrored on <html> as `kyt-<id>-<key>`
 * (the runner does that; the click sets it first so it feels instant). The popup can change it too, hence the observer.
 */
export function layoutToggle(id: string, key: string, def: 'grid' | 'list', signal: AbortSignal): HTMLElement {
  const attr = `kyt-${id}-${key}`;
  const html = document.documentElement;
  const words = local(COMMON);
  const toggle = el('div', 'kyt-chips kyt-layout');
  toggle.role = 'group';
  for (const v of ['grid', 'list'] as const) {
    const b = el('button', 'kyt-chip', icon(v));
    b.dataset.layout = v;
    b.title = b.ariaLabel = words[v];
    toggle.append(b);
  }
  const get = () => html.getAttribute(attr) ?? def;
  const sync = () => {
    for (const b of toggle.children as HTMLCollectionOf<HTMLElement>) b.ariaPressed = String(b.dataset.layout === get());
  };
  toggle.addEventListener('click', (e) => {
    const v = (e.target as Element).closest<HTMLElement>('[data-layout]')?.dataset.layout;
    if (!v || v === get()) return;
    html.setAttribute(attr, v);
    saveOption(id, key, v);
    sync();
  }, { signal });
  observe(html, { attributeFilter: [attr] }, sync, signal);
  sync();
  return toggle;
}
