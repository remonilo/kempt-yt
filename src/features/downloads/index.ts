import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

/** Downloads page laid out like History: 20px title over a divider, content in History's centred column. */
export const downloads: Feature = {
  id: 'downloads', label: 'Downloads page', hint: 'Header and margins like History', group: 'feeds', icon: 'download', defaultOn: true,
  routes: ['downloads'],
  async run({ signal }) {
    // The page has no page-subtype for CSS to gate on, so mark its ytd-browse.
    const page = (await waitFor(S.downloadsHeader, { signal }))?.closest('ytd-browse');
    if (!page || signal.aborted) return;
    page.setAttribute('kyt-downloads', '');
    signal.addEventListener('abort', () => page.removeAttribute('kyt-downloads'), { once: true });
  },
};
