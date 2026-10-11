---
title: Testing
description: Unit tests, and the headless scripts that load Kempt into a real YouTube page.
---

## Commands

```sh
npm run check    # tsc --noEmit
npm test         # node --test test/
npm run build    # into dist/
npm run dev      # watch build
```

Run `check`, `test` and `build` after every change.

Unit tests cover the pure logic: route parsing, date grouping and age parsing in every supported language, Shorts URLs, sidebar order, the color picker math, the Subscriptions filters, and the project's structure rules.

## Headless checks

`node scripts/ext.mjs [url] [shot.png]` loads `dist/` as a real extension in a headless, signed-out Firefox and prints which features started. Its flags:

- `--width=N` sets the window width. Under 1312px YouTube shows the narrow sidebar.
- `--lang=de` sets the browser language. Signed out, YouTube ignores `?hl=` and follows the browser.
- `--with=<dir or .xpi>` loads a second extension beside Kempt, for compatibility checks.
- `--eval=file.js` runs a snippet in the page and prints its result: rects, computed styles.
- `--clip=<selector>` screenshots one element instead of the window.
- `--hover=<selector>` and `--click=<selector>` act after `--eval`, before the screenshot.
- `--scale=N` sets the device pixel ratio. `--light` uses the light theme.
- `--type` types into the search box so the suggestions popup opens.
- `--scrollbars` forces classic scrollbars, like macOS "Always show scroll bars".
- `--fake-login` makes YouTube report signed in, so signed-in features mount. Their API calls still fail.
- `--off` loads plain YouTube without Kempt, for comparison.
- `--css-only` injects `dist/content.css` with every feature on instead of loading the extension. It's faster for CSS checks.

## Headless tips

- `--eval` is blocked by the page's CSP on Home (Search allows it). Wrap snippets as an IIFE.
- To trace YouTube's DOM moves, wrap `Node.prototype.insertBefore` in an `--eval` snippet. The page world sees YouTube's calls, not Kempt's.
- Headless Firefox uses overlay scrollbars (0px wide), which hides scrollbar-width bugs. Use `--scrollbars`.
- Logged out, YouTube ignores `?hl=` and follows the browser language (`--lang=de`). Past-stream wording shows on a channel's `/streams` tab, for example `/@LinusTechTips/streams`.
- Logged out, Subscriptions has no feed, so inject items into the grid. YouTube upgrades a created `ytd-rich-grid-renderer` or `ytd-rich-item-renderer` and wipes children added before, so add the metadata after about a second. Inject in one `page.evaluate`, wait outside the page, then interact in a second one.
- Launch and `waitFor` timeouts happen. Retry before calling it a regression.

## What headless can't check

- Signed-in data: Watch later state, Subscriptions and Playlists data, Ask AI. `--fake-login` mounts these features, but their requests fail.
- `backdrop-filter`, which headless Firefox doesn't draw.
- Live video, which headless Firefox can't play. Test chat on a stream that is live now, such as `/@LofiGirl/live`; consent screens can hide the chat.
- The toolbar popup: headless Firefox can't open `moz-extension://` pages.

Check those by hand, signed in: in Firefox, open `about:debugging`, click **Reload** on Kempt and refresh the tab.

After a reload, Firefox keeps the old `main-world.js` running in tabs that were open (`TypeError: c[s] is not a function`). The per-build id in `build.mjs` and `src/core/bridge.ts` keeps the stale script from answering; don't remove it.

## Releasing

release-please opens a release PR from the Conventional Commits on `main`. Merging it tags the version, builds the zips and publishes the GitHub release.

- Never edit the release PR's body by hand. release-please builds the release from that body when the PR merges; a hand-edited body fails to parse, so no tag or release is made and the next run treats the whole history as unreleased. Edit `CHANGELOG.md` on the PR branch, or the release notes after.
- Its JSON updater reformats `manifest.json` (one-line arrays get expanded). That's harmless.
