---
title: Hide
description: Switch off the parts of YouTube that pull you into the next video.
banner:
  content: These docs are outdated and will be updated once v1.0 is released.
---

The **Hide** tab in the popup has one switch per part of YouTube, modelled on the Unhook extension. Every switch is off by default except [Shorts](/kempt-yt/docs/features/shorts/), and each works on its own.

| Page | Switches |
| --- | --- |
| Home | Home feed, Home chips, Subscriptions as Home |
| Sidebar | Explore (Music, Gaming, News and the rest), Subscriptions (entry, channel list and the feed page) |
| Watch page | Watch column, Related videos, Playlist panel, Live chat, Comments, Comment avatars, Description, Channel row, Action buttons, Merch and offers, End screen, Autoplay |
| Top bar | Notification bell, Create button |
| Everywhere | Mixes, Search extras (shelves such as People also watched) |

## With the watch page tabs

When [Tabs](/kempt-yt/docs/features/watch-tabs/) is on, a switch that empties a tab removes the tab: Comments, Live chat, and Videos once both related videos and the playlist panel are hidden. The page then opens on the next tab left, down to Info. Watch column hides the whole column right of the video, tabs included, so the video takes the page width. Hidden merch, tickets and fundraisers no longer put a dot on Info.

## Overlapping switches

Some switches hide what another already hides: Watch column covers Related videos, Playlist panel and Live chat (with Tabs on, also Comments, Description and Merch), Home feed covers Home chips, and Comments covers Comment avatars. The popup dims a covered switch and says which switch covers it.

## Subscriptions as Home

Opening `youtube.com`, clicking the logo or the Home entry goes to Subscriptions instead. Home never draws. With the Subscriptions switch also on, the feed page stays and only the sidebar entry and channel list go.

## Autoplay

Kempt turns YouTube's own Autoplay switch off and hides it, so YouTube remembers the choice like any click on the switch. Turning the Kempt switch off turns Autoplay back on if Kempt was the one that turned it off.

## How it works

Each switch is its own feature (`hide-<name>`, plus `subs-home`), so each adds one attribute to `<html>` and its stylesheet hides elements under it with `display: none`. Only three run code: Explore and Subscriptions stamp the icon types of YouTube's guide entries (titles are localized), Subscriptions as Home redirects, and Autoplay clicks the player's switch.

## Limits

- Search extras also hides a channel result's "Latest from" shelf: it has the same markup as People also watched.
- Hidden parts still load; they are only not drawn.
