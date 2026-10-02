import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { S } from '../../core/selectors.ts';

// Labels are localized, so main-world.ts stamps kyt-icon="SHARE" / "PLAYLIST_ADD" on the buttons for style.css.
export const actionIcons: Feature = {
  id: 'action-icons',
  label: 'Icon-only Share and Save',
  defaultOn: true,
  routes: ['watch'],
  async run({ signal, call }) {
    if (await waitFor(S.watchActions, { signal })) await call('stamp', S.watchActions);
  },
};
