---
title: Privacy
description: What Kempt stores and sends. In short, nothing leaves your browser.
---

Kempt collects no data and has no server. It loads no remote code and runs no analytics.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Saves your settings. Your browser syncs them through your own browser account. |
| `https://www.youtube.com/*` | Runs Kempt on YouTube. It runs on no other site. |

## Network requests

Kempt sends requests only to `www.youtube.com`, from your page and with your session:

- The Watch later button and the notification panel's Watch later pill add or remove the video; the button also checks whether it is already saved. The panel's Share pill asks YouTube for its share panel. YouTube's own Save and Share menus send the same requests.
- The sidebar loads your sidebar entries when the page doesn't carry them yet, and your playlist list the first time you open the Playlists dropdown. YouTube's own sidebar and Save menu send the same requests.
- The Channels tab on Subscriptions loads your channel list when the sidebar hasn't, and its Subscribe and bell buttons send YouTube's own subscribe, unsubscribe and notification requests.
- A collection's feed loads each of its channels' Videos tab (the latest uploads) and, for channels that have one, the Live tab. These are the same requests YouTube sends when you open those tabs on the channel's page.
- Bulk select and the header buttons on playlist pages run YouTube's own playlist commands (delete, add to a playlist, add to the queue).

The answers stay in the page. Kempt keeps nothing from them.

## Collections

Your collections (their names and channel IDs) are saved in the browser's extension sync storage, next to your settings. They are not sent to YouTube or anywhere else.

## Local storage

Kempt mirrors your settings (which features are on and their options, such as the accent color) into the page's `localStorage` under `kempt-yt`. It reads that before YouTube draws the page, so the styles apply without a flash. It holds settings and nothing else.

## Contact

For questions about privacy, [open an issue](https://github.com/remonilo/kempt-yt/issues).
