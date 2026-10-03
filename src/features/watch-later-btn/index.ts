import type { Feature } from '../../core/feature.ts';
import { keep, waitFor } from '../../core/dom.ts';
import { icon, setIcon } from '../../core/icon.ts';
import { S } from '../../core/selectors.ts';

export const watchLaterBtn: Feature = {
  id: 'watch-later-btn',
  label: 'Watch later button',
  defaultOn: true,
  routes: ['watch'],
  async run({ signal, call }) {
    if (!(await call<boolean>('signedIn'))) return console.info('kyt: signed out, watch-later-btn off');

    // Reuse YouTube's own button classes so it matches Share/Save exactly.
    const btn = document.createElement('button');
    btn.className = 'ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM ytSpecButtonShapeNextIconButton kyt-wl';
    btn.title = btn.ariaLabel = 'Watch later';
    const ico = icon('watch-later');
    btn.append(ico);

    let videoId = '';
    let saved = false;
    const render = () => {
      setIcon(ico, saved ? 'watch-later-selected' : 'watch-later');
      btn.ariaPressed = String(saved);
    };

    const load = async () => {
      const id = (videoId = new URLSearchParams(location.search).get('v') ?? '');
      saved = false;
      render();
      const state = await call<boolean>('inWatchLater', id).catch((e) => (console.warn('kyt: watch later status failed', e), false));
      if (id === videoId) {
        saved = state;
        render();
      }
    };

    btn.addEventListener('click', async () => {
      const id = videoId;
      saved = !saved; // optimistic; rolled back on failure
      render();
      try {
        await call('setWatchLater', id, saved);
      } catch (e) {
        saved = !saved;
        render();
        console.warn('kyt: watch later failed', e);
      }
    }, { signal });
    document.addEventListener('kyt:navigate', load, { signal });
    load();
    const meta = await waitFor(S.watchMetadata, { signal });
    if (!meta) return;
    keep(btn, meta, () => {
      const more = meta.querySelector(S.watchMore);
      if (more && btn.nextElementSibling !== more) more.before(btn);
    }, signal);
  },
};
