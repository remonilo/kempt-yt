# Store listing (proposal)

Copy for the Chrome Web Store and Firefox Add-ons (AMO) pages. Images in this folder come from
`node scripts/store-art.mjs` (captioned) and `--plain` (full bleed); see `store/preview.html` for both stores laid out.

Rules this copy follows (sources in `samples/listing-research.md`): no superlatives, no other extensions or brands
named, no keyword lists, "for YouTube" naming plus a trademark line, permissions explained in plain words.

## Name

Kempt for YouTube

## Summary

Chrome (132 characters max, this is 119):

> A tidy, consistent redesign of YouTube: one accent color and icon set, comments beside the video, a feed sorted by day.

Firefox (250 max, this is 222):

> A tidy, consistent redesign of YouTube. One accent color and icon set, comments in a tab beside the video, readable captions and a Subscriptions feed sorted by day. Every change is a switch. No tracking, no data collected.

`manifest.json` description (also shown on Chrome's install prompt) stays short: "A tidy, consistent redesign of YouTube."

## Description

Same text on both stores. AMO renders a little Markdown-like markup; Chrome shows plain text, so this avoids both.

```text
Kempt restyles YouTube so it looks like one app: one accent color, one icon set, one font, even spacing. Every change is a switch in the popup, and turning one off puts YouTube's own page back at once, without a reload.

WATCH PAGE
• Info, Comments, Videos and Live chat share one panel beside the player. Only the open tab scrolls, so the video stays in view.
• Comment sort as two chips, and a search box for comments.
• A Watch later button next to Like and Share.
• A slimmer progress bar, with an optional wave while the video plays.

CAPTIONS
• White, semibold subtitles in your font, sized to the player.
• Soft shadow, dark box or blurred plate, from 50 to 200%.

FEEDS
• Subscriptions and History on a timeline with date headers: Today, Yesterday, 2 weeks ago.
• Pick how many videos fit in a row on Home, Subscriptions and channels.
• Search filter chips with a custom date range, results as a grid or a list.
• Open Subscriptions as your Home page, if you like.
• Shorts links open in the normal player, with a seek bar.

SIDEBAR AND TOP BAR
• Explore folds into a dropdown. Subscriptions and Playlists open in place.
• One outlined search bar, an accent Subscribe button, an optional accent logo.

HIDE WHAT YOU DON'T USE
Around 30 switches: Shorts, Home feed, Mixes, Playables, end screens, comments, live chat, the Create button, merch and more.

LOOKS LIKE YOUTUBE, ONLY TIDIER
Follows YouTube's light or dark theme and its interface language (11 languages).

PRIVACY
Kempt collects no data and has no server. It loads no remote code and runs no analytics.
• Permission "storage": saves your settings; your browser may sync them through your own browser account.
• Site access to www.youtube.com: Kempt runs there and nowhere else.
Requests go only to youtube.com, from your own page, the same ones YouTube's Save menu and sidebar send.

OPEN SOURCE
MIT licensed. Source, issues and docs: https://github.com/remonilo/kempt-yt
Docs: https://remonilo.github.io/kempt-yt/docs/

Kempt for YouTube is an independent project, not affiliated with or endorsed by YouTube or Google. YouTube is a trademark of Google LLC.
```

## Fields

| Field | Chrome Web Store | Firefox Add-ons |
| --- | --- | --- |
| Category | Entertainment or Art & design (see note) | Appearance |
| Language | English (+ the 11 UI languages if translated listings are added later) | English |
| Homepage | https://remonilo.github.io/kempt-yt/ | same |
| Support | https://github.com/remonilo/kempt-yt/issues | same |
| Privacy policy | https://remonilo.github.io/kempt-yt/docs/privacy/ | same |
| Tags | — | youtube, appearance, dark mode, redesign (AMO allows up to 10) |
| License | — | MIT |

Note on the Chrome category: I could not verify the dashboard's current category list. Pick Entertainment or
Art & design, whichever the dashboard offers; one category only (Google warns against spamming categories).

## Chrome privacy practices tab

- Single purpose: "Restyles YouTube's interface and lets the user hide parts of it."
- `storage` justification: "Saves the user's settings (which features are on, accent color, sizes)."
- Host permission justification: "Kempt only runs on www.youtube.com, where it applies its styles and reads YouTube's page data to build the sidebar and Watch later button."
- Remote code: No.
- Data collection: none of the categories. Certify all three statements (no selling, no unrelated use, no creditworthiness).

Firefox: `data_collection_permissions: { required: ["none"] }` is already in `manifest.json`.

## Screenshots, in order

1. `screenshot-1-home.png` Home grid with the sidebar ("YouTube, kept tidy")
2. `screenshot-2-watch.png` Watch page with the Comments tab ("Comments one click away")
3. `screenshot-3-captions.png` Captions ("Subtitles you can read")
4. `screenshot-4-subscriptions.png` Subscriptions timeline ("Your feed, by day")
5. `screenshot-5-settings.png` The popup over Home ("Every change is a switch")

AMO takes more than five; the same five work there (it shows them at 1.6:1, which 1280x800 is).

Promo images (Chrome only): `promo-small-440x280.png` (required for the listing to be eligible for featuring)
and `promo-marquee-1400x560.png` (optional, only used if Google features the extension).

## Open points for you

- The screenshots show the throwaway account's avatar and its Home feed. Reshoot with your account if you want your
  own feed in the store (`node scripts/shots.mjs --profile=<your profile> --with=<uBlock xpi>`).
- The captions shot is from logged-out Chromium with a stand-in caption track (headless Firefox never loads
  captions). The styling is the real one; the words are not from the video.
- The store icon (`src/brand/128.png`) fills the whole 128x128 square. Chrome asks for 96x96 artwork with 16 px of
  transparent padding, otherwise the icon looks larger than its neighbours in the store grid. A padded copy for the
  store upload is `store/icon-128-padded.png`.
