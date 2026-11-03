import type { Feature } from '../../core/feature.ts';
import { waitFor } from '../../core/dom.ts';
import { eachRoute } from '../../core/router.ts';
import { S } from '../../core/selectors.ts';

// Icon-only buttons, with or without our icons (decision 45). Share/Save/Download/Shop are told apart by the
// stamped icon type (labels are localized); Create needs no stamp. `stamp` is idempotent, `icons` may stamp too.
export const buttonLabels: Feature = {
  id: 'button-labels', label: 'Hide button labels', hint: 'Icon-only buttons', group: 'look', icon: 'share', defaultOn: true,
  options: {
    create: { type: 'boolean', label: 'Create', default: true },
    share: { type: 'boolean', label: 'Share', default: true },
    save: { type: 'boolean', label: 'Save', default: true },
    download: { type: 'boolean', label: 'Download', default: true },
    shop: { type: 'boolean', label: 'Shop', default: true },
  },
  run({ signal, call }) {
    eachRoute(signal, (route, signal) => {
      if (route === 'watch') waitFor(S.watchActions, { signal }).then((el) => el && call('stamp', S.watchActions, 'button-labels'));
    });
  },
};
