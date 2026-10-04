import { core } from '../page/core.ts';
import { sidebar } from './sidebar/page.ts';
import { watchLater } from './watch-later-btn/page.ts';
import { watchTabs } from './watch-tabs/page.ts';

// Every handler main-world.ts answers, by name. Features call them with ctx.call('name', ...args).
// A feature that needs YouTube's page context (ytcfg, element data, Innertube) puts its handlers in
// features/<id>/page.ts and spreads them in here. Names must be unique (test/structure.test.ts checks).
// Arguments and results cross worlds as JSON: plain data only, no elements or functions.
export const handlers = { ...core, ...sidebar, ...watchTabs, ...watchLater };

export type Handlers = typeof handlers;
