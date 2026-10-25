import type { Feature } from '../core/feature.ts';
import { accent } from './accent/index.ts';
import { captions } from './captions/index.ts';
import { commentLayout } from './comment-layout/index.ts';
import { commentSearch } from './comment-search/index.ts';
import { channelTabs } from './channel-tabs/index.ts';
import { commentSort } from './comment-sort/index.ts';
import { font } from './font/index.ts';
import { grid } from './grid/index.ts';
import { icons } from './icons/index.ts';
import { notifActions } from './notif-actions/index.ts';
import { playlists } from './playlists/index.ts';
import { progressBar } from './progress-bar/index.ts';
import { searchBar } from './search-bar/index.ts';
import { searchFilters } from './search-filters/index.ts';
import { selectedBg } from './selected-bg/index.ts';
import { settingsTopbar } from './settings-topbar/index.ts';
import { shorts } from './shorts/index.ts';
import { sidebar } from './sidebar/index.ts';
import { subscribeRed } from './subscribe-red/index.ts';
import { subsTabs } from './subs-tabs/index.ts';
import { timeline } from './timeline/index.ts';
import { watchLaterBtn } from './watch-later-btn/index.ts';
import { watchTabs } from './watch-tabs/index.ts';

// A feature's style.css is picked up by build.mjs automatically.
export const features: Feature[] = [accent, font, selectedBg, subscribeRed, searchBar, icons,
  sidebar, settingsTopbar, watchLaterBtn, notifActions, shorts, watchTabs, captions, commentSort, commentSearch, commentLayout,
  timeline, subsTabs, playlists, channelTabs, searchFilters, grid, progressBar];
