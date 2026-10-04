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

Unit tests cover the pure logic: route parsing, date grouping and age parsing in every supported language, Shorts URLs, sidebar order, and the project's structure rules.

## Headless checks

`node scripts/ext.mjs [url] [shot.png]` loads `dist/` as a real extension in a headless, signed-out Firefox and prints which features started. Its flags:

- `--width=N` sets the window width. Under 1312px YouTube shows the narrow sidebar.
- `--lang=de` sets the browser language. Signed out, YouTube ignores `?hl=` and follows the browser.
- `--with=<dir or .xpi>` loads a second extension beside Kempt, for compatibility checks.
- `--eval=file.js` runs a snippet in the page and prints its result: rects, computed styles.
- `--clip=<selector>` screenshots one element instead of the window.
- `--css-only` injects `dist/content.css` with every feature on instead of loading the extension. It's faster for CSS checks.

## What headless can't check

- Signed-in UI: Watch later, Settings in the top bar, Subscriptions and Playlists data, Ask AI.
- `backdrop-filter`, which headless Firefox doesn't draw.
- Live chat on a live stream, because headless Firefox can't play live video.

Check those by hand, signed in: in Firefox, open `about:debugging`, click **Reload** on Kempt and refresh the tab.
