import { core } from '../page/core.ts';
import { notifActions } from './notif-actions/page.ts';
import { gridPage } from './grid/page.ts';
import { playlistsPage } from './playlists/page.ts';
import { searchFiltersPage } from './search-filters/page.ts';
import { sidebar } from './sidebar/page.ts';
import { subsChannels } from './subs-tabs/page.ts';
import { watchLater } from './watch-later-btn/page.ts';
import { watchTabs } from './watch-tabs/page.ts';

// Names must be unique (test/structure.test.ts checks).
// Arguments and results cross worlds as JSON: plain data only, no elements or functions.
export const handlers = { ...core, ...gridPage, ...notifActions, ...playlistsPage, ...searchFiltersPage, ...sidebar, ...subsChannels, ...watchTabs, ...watchLater };

export type Handlers = typeof handlers;
