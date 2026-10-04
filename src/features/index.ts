import type { Feature } from '../core/feature.ts';
import { accent } from './accent/index.ts';
import { commentSort } from './comment-sort/index.ts';
import { icons } from './icons/index.ts';
import { searchBar } from './search-bar/index.ts';
import { selectedBg } from './selected-bg/index.ts';
import { settingsTopbar } from './settings-topbar/index.ts';
import { shorts } from './shorts/index.ts';
import { sidebar } from './sidebar/index.ts';
import { subscribeRed } from './subscribe-red/index.ts';
import { timeline } from './timeline/index.ts';
import { watchLaterBtn } from './watch-later-btn/index.ts';
import { watchTabs } from './watch-tabs/index.ts';

// The ONLY list of features. Add a folder under features/, import it, append it here.
// Its style.css is picked up by build.mjs automatically.
export const features: Feature[] = [accent, selectedBg, subscribeRed, searchBar, icons,
  settingsTopbar, watchLaterBtn, shorts, sidebar, watchTabs, commentSort,
  timeline];
