import type { Feature } from '../../core/feature.ts';
import { el, waitFor } from '../../core/dom.ts';
import { icon, setIcon } from '../../core/icon.ts';
import { local } from '../../core/i18n.ts';
import { S } from '../../core/selectors.ts';
import { WATCH_LATER } from '../watch-later-btn/index.ts';

/** YouTube's own name for Share. */
const WORDS = {
  en: { share: 'Share' },
  es: { share: 'Compartir' },
  pt: { share: 'Compartilhar' },
  de: { share: 'Teilen' },
  fr: { share: 'Partager' },
  ru: { share: 'Поделиться' },
  ja: { share: '共有' },
  ko: { share: '공유' },
  hi: { share: 'शेयर करें' },
  id: { share: 'Bagikan' },
  tr: { share: 'Paylaş' },
};

const videoId = (a: HTMLAnchorElement | null) => {
  const url = a && new URL(a.href, location.origin);
  return url?.searchParams.get('v') ?? url?.pathname.match(/^\/shorts\/([\w-]{11})/)?.[1] ?? '';
};

export const notifActions: Feature = {
  id: 'notif-actions',
  label: 'Notification actions', hint: 'Watch later and Share under each video in the bell panel',
  group: 'navigation', icon: 'notifs',
  defaultOn: true,
  async run({ signal, call }) {
    if (!(await call('signedIn'))) return console.info('kyt: signed out, notif-actions off');
    const popups = await waitFor(S.popups, { signal, timeout: Infinity });
    if (!popups) return;
    const words = { wl: local(WATCH_LATER), ...local(WORDS) };
    const saved = new Set<string>(); // no per-item lookup on open (one request per item); filled after a click

    const render = (bar: HTMLElement) => {
      const on = saved.has(bar.dataset.v!);
      const wl = bar.firstElementChild as HTMLElement;
      setIcon(wl.firstElementChild as HTMLElement, on ? 'watch-later-selected' : 'watch-later');
      wl.ariaPressed = String(on);
    };
    const button = (name: string, text: string, ico: string) => {
      const b = el('button', 'kyt-na-btn', icon(ico), text);
      b.dataset.act = name;
      return b;
    };

    // Polymer reuses item elements for new data, so the bar follows the link's href.
    const mount = () => {
      for (const item of popups.querySelectorAll(S.notifItem)) {
        const id = videoId(item.querySelector('a'));
        let bar = item.querySelector<HTMLElement>('.kyt-na');
        if (!id) { bar?.remove(); continue; }
        if (!bar) {
          bar = el('div', 'kyt-na', button('wl', words.wl, 'watch-later'), button('share', words.share, 'share'));
          item.querySelector(S.notifText)?.append(bar);
        }
        if (bar.dataset.v !== id) {
          bar.dataset.v = id;
          render(bar);
        }
      }
    };

    // Capture on the popup: the pills sit inside the item's link, which must not open the video or close the panel.
    popups.addEventListener('click', async (e) => {
      const btn = (e.target as Element).closest<HTMLElement>('.kyt-na-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const bar = btn.parentElement!;
      const id = bar.dataset.v!;
      if (btn.dataset.act === 'share') return call('shareVideo', id);
      const add = !saved.has(id);
      const set = () => (add ? saved.add(id) : saved.delete(id), render(bar));
      set(); // optimistic; rolled back on failure
      try {
        await call('setWatchLater', id, add);
      } catch (err) {
        if (add) saved.delete(id); else saved.add(id);
        if (bar.dataset.v === id) render(bar);
        console.warn('kyt: watch later failed', err);
      }
    }, { signal, capture: true });

    const obs = new MutationObserver(mount);
    obs.observe(popups, { childList: true, subtree: true, attributeFilter: ['href'] });
    mount();
    signal.addEventListener('abort', () => {
      obs.disconnect();
      popups.querySelectorAll('.kyt-na').forEach((b) => b.remove());
    }, { once: true });
  },
};
