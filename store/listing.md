# Store listing (proposal)

Copy for the Chrome Web Store and Firefox Add-ons (AMO) pages. The screenshots and promo tiles are designed in
PhotoCraft (`~/Documents/PhotoCraft/kempt-store/`, built by `node scripts/store-pcraft.mjs`) and exported here with
`node scripts/store-pcraft.mjs --export`. The `-plain` files (full bleed) come from `node scripts/store-art.mjs --plain`.
See `store/preview.html` for both stores laid out.

Rules this copy follows (sources in `samples/listing-research.md`): no superlatives, no other extensions or brands
named, no keyword lists, "for YouTube" naming plus a trademark line, permissions explained in plain words.

## Name

Kempt for YouTube

## Summary

Chrome (132 characters max, this is 120):

> Restyles YouTube in your accent color, with comments in a tab beside the video and a Subscriptions feed grouped by date.

Firefox (250 max, this is 152):

> Restyles YouTube in your accent color, with comments in a tab beside the video and a Subscriptions feed grouped by date. No tracking, no data collected.

`manifest.json` description (also shown on Chrome's install prompt): "Restyles YouTube in your accent color."

## Description

Same text on both stores. AMO renders a little Markdown-like markup; Chrome shows plain text, so this avoids both.

```text
Kempt restyles YouTube in your accent color. Each feature turns off on its own in the settings popup, and YouTube's page comes back without a reload.

WATCH PAGE
• Info, Comments, Videos and Live chat share one panel next to the player. Only the open tab scrolls.
• Comment sort as two chips, and a search box for comments.
• A Watch later button next to Like and Share.
• Optional progress bar styles: Wave, Snake, Comet or Paper boat.

CAPTIONS
• Captions in your font, with a shadow, a box or a blurred plate, from 50 to 200%.

FEEDS
• Subscriptions and History grouped under date headers. Subscriptions also gets type filters, search and a Channels tab.
• Collections: put channels in a group, such as Tech or Cooking, and get a feed of only those. Each collection has a sidebar entry.
• Pick how many videos fit in a row on Home, Subscriptions and channels.
• Search filter chips with a custom date range, results as a grid or a list.
• Open Subscriptions as your Home page, if you like.
• Shorts links open in the normal player, with a seek bar.

SIDEBAR AND TOP BAR
• Explore folds into a dropdown. Subscriptions and Playlists open in place.
• An outlined search bar and an accent Subscribe button. The logo can take the accent too.

HIDE PARTS OF YOUTUBE
Shorts are hidden by default and open in the normal player. The Hide tab in settings can also remove 22 other parts.

LANGUAGE AND THEME
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

1. `screenshot-1-home.png` Home grid with the sidebar ("Your accent color")
2. `screenshot-2-watch.png` Watch page with the Comments tab ("Tabs beside the video")
3. `screenshot-3-subscriptions.png` Subscriptions timeline, light theme ("Subscriptions by date")
4. `screenshot-4-collections.png` Collections tab ("Collections")
5. `screenshot-5-settings.png` The popup over Home ("Settings popup")

AMO takes more than five; the same five work there (it shows them at 1.6:1, which 1280x800 is).

Promo images (Chrome only): `promo-small-440x280.png` (required for the listing to be eligible for featuring)
and `promo-marquee-1400x560.png` (optional, only used if Google features the extension).

## Open points for you

- The store icon (`src/brand/128.png`) fills the whole 128x128 square. Chrome asks for 96x96 artwork with 16 px of
  transparent padding, otherwise the icon looks larger than its neighbours in the store grid. A padded copy for the
  store upload is `store/icon-128-padded.png`.
