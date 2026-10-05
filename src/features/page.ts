import { core } from '../page/core.ts';
import { gridPage } from './grid/page.ts';
import { sidebar } from './sidebar/page.ts';
import { watchLater } from './watch-later-btn/page.ts';
import { watchTabs } from './watch-tabs/page.ts';

// Names must be unique (test/structure.test.ts checks).
// Arguments and results cross worlds as JSON: plain data only, no elements or functions.
export const handlers = { ...core, ...gridPage, ...sidebar, ...watchTabs, ...watchLater };

export type Handlers = typeof handlers;
