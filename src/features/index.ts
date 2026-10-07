import type { Feature } from '../core/feature.ts';
import { accent } from './accent/index.ts';
import { captions } from './captions/index.ts';
import { commentSort } from './comment-sort/index.ts';
import { font } from './font/index.ts';
import { grid } from './grid/index.ts';
import { icons } from './icons/index.ts';
import { progressBar } from './progress-bar/index.ts';
import { searchBar } from './search-bar/index.ts';
import { selectedBg } from './selected-bg/index.ts';
import { settingsTopbar } from './settings-topbar/index.ts';
import { shorts } from './shorts/index.ts';
import { sidebar } from './sidebar/index.ts';
import { subscribeRed } from './subscribe-red/index.ts';
import { timeline } from './timeline/index.ts';
import { watchLaterBtn } from './watch-later-btn/index.ts';
import { watchTabs } from './watch-tabs/index.ts';

// A feature's style.css is picked up by build.mjs automatically.
export const features: Feature[] = [accent, font, selectedBg, subscribeRed, searchBar, icons,
  sidebar, settingsTopbar, watchLaterBtn, shorts, watchTabs, captions, commentSort,
  timeline, grid, progressBar];
