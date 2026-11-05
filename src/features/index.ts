import type { Feature } from '../core/feature.ts';
import { accent } from './accent/index.ts';
import { logo } from './logo/index.ts';
import { captions } from './captions/index.ts';
import { commentLayout } from './comment-layout/index.ts';
import { commentSearch } from './comment-search/index.ts';
import { channelTabs } from './channel-tabs/index.ts';
import { commentSort } from './comment-sort/index.ts';
import { font } from './font/index.ts';
import { grid } from './grid/index.ts';
import { icons } from './icons/index.ts';
import { buttonLabels } from './button-labels/index.ts';
import { notifActions } from './notif-actions/index.ts';
import { playlists } from './playlists/index.ts';
import { downloads } from './downloads/index.ts';
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
import { hideHomeFeed } from './hide-home-feed/index.ts';
import { hideHomeChips } from './hide-home-chips/index.ts';
import { subsHome } from './subs-home/index.ts';
import { hideExplore } from './hide-explore/index.ts';
import { hideSubs } from './hide-subs/index.ts';
import { hideSecondary } from './hide-secondary/index.ts';
import { hideRelated } from './hide-related/index.ts';
import { hidePlaylist } from './hide-playlist/index.ts';
import { hideChat } from './hide-chat/index.ts';
import { hideComments } from './hide-comments/index.ts';
import { hideAvatars } from './hide-avatars/index.ts';
import { hideDescription } from './hide-description/index.ts';
import { hideChannel } from './hide-channel/index.ts';
import { hideActions } from './hide-actions/index.ts';
import { hideMerch } from './hide-merch/index.ts';
import { hideEndscreen } from './hide-endscreen/index.ts';
import { hideAutoplay } from './hide-autoplay/index.ts';
import { hideNotifs } from './hide-notifs/index.ts';
import { hideCreate } from './hide-create/index.ts';
import { hideYoodle } from './hide-yoodle/index.ts';
import { hideMixes } from './hide-mixes/index.ts';
import { hideSearchShelves } from './hide-search-shelves/index.ts';

// A feature's style.css is picked up by build.mjs automatically.
export const features: Feature[] = [accent, logo, font, selectedBg, subscribeRed, searchBar, icons, buttonLabels,
  sidebar, settingsTopbar, watchLaterBtn, notifActions, watchTabs, captions, commentSort, commentSearch, commentLayout,
  timeline, subsTabs, playlists, downloads, channelTabs, searchFilters, grid, progressBar,
  // Hide tab, grouped by section in page order
  hideExplore, hideSubs, hideNotifs, hideCreate, hideYoodle,
  shorts, hideHomeFeed, hideHomeChips, subsHome, hideMixes, hideSearchShelves,
  hideSecondary, hideRelated, hidePlaylist, hideChat, hideComments, hideAvatars, hideDescription, hideChannel, hideActions, hideMerch, hideEndscreen, hideAutoplay];
