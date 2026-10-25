---
title: Page bridge
description: How Kempt reads YouTube's own data from the page world.
banner:
  content: These docs are outdated and will be updated once v1.0 is released.
---

A content script can't see YouTube's JavaScript objects: `ytcfg`, or the data YouTube's elements carry. Some features need them:

- the sidebar reads the guide data,
- the icons read each button's icon type,
- Watch later sends YouTube's own requests,
- Grid size sets the Home Shorts shelf's `elementsPerRow`,
- Watch tabs relays out the page and moves or removes Ask AI,
- Shorts and the sidebar navigate through YouTube's own router.

So a second script, `main-world.js`, runs in YouTube's page and answers calls from the content script.

## Calling the page world

```ts
// in a feature's run(ctx)
const saved = await ctx.call('inWatchLater', videoId);
```

`call` is typed from the handler map. A wrong handler name fails `npm run check`, and so do wrong argument or result types.

## Writing handlers

A feature that needs the page world adds `features/<id>/page.ts`:

```ts
// src/features/watch-later-btn/page.ts
export const watchLater = {
  async inWatchLater(videoId: string): Promise<boolean> { /* ... */ },
  async setWatchLater(videoId: string, add: boolean): Promise<boolean> { /* ... */ },
};
```

and spreads it into `src/features/page.ts`, the only list of page-world handlers. Handler names must be unique; `test/structure.test.ts` checks that, and that every `page.ts` is registered.

Shared handlers live in `src/page/core.ts`:

| Handler | Does |
| --- | --- |
| `signedIn` | Whether the user is signed in |
| `stamp(sel)` | Writes `kyt-icon="SHARE"` and similar on buttons, and keeps it across re-renders |
| `stampMenus(sel)` | Stamps the items of ⋯ and account menus as they open |
| `stampTabs(sel)` | Writes `kyt-tab="shorts"` on channel tabs |
| `stampBell(sel)` | Writes the subscribe bell's state, `kyt-bell="all"` or `"none"` |
| `navigate(url)` | In-page navigation through YouTube's own `yt-navigate` |

`src/page/youtube.ts` holds the helpers they share: `cfg()`, `innertube(endpoint, body)` (YouTube's internal API, signed like YouTube signs it), and `walk` / `find` / `text` over YouTube's data.

## Transport

Calls travel as `CustomEvent`s on `document`, with a JSON string in `detail` and a request id. Kempt uses JSON strings because Firefox drops object `detail` between worlds. So arguments and results are plain data and never elements: you pass a selector and get back a boolean or JSON.

Event names carry the build id. Firefox keeps an old `main-world.js` running in open tabs after an extension reload, and the build id stops the old one from answering.

## Why stamp?

YouTube's `aria-label`s are translated. The icon type in an element's data (`SHARE`, `PLAYLIST_ADD`, `VIDEO_CALL`) is the same in every language. Stamping copies it onto an attribute that CSS can match. It runs only on small known containers: the sidebar and mini guide, the watch action row, the subscribe button, the popup container and the channel tabs.
