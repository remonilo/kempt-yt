# Kempt for YouTube: build plan

A browser extension (MV3, Chrome + Firefox 128+) that restyles YouTube into one consistent design system.
Icon source: Juxtopposed "YouTube Redesign (Community)" Figma file.

## Next up

Keep this list current. It is the first thing a new session reads. Done work lives in §8 and the git log.

Open work: none. Pick from Before release or Later phases.

Before release:

- [x] Screenshots for the site and README (decision 31): done (`popup` by `node scripts/popup-shot.mjs`, `popup-web` on the landing page), PNG in `site/public/screenshots/`, signed in, dark theme. Enable Pages (Settings > Pages > Source: GitHub Actions).
- [ ] Check of Font (decision 33): text everywhere in the chosen font, captions unchanged, popup previews show each font, switching applies without reload, Chrome loads the fonts too.
- [ ] Signed-in check of Grid size (decision 32): Home Shorts shelf fills the row at 7 and keeps it on resize, Subscriptions with timeline headers. Videos per row already verified.
- [ ] Signed-in check of localization (decision 29): Subscriptions headers and Live chip in a non-English UI language, the 11 string tables read by a native speaker if possible.

Later phases: "View as: Channels" on Subscriptions.

Known gaps: the search "Shorts" filter chip stays (phase 3). Icons missing from the Figma set come from Hugeicons (§9, §10.23). Sidebar new-uploads dot has no count: guide data only flags `GUIDE_ENTRY_PRESENTATION_STYLE_NEW_CONTENT`.

Awaits a signed-in check: localization, Grid size Shorts shelf (Before release). Last verified: Grid size videos per row, Subscriptions filters, bell states, sidebar child hierarchy, popup redesign, Hugeicons Ask button, Figma `library` in Playlists, playlist panel outside Videos (Watch later), sidebar new-uploads dot, phases 5 and 7 (theater spam, theater + live chat, Ask AI setting, Create and bell icons, like/dislike pop).

---

## 1. Principles

1. **CSS before JS.** If a change is visual, it is a stylesheet rule. JS only when we must add elements, move elements, read page data, or change navigation.
2. **Core knows nothing about features.** Features plug into a small runner. Adding one = one new folder + one line in `features/index.ts` (and one in `features/page.ts` if it has page-world handlers).
3. **Every feature is toggleable and fully reversible.** Off means zero CSS applied and zero JS running.
4. **No global observers, no polling.** Route changes come from YouTube's own `yt-navigate-finish` event. DOM waits are scoped to one container and disconnect as soon as they resolve.
5. **YouTube selectors have one home each.** JS selectors live in `core/selectors.ts`; CSS selectors live in the feature's `style.css` next to their rules. When YouTube ships a DOM change, `grep` finds every use.

---

## 2. Stack

| Choice                          | Why                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| TypeScript, no UI framework     | Content scripts must stay tiny. Every DOM piece we add is small.                                      |
| `esbuild` (only dev dependency) | Bundles TS and concatenates every feature's CSS into one `content.css`. Builds in ms.                 |
| `node:test`                     | Unit tests for the pure logic (route parsing, date bucketing, shorts URL parsing). No test framework. |
| `chrome.storage.sync`           | Settings sync across the user's browsers.                                                             |

Switch to WXT only if you later want HMR or Safari. Not needed now.

---

## 3. Project layout

```
kempt-yt/
  manifest.json
  build.mjs                 esbuild: content.ts, main-world.ts, popup.ts
  scripts/
    build-icons.mjs         SVG folder -> theme/icons.css (CSS masks)
  src/
    content.ts              entry (isolated world): settings -> html attrs -> router -> runner
    main-world.ts           entry (page world): answers bridge calls with features/page.ts
    core/                   isolated world
      feature.ts            Feature / Ctx types + runner
      router.ts             Route from URL, fires on yt-navigate-finish
      settings.ts           typed get/set/onChange over chrome.storage.sync + localStorage cache
      dom.ts                waitFor(), keep(), h() element helper
      bridge.ts             call(): typed request/response to main-world.ts
      selectors.ts          YouTube selectors used from JS, named
      icon.ts               <span> masked by a Figma icon
      i18n.ts               local(): a feature's string table entry for YouTube's UI language
    page/                   page world, shared
      youtube.ts            ytcfg, innertube(), walk/find/text over YouTube data, endpoints map
      core.ts               handlers several features use: signedIn, stamp, stampTabs, navigate, ping
    theme/
      tokens.css            --kyt-* design tokens + overrides of YouTube's --yt-spec-* vars
    icons/*.svg             exported from Figma (npm run icons)
    features/
      index.ts              the ONLY list of features (popup order)
      page.ts               the ONLY list of page-world handlers (core + each feature's page.ts)
      <id>/index.ts         the Feature
      <id>/style.css        its CSS, every rule gated by html[kyt-<id>]
      <id>/page.ts          optional: its page-world handlers
      <id>/*.ts             optional: pure logic, unit tested (sidebar/nav.ts, timeline/dates.ts)
    popup/
      popup.html
      popup.ts              renders toggles/options from the feature list
  test/*.test.ts
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Kempt for YouTube",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": ["https://www.youtube.com/*"],
  "action": { "default_popup": "popup.html" },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_start"
    },
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["main-world.js"],
      "run_at": "document_start",
      "world": "MAIN"
    }
  ]
}
```

No background service worker. Nothing needs one.

---

## 4. Core model

### 4.1 Feature contract

```ts
// src/core/feature.ts
export type Route =
  | "home"
  | "watch"
  | "shorts"
  | "subscriptions"
  | "search"
  | "channel"
  | "playlist"
  | "other";

export interface Ctx {
  signal: AbortSignal; // aborted when the feature turns off or leaves its routes
  option<T>(key: string): T; // live option value
  call: typeof call; // typed call to a page-world handler (features/page.ts)
}

export interface Feature {
  id: string; // also the CSS gate: html[kyt-<id>]
  label: string; // shown in popup
  defaultOn: boolean;
  routes?: Route[]; // omit = all pages
  options?: Record<string, Option>; // popup controls: boolean | color | number; `cssVar` ones are written to <html>
  run?(ctx: Ctx): void; // omit for CSS-only features
}
```

Rules for `run()`:

- Pass `{ signal: ctx.signal }` to every `addEventListener`, `waitFor`, observer helper.
- On abort, remove what you added and put back what you moved (`ctx.signal.addEventListener('abort', undo)`).
- Need to react to watch → watch navigation (new video)? Listen to `kyt:navigate` on `document` with the same signal.

### 4.2 Runner (in `feature.ts`, ~40 lines)

On startup, on every settings change, and on every route change:

```
for each feature:
  enabled  = settings.features[id] ?? defaultOn
  html.toggleAttribute(`kyt-${id}`, enabled)          // turns its CSS on/off
  shouldRun = enabled && run && (!routes || routes.includes(route))
  if running && !shouldRun -> controller.abort()
  if !running && shouldRun -> controller = new AbortController(); run(ctx)
```

### 4.3 CSS gating

Every rule in `features/<id>/style.css` is prefixed with `html[kyt-<id>]`:

```css
html[kyt-subscribe-red] ytd-subscribe-button-renderer button:not([subscribed]) { ... }
```

All feature CSS ships in one `content.css` that the manifest injects at `document_start`, before YouTube paints. Toggling a feature flips one attribute. No style injection at runtime, no flash.

To avoid a flash before `chrome.storage` answers (async), `settings.ts` mirrors the enabled set to `localStorage['kyt:flags']` and `content.ts` reads it synchronously at `document_start`. Storage stays the source of truth.

### 4.4 Router

```ts
routeOf(url): Route   // pure, unit tested
// '/watch' -> watch, '/shorts/..' -> shorts, '/feed/subscriptions' -> subscriptions, ...
```

Listens to `yt-navigate-finish` (YouTube fires it on every SPA navigation) and `popstate`. Dispatches `kyt:navigate` with `{ route, url }`.

### 4.5 DOM helpers

```ts
waitFor(sel, { root = document, signal, timeout = 10_000 }): Promise<Element>
```

One `MutationObserver` on `root` only, disconnects on match, abort, or timeout. On timeout it logs `kyt: selector "<name>" not found`, which is your early warning when YouTube changes markup.

Observers that repair YouTube's re-renders (`keep()`, the `stamp` handler) write inside the `MutationObserver` callback itself. It runs before the next paint, while a `requestAnimationFrame` delay can paint the un-repaired DOM for one frame, which shows as flicker. The MutationObserver already batches records, so the repair work stays cheap: one small `querySelectorAll` and an idempotent position check.

### 4.6 Selectors

```ts
// src/core/selectors.ts
export const S = {
  masthead: "ytd-masthead",
  mastheadEnd: "ytd-masthead #end",
  guide: "ytd-guide-renderer #sections",
  watchFlexy: "ytd-watch-flexy",
  secondary: "ytd-watch-flexy #secondary-inner",
  comments: "ytd-watch-flexy ytd-comments#comments",
  liveChat: "ytd-live-chat-frame#chat",
  subscribeBtn: "ytd-subscribe-button-renderer, yt-subscribe-button-view-model",
  // ...
} as const;
```

JS features import names from here. CSS selectors live in each feature's `style.css`, next to the rules that use them. YouTube's 2025 markup uses camelCase classes (`ytSpecButtonShapeNextFilled`, `ytSearchboxComponentInputBox`, `ytChipShapeActive`); prefer those and structural selectors over localized `aria-label`s.

Feature CSS may use `!important`: it has to beat YouTube's own rules, and every rule is gated by `html[kyt-<id>]`.

### 4.7 Bridge to the page world

Content scripts cannot see YouTube's JS objects (`ytcfg`, Polymer `.data` on elements). `main-world.ts` runs in the page and answers `ctx.call(name, ...args)` with a handler from `features/page.ts`:

- `src/page/core.ts` has the shared ones: `signedIn`, `stamp(sel)` (kyt-icon="SHARE" etc., kept across re-renders), `stampTabs(sel)` (kyt-tab="shorts" on channel tabs), `navigate(url)` (SPA navigation via YouTube's `yt-navigate`).
- A feature that needs the page world adds `features/<id>/page.ts` exporting an object of handlers, and spreads it into `features/page.ts`. Examples: `sidebar/page.ts` (`guide`, `ytIcon`, `playlists`), `watch-later-btn/page.ts` (`inWatchLater`, `setWatchLater`), `watch-tabs/page.ts` (`relayout`, `askAi`).
- `src/page/youtube.ts` holds the helpers they share: `cfg()`, `innertube(endpoint, body)` with SAPISIDHASH auth, `walk`/`find`/`text` over YouTube's data, and the `endpoints` map `navigate` follows.

`call` is typed from the handler map: a wrong name, wrong arguments or wrong result type fails `npm run check`. Handler names must be unique; `test/structure.test.ts` checks that and that every `page.ts` is registered.

Transport: `CustomEvent` on `document` with a JSON string in `detail` plus a request id. Strings, because Firefox drops object `detail` across worlds. So arguments and results are plain data, never elements: pass a selector, get back a boolean or JSON. Event names carry the build id (lesson 27).

Stamping exists because YouTube's `aria-label`s are localized. The icon type in the element's data (`SHARE`, `PLAYLIST_ADD`, `VIDEO_CALL`) is the same in every language. It runs only on small, known containers (masthead, guide, watch action row).

### 4.8 Design tokens

```css
/* theme/tokens.css */
html {
  --kyt-accent: #e5213a; /* "selected" color everywhere, user-configurable */
  --kyt-selected-bg: #322629; /* selected sidebar item + feed chip background (dark) */
  --kyt-subscribe-bg: #cb274a;
  --kyt-subscribe-fg: #fff;
  --kyt-radius: 10px;
  --kyt-outline: 1px solid var(--yt-spec-10-percent-layer);
}
html[kyt-accent] {
  --yt-spec-static-brand-red: var(--kyt-accent);
  --yt-spec-call-to-action: var(--kyt-accent);
  /* + progress bar, chips, tabs: see accent/style.css */
}
```

Light theme (`html:not([dark])`) uses a light pink-red selected background: `--kyt-selected-bg: #fbe3e8`.

When the user picks a custom accent, `--kyt-selected-bg` becomes `color-mix(in srgb, var(--kyt-accent) 18%, var(--yt-spec-base-background))` (12% on light) so it follows the accent. With the default accent it stays `#322629` / `#fbe3e8`.

Selected item text and icon use `--kyt-accent`.

### 4.9 Popup

`popup.ts` imports `features/index.ts` and renders one toggle per feature plus its `options`. A new feature appears in the popup with no popup changes.

Layout (decision 27): cards per `group` (`GROUPS` in `core/feature.ts`: Look, Navigation, Watch page, Feeds; none = Other), one 48px row per feature with its `icon` (src/icons name), `label`, optional muted `hint`, and an accent switch. Options open in a panel under the row (chevron). A feature whose only option is a color shows a dot in its row that opens the picker (`popup/color.ts`: swatches, hue/saturation wheel, brightness slider, hex field). Choice options are a segmented control. Live color drags save at most every 400ms (storage.sync allows 120 writes a minute).

---

## 5. Features

Legend: **CSS** = stylesheet only. **JS** = needs `run()`. **MW** = needs the main-world bridge.

| id                | Your request                                                               | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Kind                    | Risk                                                                                      |
| ----------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `accent`          | All selected accents red, custom accent color                              | Token overrides of `--yt-spec-*` vars + targeted rules for chips, tabs, progress bar. Color option in popup.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | CSS                     | Low                                                                                       |
| `selected-bg`     | Selected background `#322629` (dark) / light pink-red (light)              | Sidebar entries (`[active]`) and the selected feed filter chip. Text and icon in accent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | CSS                     | Low                                                                                       |
| `subscribe-red`   | Subscribe `#CB274A`, white text                                            | Style unsubscribed state only. Subscribed state stays neutral.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | CSS                     | Low                                                                                       |
| `search-bar`      | Magnifier left, mic inside, outline only                                   | Flex `order:-1` on search button, remove grey segment, mic absolutely positioned inside the box, single outline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | CSS                     | Medium (YouTube switched to `yt-searchbox` in 2025; cover both)                           |
| `create-icon`     | Create button icon only                                                    | Hide label text, square button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | CSS + MW stamp          | Low                                                                                       |
| `action-icons`    | Share/Save icon only                                                       | Hide label text on buttons stamped `SHARE` / `PLAYLIST_ADD`. Force Save out of the overflow menu when space allows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | CSS + MW stamp          | Medium                                                                                    |
| `watch-later-btn` | Watch later button beside ⋯                                                | Insert button into the action row. Click → `bridge.addToWatchLater(id)`, toast on success. v2: show filled state via `get_add_to_playlist`.                                                                                                                                                                                                                                                                                                                                                                                                                                                         | JS + MW                 | Medium (innertube auth: SAPISIDHASH from cookie)                                          |
| `settings-topbar` | Settings button beside avatar                                              | Insert `<a href="/account">` icon before the avatar in `#end`. Hide guide's Settings entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | JS + CSS                | Low                                                                                       |
| `sidebar`         | Explore under Home as dropdown; Subscriptions dropdown; Playlists dropdown | Render one `kyt-guide` block from `bridge.guideData()`: Home, Explore ▾ (Music, Movies & TV, Gaming, News, Sports, ...), Subscriptions ▾ (all channels), Playlists ▾ (all playlists). Arrow toggles open state, saved in settings. Native duplicate sections hidden by CSS. Active item from current URL.                                                                                                                                                                                                                                                                                           | JS + MW                 | Medium (guide re-renders on login/locale; re-render on `yt-guide-*` updates)              |
| `watch-tabs`      | Info / Comments / Ask AI / Live chat / Videos as tabs on the right         | Tab bar at top of `#secondary-inner`. Move (not clone) description, `ytd-comments`, AI panel, `#chat`, related into panels. Tab = icon + label: Info, Videos, Live chat, Ask AI show their name; Comments shows only its icon + total count. Selected tab: white background, dark text, and its icon swaps to the checklist icon (same slot, so width doesn't jump). Hidden tabs keep layout (`content-visibility: hidden`) so YouTube's lazy loaders still fire when shown. Ask AI tab only when option is on AND the panel exists. Live chat tab only on streams. On abort, move everything back. | JS                      | High (most DOM-coupled; reference: "Tabview YouTube" userscript by CY Fung on Greasyfork) |
| `shorts`          | Hide Shorts; Shorts links open as normal video                             | CSS hides shelves (`ytd-reel-shelf-renderer`, `ytd-rich-shelf-renderer[is-shorts]`, `grid-shelf-view-model`), guide entry, chips, search results. JS: capture-phase click on `a[href^="/shorts/"]` → `bridge.navigate('/watch?v=ID')`; `yt-navigate-start` to a shorts URL → same; direct load of `/shorts/ID` → `location.replace` at `document_start`.                                                                                                                                                                                                                                            | CSS + JS + MW           | Low (reference: "YouTube Shorts Redirect" userscripts on Greasyfork)                      |
| `font` | One typeface for YouTube's UI (popup choice) | `@font-face` per subset from `fonts/*.woff2` (web-accessible) injected by `run()`; one `!important` `font-family` rule on `body *` minus captions and code | CSS + JS | Low |
| `grid` | Videos and Shorts per row (popup numbers) | CSS overrides YouTube's inline `--ytd-rich-grid-*-per-row` with `!important` on `ytd-rich-grid-renderer`, sections and shelves; equal item margins. Home only: MW `shortsPerRow` sets the Shorts shelf's `elementsPerRow` and re-sets it on `elements-per-row` changes | CSS + JS + MW | Low |
| `subs-timeline`   | Subscriptions page as dated timeline                                       | Route `subscriptions` only. Hide native items, keep the native continuation spinner visible below our list so infinite scroll still loads. Scoped observer on the grid `#contents` reads each new item (title, thumb, channel, duration, relative date), buckets by day, renders: red dot + date, vertical line on the left, that day's videos beside it.                                                                                                                                                                                                                                           | JS (+ MW for item data) | Medium (see 7)                                                                            |
| `icons`           | Consistent icon set | `index.ts` writes `--kyt-i-<name>: url(<extension URL>)` on `<html>` (CSS can't build the per-install URL). `style.css` turns each YouTube icon box into `background: currentColor` masked by `var(--kyt-i)` and hides its children. Masthead and like/dislike by structure, Share/Save/Download/Clip by stamped `kyt-icon`. Sidebar draws its own. | CSS + MW stamp | Medium |

### Extensibility check: custom progress bar later

```
src/features/progress-bar/index.ts
src/features/progress-bar/style.css   (html[kyt-progress-bar] .ytp-progress-bar ...)
src/features/index.ts                 + import progressBar
```

```ts
export const progressBar: Feature = {
  id: "progress-bar",
  label: "Custom progress bar",
  defaultOn: false,
  routes: ["watch"],
  options: { height: { type: "number", default: 4 } },
};
```

No core file changes. It appears in the popup, it gets `--kyt-accent` for free, and it shuts off cleanly.

---

## 6. Performance budget

| Metric                       | Target                                | How we hold it                                                         |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `content.js` + `content.css` | < 60 KB total                         | No framework, icons as one generated CSS file                          |
| JS per navigation            | < 5 ms scripting                      | Route gating; CSS does most work                                       |
| Long tasks added             | 0                                     | small observer roots, idempotent writes, no sync layout reads in loops |
| Observers alive              | Only scoped ones for running features | `waitFor` disconnects; signals abort the rest                          |
| Timers / polling             | None                                  | YouTube events only                                                    |

Check with Chrome DevTools Performance panel on Home, Watch, Subscriptions, with the extension on vs off.

---

## 7. Known risks

1. **YouTube A/B tests and DOM churn.** Two markup generations live side by side (Polymer `ytd-*` and newer `yt-*-view-model`). `selectors.ts` lists both. `waitFor` timeouts log which name broke.
2. **Subscription timeline dates are relative.** YouTube shows "3 days ago", "1 week ago". Day buckets are exact for under a week. Older items group as "1 week ago", "2 weeks ago". Exact dates would need one request per video, which breaks the budget. Ages parse in any UI language (decision 29).
3. **Watch Later API** uses innertube with a SAPISIDHASH header. Many userscripts do this; it can break if YouTube changes auth. Fallback: open the native Save menu and click Watch later.
4. **Ask AI panel** is an experiment not every account has. Its engagement-panel `target-id` must be confirmed on an account that has it.
5. **Icon license.** Confirm the Figma community file's license allows redistribution in an extension.

---

## 8. Phases

Each phase ends shippable.

| #    | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Done when                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 0    | Scaffold: manifest, build, core (feature runner, router, settings, dom, bridge, selectors), tokens, popup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Empty feature list loads on YouTube with no errors; popup renders                                                |
| 1 ✅ | CSS wins: `accent` (+ custom color), `selected-bg`, `subscribe-red`, `search-bar`, `create-icon` (pulled forward: no stamping needed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Toggling each in popup applies/removes instantly                                                                 |
| 2 ✅ | Stamping + `action-icons`, `settings-topbar`, `watch-later-btn`. Verified signed in, in two UI languages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Works in English and one other UI language                                                                       |
| 3 ✅ | `shorts` (History keeps its Shorts). Known gap: the search "Shorts" filter chip stays (no language-independent marker)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | No Shorts visible anywhere; every Shorts entry point opens `/watch`                                              |
| 4 ✅ | `sidebar`: own renderer with Explore, Playlists, Subscriptions dropdowns, footer toggle, mini guide. Notes in §11. New-uploads dot on channels | Dropdowns work, hidden entries toggle live from the popup, active item highlights, SPA navigation                |
| 5 ✅ | `watch-tabs`, `comment-sort`, Download icon-only, Ask AI setting, playlist panel inside Videos. Notes in §12 | All tabs work on normal video, stream, premiere; theater and narrow layouts; toggling off restores native layout |
| 6 ✅ | `timeline` (Subscriptions + History, §10.12). Subscriptions toolbar: type chips + search (§10.25). User-verified signed in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Infinite scroll keeps appending to the right day                                                                 |
| 7 ✅ | `icons`: masthead + watch action row (sidebar and mini guide already draw Figma icons). Missing Figma icons in Next up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | No original YouTube icon left in masthead, guide, watch action row                                               |
| 8 ✅ | Localization: `core/i18n.ts` string tables (11 languages), Intl-based age parser, language-free Live chip (§10.29) | Subscriptions headers and chips work in a non-English UI language |
| 9 ✅ | Website and docs: Astro + Starlight in `site/`, GitHub Pages workflow, README rewrite (§10.31) | `cd site && npm run build` passes; Pages deploys on push |
| 10 ✅ | `grid`: videos and Shorts per row on every rich grid, Home Shorts shelf via `shortsPerRow` (§10.32). Videos user-verified signed in | Rows aligned at 2 to 8; Home Shorts shelf fills the row |
| 11   | `font`: bundled variable fonts (Plus Jakarta Sans default, Inter, Geist, Figtree, System), popup choice list with previews (§10.33) | Every UI text in the chosen font; captions untouched |

Tests: `node --test` for `routeOf`, `bucketByDay`, `shortsIdFromUrl`. Everything else is a manual checklist per phase.

Dev checks (logged-out YouTube in local Firefox, all features on, no extension install):

- `node scripts/shot.mjs <url> <out.png> [selector] [--light] [--off]` screenshots the page or one element.
- `node scripts/probe.mjs <url> <file.js> [--hover=sel] [--shot=out.png:sel]` runs a snippet in the page and prints its return value (computed styles, rects). Hover and shot happen after the snippet, so it can emulate main-world stamping or inject signed-in-only elements first.
- `scripts/dump-dom.js` pasted in your signed-in console downloads a trimmed DOM sample for signed-in-only UI.

---

## 9. Getting the icons out of Figma

Done: `node scripts/fetch-icons.mjs` (alias `npm run icons`) exports the `Icons` component set (9:8208, 133 variants) to `src/icons/`. Names are `<name>[-<quality>][-<direction>][-selected][-disabled].svg`, e.g. `home.svg`, `home-selected.svg`, `arrow-down.svg`. All 24x24, white fill, used as CSS masks so color comes from `currentColor`. Re-run after the Figma file changes.

Watch-tab icons: `info`, `comments`, `chat` (live chat), `list` (related videos), `check` (selected-tab checkmark). Not in the set: Ask, Thanks, Movies, Memberships, Podcasts, Shopping, Help, Feedback, Your videos. `node scripts/fetch-hugeicons.mjs` (chained in `npm run icons`, no token) adds them from Hugeicons Stroke Rounded (free, MIT, pinned `@hugeicons/core-free-icons` version, fetched from jsDelivr). Its `ICONS` map is file name -> Hugeicons name; `--out=/tmp/hi Name ...` fetches candidates for a contact sheet. It refuses to overwrite a Figma icon.

Figma API access works: token in `.env` as `FIGMA_TOKEN` (gitignored). File key `67JrsVl1sPE1qzZZL0iuNG`; page `Design` (0:1) has frames Home 4:11081, Video 29:9551, Subs 96:3679, Search 117:7228, Shorts 156:7879, Components section 273:10907. Figma specs used so far: search pill 40px tall, 1px `#2a2a2a` outline, icons 15px from each end; icons 24px; sidebar row 45px, radius 10, Roboto 17/500, icon–label gap 20.

Option B (scripted): `GET https://api.figma.com/v1/images/:fileKey?ids=<nodeIds>&format=svg` with a personal access token, then download each URL. Worth it only if the set will change often.

---

## 10. Decisions

1. `#322629` is the dark-mode selected background, used on the sidebar and the selected feed chip. Red (`--kyt-accent`) colors selected text/icons and indicators.
2. Light mode supported; selected background is light pink-red `#fbe3e8`.
3. Watch tabs: the selected tab's icon becomes the checklist icon. Comments tab = icon + total count, no label.
4. "Videos" tab = related videos.
5. Chrome + Firefox 128+. No Safari.
6. Default accent is `#cb274a`, the Subscribe red, so the palette has one red. Subscribe follows the accent if the user changes it.
7. Selected/hover background comes from Figma: `#ffaabb` @ 14% over `#111` = `#322629`. We use a translucent tint `--kyt-tint = color-mix(accent 40%, #fff)` (≈ `#eaa9b7`) at 14% dark / 30% light, so it works on any background and follows a custom accent. Hover uses the same tint as selected. Chips use a stronger 30%/55% tint because unselected chips are already grey.
8. Every masthead icon button (old `yt-icon-button` and new button shapes) gets the same tinted hover circle.
9. Selected sidebar/chip text stays primary color; only the icon turns accent. Accent text on the dark tint is under 3:1 contrast.
10. Sidebar order: Home, Shorts, Explore | History, Liked, Downloads, Watch later, Playlists | Subscriptions (nav.ts `LIBRARY`). The collapsed sidebar is our own render of the same groups as icons; Explore there opens the full sidebar with Explore expanded. The foot dropdown opens above a static divider (bottom-aligned wipe).
11. Watch tabs: Videos is the default tab on load. Title, channel row and actions stay under the player; only the description moves into Info. Tab visuals wait for the user's Figma design (same file); the selected-tab icon is decided there.
12. Phase 6 is one feature, `timeline`, on Subscriptions and History (Figma Subs 96:3679, History 100:9034). It replaces `subs-timeline`.
13. Timeline toolbar: type chips (All, Videos, Live, Shorts) and a search box, both filtering loaded items only. No Newest/Oldest or Date range: the feed loads newest-first, so those would need the whole feed (perf budget). Posts chip only if posts show up in the feed.
14. Subscriptions dates: exact day under one week ("Today - 15 Dec 2024", "Yesterday - 14 Dec 2024"), then YouTube's own relative groups ("1 week ago", "2 weeks ago", "1 month ago"). No per-video date requests.
15. History uses the same card grid and timeline as Subscriptions, on YouTube's own day groups (exact dates).
16. Dropped: Figma's Collections tab (PocketTube covers it). Planned later: "View as: Channels". Return YouTube Dislike works alongside as is (decision 30).
17. Subscriptions shelves: "Most relevant" is hidden (its items are duplicates of feed items, checked in `kyt-subs-order.json`); "Latest" header hidden (its items are the feed's first row). Shorts shelf stays, moved to the top (only shown when `shorts` is off). History keeps its Shorts row inside each day. "N days ago" groups by day up to 13 days (YouTube rounds down); weeks and older are relative groups. Groups only move back in time: a stream labelled by start time, or "Scheduled for ...", stays in the current group. Other UI languages parse through Intl (decision 29).
18. Timeline dot fill marks the group you're reading (lowest header above mid-screen, one IntersectionObserver), not "today". 200ms fade, off under reduced motion.
19. Icons: Figma's set replaces YouTube's by masking YouTube's own icon box (its svg stays, hidden), so buttons keep their behavior and toggling off restores them. Save maps to the bookmark (`save`), the action row ⋯ is `more` rotated 90°, like/dislike use the `-selected` fill when pressed. Icons Figma lacks come from Hugeicons (10.23); anything still unmapped keeps YouTube's.
20. Page world is split like the isolated world: `main-world.ts` is a 20-line dispatcher, handlers live in `src/page/core.ts` (shared) and `features/<id>/page.ts`, listed once in `features/page.ts`. `call` is typed from that map, so renames and argument changes fail `tsc`. Chosen over one growing `main-world.ts` (it had reached ~300 lines mixing six features) so a feature's page code sits in its folder and can be deleted with it. Conventions are enforced by `test/structure.test.ts`, not by review.
21. Watch tabs: the playlist panel (Watch later, any list) belongs to the Videos tab. It sits above `#related` in both layouts and hides in every other tab; theater keeps it. Hiding beat minimizing: a collapsed header inside Comments could be expanded over the comments again. The same goes for anything else in `#secondary-inner` (donation shelf, future shelves): other tabs keep a whitelist (bar, own box, `#panels`, `#chat-container`), so new shelves never stack under a tab's scroller.
22. Sidebar new uploads: YouTube's 4px blue dot (`--yt-spec-call-to-action`) on channels flagged `NEW_CONTENT`, and on the closed Subscriptions row. No count: guide data has none, and counting would mean fetching every channel's uploads and tracking what was seen.
23. Hugeicons fill the Figma gaps. Juxtopposed's set has the same 1.5px rounded strokes (checked side by side), while Google Material reads too bold next to it. Hugeicons have no filled `-selected` variant, so the sidebar keeps their outline when selected (`NO_SELECTED`). The Playlists dropdown uses Figma's `library` (same stacked-play shape as Material's `video-library`, which was dropped).
24. Sidebar dropdown children (Subscriptions, Playlists, Explore): a 1px `--kyt-outline` guide line under the parent's icon centre, 12px step in, 36px rows, 13px text, 20px icons/avatars. Figma's open frames (`subs` 23:8476, `playlist` 101:6399) show flat children, so this is our call; picked from three mocks (flat, smaller without rail, rail) by the user. The foot dropdown is unchanged.
25. Subscriptions toolbar (`kyt-bar`, first row of YouTube's grid, `order: -2`): chips All, Videos, Live, Shorts on the left, search pill on the right (Figma 97:3987, 97:3966). Items that miss get `kyt-off`; a date header whose group is empty gets it too; shelves hide for Videos, Live and any search. The Shorts chip is hidden when the `shorts` feature is on. Kind: `/shorts/` link = Short, live thumbnail badge or a streamed/watching/scheduled word = Live, else Video. Filters only what is loaded. YouTube loads the next page whenever its continuation row is on screen, and with most items hidden the row never leaves it, so the feed loaded to its end and froze the tab. Fix: while filtering the continuation row is hidden (`kyt-more` on the grid shows it) unless fewer than 24 items match and fewer than 300 are loaded; never for the Shorts chip.
26. Subscribe bell (watch page): YouTube draws one Lottie icon for all three states, so `stampBell` (src/page/core.ts) sets `kyt-bell="all|none"` from the toggle's data (`states[currentStateId]` icon type NOTIFICATIONS_ACTIVE / NOTIFICATIONS_OFF; personalized has no stamp). Glyphs: Figma `notifs-selected` (all), `notifs` (personalized), `notifs-disabled` (off). Data shape is a guess from the old renderer: `scripts/bell-dump.js` prints it if the state never changes. Channel-page Subscribe (`yt-subscribe-button-view-model`) not covered yet.
27. Popup redesign: grouped cards, switches, chevron panels, custom color wheel in place of `<input type=color>` (the native dialog looked out of place). Picked by the user from a mock (wheel + brightness over square + hue bar or swatches only). Popup is dark only and follows the chosen accent. Footer has the version and a two-click Reset all.
28. Player controls keep YouTube's native icons (user decision). The Figma set has play, pause, next, volume, cc, settings, theater, fullscreen and pip glyphs, unused.
29. Localization: strings we draw follow YouTube's UI language (`html[lang]`, not the browser's), through `local()` in `src/core/i18n.ts`. Each feature owns a `WORDS` table typed `Record<Lang, T>` (en + es, pt, de, fr, ru, ja, ko, hi, id, tr), so a missing language fails `tsc`. Other languages get English. Chip, Videos and Comments words are YouTube's own (search chips, comments header); the rest are ours. Watch tab labels stay short ("Chat", "Info") and ellipsize in their equal columns. Ages: `parseAge(text, locale)` builds one regex from `Intl.RelativeTimeFormat` (long, short, narrow, every plural form), which matched YouTube's long aria-label form in all ten languages; English compact forms ("7 hr ago") keep their own regex. Live chip without word lists: badge `.ytBadgeShapeThumbnailLive` = on now; words around the age ("Streamed 2 weeks ago", "vor 2 Wochen gestreamt") = past stream; no age at all ("Scheduled for", "Geplant für") = upcoming, but only if some feed item had an age (else the language is unreadable and everything stays Video). Premieres ("Premiered 2 days ago") count as Live. The popup stays English.
30. Return YouTube Dislike needs no work: its count shows in our dislike button, its ratio bar sits under the pill, and its raw-count box in `#secondary-inner` belongs to the Videos tab by the whitelist (21). Checked with `ext.mjs --with=ryd.xpi` (AMO `return-youtube-dislikes/latest.xpi`) and by the user's daily use.
31. Website and docs: Astro + Starlight in `site/`, deployed to GitHub Pages (`remonilo.github.io/kempt-yt/`) by `.github/workflows/pages.yml` on pushes to `site/**`. Landing at `/` (own page, Sonora-style hero) lists features on a vertical timeline like the Subscriptions one: dot per group, the group in view gets the accent dot. Docs at `/docs/` in Rift-docs style; the "How it works" pages mirror §1 and §4 of this file, so update them when the core model changes. Screenshots live in `site/public/screenshots/` (committed) and are shared with the README.
32. Grid size (`grid`, off by default): one count for every `ytd-rich-grid-renderer` (Home, Subscriptions, channel tabs). CSS only: YouTube writes `--ytd-rich-grid-items-per-row` inline, a stylesheet `!important` on the same element wins and item widths follow. Search and History are lists, not grids, so they're out. YouTube drops the left margin of items it counted as first in a row; with our count that misaligns rows, so every item gets equal margins. Home's Shorts shelf sizes by `items-per-row` and draws only `elementsPerRow` of its items (one row, `is-truncated`), so on Home a page-world handler (`shortsPerRow`) sets the shelf's `elementsPerRow` and sets it again whenever YouTube resets it (on resize, reflected to the `elements-per-row` attribute).
33. Font (`font`, on by default, Plus Jakarta Sans): the user asked for it as the default. Inter, Geist and Figtree are the alternatives (neutral grotesques that read well at YouTube's 12 to 14px), System uses `system-ui`. Fonts ship in the extension (OFL-1.1, Fontsource variable WOFF2, upright only: italics are synthesized), about 400 KB in total but only the subsets a page needs load. `scripts/fetch-fonts.mjs` regenerates `src/fonts/` and `features/font/faces.ts`. A choice with more than three options renders as a list in the popup; the font list previews each font.

---

## 11. Sidebar & search polish

Done (phase 4): all four below, plus Figma's `library` icon left of each playlist in the Playlists dropdown. Implementation notes:

- Foot: `.kyt-foot` in `sidebar/index.ts` replaces YouTube's `#footer` (hidden); footer links are rebuilt from its anchors. `ytd-guide-renderer` gets `min-height: 100%` and the foot `margin-top: auto`.
- Animations: `.kyt-nav-children` (grid wrapper) > `.kyt-nav-list`, shared by dropdowns and the foot. Lists fill before opening so the height animates to the real size. Arrow rotates instead of swapping icons.
- Suggestions: CSS only in `search-bar/style.css`, `--kyt-glass` token. Headless Firefox draws no `backdrop-filter`, so the blur is checked by hand.
- Mini guide: `miniGuideIcons()` generates one `<style>` with per-install icon URLs; entries are stamped via `stamp(S.miniGuide)`.

Sidebar build notes (moved from §8):

- Own renderer from `ytd-guide-renderer.data` in Figma's layout (Sidebar 92:4870, dropdown rows `subs` 23:8475 / `playlist` 101:6372) at YouTube's own sizes (40px rows, 14px labels, 24px icons).
- Popup options hide You, Your channel, Your videos, Courses (all on by default; boolean options gate CSS via `html[kyt-<id>-<key>]`).
- Icons the Figma set lacks are drawn by a hidden `yt-icon` (`ytIcon`); brand logos keep their colours.

Original requests:

1. **Footer trademark toggle for More from YouTube:**
   - Anchor at the very bottom of the sidebar.
   - Google LLC trademark text centered relative to the sidebar.
   - Trademark acts as a clickable trigger: clicking expands the divider above to reveal the More from YouTube entries, and turns the trademark text accent red.
   - YouTube Music and YouTube Kids styled on dedicated rows for legibility.
   - Clicking again collapses the section back into the divider.
2. **Performant dropdown animations:**
   - Add hardware-accelerated, lightweight animations across all dropdown interactions (Explore, Subscriptions, Playlists, and footer).
   - Use CSS `grid-template-rows: 0fr -> 1fr` or `max-height` transitions to avoid CPU layout thrashing and keep power draw negligible.
3. **Search suggestions alignment and surface styling:**
   - Align the search autocomplete results box precisely with the bounds of the redesigned pill searchbar.
   - Set suggestion container background to match the primary surface with semi-transparency (consistent with the scrolling masthead).
   - Keep styling strictly CSS-based for battery and rendering efficiency.
4. **Collapsed sidebar (mini-guide) consistency:**
   - When the sidebar is collapsed into the mini-guide, display only icons (remove text labels below).
   - Harmonize icons with the expanded sidebar state so disabled entries (such as "You") do not appear in the mini-guide.

---

## 12. Watch tabs notes

Build notes for phase 5 (moved from §8):

- Tab bar above the right column: Info, Comments (icon + count), Videos, Live chat on streams, Ask AI behind a popup option. White pill slides to the selected tab.
- Videos and chat are shown/hidden in place, so the chat iframe never reloads. Description and comments move into boxes after `#panels` and go back on abort.
- `/@name/live` routes as watch.
- In two columns the right column is one viewport tall and only the open tab scrolls, so the video stays in view. Single column scrolls the whole page.
- Cinema (theater) mode closes the open tab and remembers it; leaving cinema reopens it. Clicking a tab in cinema leaves cinema. Only a user click on a tab may click YouTube's cinema button (resets on navigation or Ask AI closing must not, or the player gets stuck half-switched). In cinema the bar aligns with the action buttons and is re-measured on theater toggle, title wrap and resize.
- Close (X) hidden on chat and Ask panels. The chat X lives inside the chat iframe, so a hiding rule is injected into the frame on each load.
- `comment-sort`: Top/Newest chips beside the comment count click YouTube's hidden sort menu items, so labels follow the UI language.

---

## 13. Lessons (mined from the phase 0 to 5 session)

Things that already cost a debugging round. Check here before "fixing" something odd.

YouTube DOM:

1. `--yt-spec-*` vars are not defined at the page root. Feature CSS uses our `--kyt-*` tokens.
2. Selected sidebar background goes on `ytd-guide-entry-renderer[active]` itself (YouTube's squircle), never the inner `tp-yt-paper-item`.
3. YouTube stacks its own hover layers: 10% white on guide `#endpoint`, 1px rim on active rows, 20% white on `ytd-notification-topbar-button-renderer`. Clear each on its own element. Never clear masthead hovers with a broad `#buttons > *:hover` rule (it kills our `.kyt-settings` hover). Old `yt-icon-button` hovers via `yt-interaction`; button-shape components differ; cover both.
4. Search box: YouTube adds a second magnifier on focus (hide it); the grey mic circle is the `#voice-search-button` wrapper. Setting `input.value` does not open suggestions; use real key events (`ext.mjs --type=`).
5. Signed in, YouTube keeps a 6px right margin after Share/Save icons; our `margin: 0` needs `!important`.
6. Signed in, YouTube redraws masthead `#buttons` (when Notifications arrives) and the action row (when Ask/`SPARK` arrives, and on the Subscribe animation) and drops nodes it didn't create. Anything inserted there goes through `keep()` in `src/core/dom.ts`.
7. Isolated scripts can't read Polymer `.data` (Xray). Stamping, guide data and comment count run in `src/main-world.ts`.
8. Trusted Types blocks `innerHTML`. Build nodes with `h()`.
9. `ytcfg` exists at `document_start` but `LOGGED_IN` is set later. `signedIn` must wait for a value, or features skip silently.
10. `ytd-guide-renderer` doesn't exist on watch pages or when the sidebar starts collapsed (< ~1312px) until the drawer opens. `guide()` falls back to one innertube guide request per page load.
11. Signed-in guide data links only to `/feed/playlists`; the Playlists dropdown fetches playlists on first open. Guide data lacks Settings, Help, Send feedback.
12. Entries behind YouTube's "Show more" (e.g. Memberships) have no drawn icon. `ytIcon` waits (~50 × 100ms) for the hidden `yt-icon` to render.
13. Masking flattens multicolour brand icons (Premium, Music, Kids). Detect a non-`currentColor` fill and render as `<img>`.
14. Comment count comes from the comments engagement panel's `contextualInfo` (short form, "2.4M"). It is stale for ~1s after SPA navigation. No panel = comments disabled = icon only.
15. Description has an inline min-width (~381px); override it. On streams hide `#teaser-carousel` and `#comment-teaser` when watch-tabs is on.
16. Theater toggles often don't change `#primary` width, so `ResizeObserver` won't fire. Re-align after the `theater` attribute changes, inside `requestAnimationFrame`.
17. Hidden `#sort-menu` items still work when clicked. Find items by index (the list re-renders); sync chips from `aria-selected`.
18. YouTube's continuation loaders use `IntersectionObserver` with a null root, so infinite scroll works inside our scroll containers. Add `overscroll-behavior: contain`.
19. Stamp channel tabs by URL slug, never title. Mini guide root exists early; its entries render lazily.

Tried and dropped:

20. Signed-in check via `SAPISID` cookie: replaced by `ytcfg LOGGED_IN`. The real bug was timing plus redraws.
21. rAF-deferred stamping/`keep()`: flashed full labels for one frame (see §4.5).
22. esbuild `dataurl` loader for SVG: broke on `"` and `#`, icons rendered as squares. Inlining base64 icons in `content.js` blew the 60 KB budget. Final: copy `src/icons` to `dist/icons`, load as `web_accessible_resources` via CSS `mask-image`.
23. Rewriting `fill` to `currentColor` in `fetch-icons.mjs`: pointless (masks use alpha only) and it fills shapes meant to be empty. Reverted.
24. `grid-template-rows: 0fr → 1fr` on an empty list animates to the wrong height. Fill lists before opening.
25. `setTimeout(Infinity)` fires immediately; `waitFor` needs an explicit no-timeout path.
26. Iterator helpers need Firefox 131; we target 128. Use arrays.

Testing:

27. Firefox keeps the old `main-world.js` running in open tabs after a temporary add-on reload (`TypeError: c[s] is not a function`). The per-build id in `build.mjs` + `src/core/bridge.ts` fixes it. Keep it.
28. `ext.mjs --remove` deletes our nodes to imitate a YouTube redraw. Each log line prints twice (first copy is a `robots.txt` load).
29. `probe.mjs` eval is blocked by CSP on Home (Search allows it). Wrap snippets as an IIFE.
39. Headless tests of Subscriptions: logged out there is no feed, so inject items into the grid. A created `ytd-rich-grid-renderer` or `ytd-rich-item-renderer` is upgraded by YouTube's own code, which stamps its template and wipes children added before. Add the metadata after about 1s. Content-script observers also seem to wait while `ext.mjs --eval` awaits, so inject in one `page.evaluate`, pause outside the page, then interact in a second one.
41. Logged out, YouTube ignores `?hl=` but follows Firefox's `intl.accept_languages`: `ext.mjs --lang=de`. Past-stream wording shows on a channel's `/streams` tab (`/@LinusTechTips/streams`), upcoming on `/@TheJapaneseTown-jt6fy/streams`. Feed ages are compact in text ("hace 11 m" is months) and long in `aria-label`: parse the label.
42. YouTube's lockup classes are camelCase (`ytBadgeShapeThumbnailLive`): a BEM `[class*="thumbnail-live"]` matched nothing, and the Live chip worked only through the English "watching" word.
43. Never put our elements between a rich grid's children. When the row count changes (sidebar toggle, resize), YouTube re-matches `#contents` children to its data by index (`reflowContent`) and `insertBefore`s every child that doesn't line up: one header near the top moved all 270 cards, a 1 s freeze signed in. Append ours after YouTube's children and place them with flex `order` (timeline headers).
40. Hiding feed items with CSS never shrinks the work YouTube does: its infinite scroll keys off the continuation row's visibility, so any filter that hides most items must also bound or hide that row.
30. Headless Firefox can't play live video; test chat on a live-now stream (e.g. Lofi Girl). Consent screens can hide chat. Launch and `waitFor` timeouts happen; retry before calling it a regression.
31. Console paste in Firefox needs `allow pasting` once. Console scripts save to Downloads or the clipboard.
32. When a fix works logged out but not for the user, ask for a `scripts/diag.js` report before guessing.
33. CleanShot and download paths may contain a narrow no-break space. Use globs or `ls`, not typed names.
34. Firefox sizes the action popup on its first layout. Build popup rows synchronously; `storage.sync` cold start is slow, and a popup that waited for it opened near-empty and closed (needed ~3 clicks). Headless Firefox cannot navigate to `moz-extension://` pages, so the popup needs a signed-in-side check.
35. YouTube's `updatePanelsLocation` (theater, fullscreen, column changes) wants `#panels`, `#chat-container`, `#playlist`, `#inline-panels` (plus `#shopping-timely-shelf`, `#persistent-panel-container` in `#below`) as the first children of their parent, in order. Anything we insert inside that run makes it re-insert every panel on each call, and our re-mount then moves heavy subtrees (comments re-render, chat iframe reload). Insert after the run; reorder with CSS. Trace DOM moves by wrapping `Node.prototype.insertBefore` in an `ext.mjs --eval` snippet (main world sees YouTube's calls, not ours).
36. `ext.mjs --scrollbars` forces classic scrollbars; headless defaults to overlay ones (0px wide), which hides scrollbar-width bugs.
37. Theater with live chat: `updateChatLocation` moves `#chat-container` into `#columns` and sets `[fixed-panels]` (chat `position: fixed; top: var(--ytd-masthead-height-accounting-for-hidden)`, `#columns` padding-right = sidebar width). The `web_watch_theater_chat` flag TabView flips is no longer read; `web_watch_theater_chat_beside_player` picks `#panels-full-bleed-container` instead. Logged-out live chat to test with: `/@LofiGirl/live`.
38. The watch action row's `ytd-menu-renderer` drops flexible items (Save, Download, Ask) into ⋯ from the end when the row wraps. Reassigning its `data` with reordered or filtered `flexibleItems` re-stamps the row cleanly; keep YouTube's original to restore on abort. Ask's item is found by `panelIdentifier: 'PAyouchat'` or icon `SPARK`. HTML lowercases attribute names: observe `kyt-watch-tabs-aias`, not `-aiAs`.
