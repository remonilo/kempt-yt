---
title: Top bar & Watch later
description: A Settings button beside your avatar, a Watch later button under the video, and Watch later and Share in the notifications panel.
banner:
  content: These docs are outdated and will be updated once v1.0 is released.
---

All three need a signed-in account, so they appear only when you're signed in.

## Settings in top bar

A gear button sits before your avatar and opens YouTube's settings. The Settings entry in the sidebar goes away.

The switch is **Navigation → Settings in top bar**, with no options.

Kempt inserts a link to `/account` in the top bar's end slot (`ytd-masthead #end`). The tooltip follows YouTube's UI language.

## Watch later button

A Watch later button sits in the action row under the video. Click it to add the video to Watch later; it fills in. Click again to remove it.

The switch is **Navigation → Watch later button**, with no options.

The button asks the [page bridge](/kempt-yt/docs/internals/page-bridge/) for two things:

- `inWatchLater(id)` loads the video's playlist state with the request YouTube's Save menu sends (`playlist/get_add_to_playlist`), so the button starts filled when the video is already saved.
- `setWatchLater(id, on)` adds or removes the video with `browse/edit_playlist` on the `WL` playlist.

Both run in YouTube's page with your session and sign their requests the way YouTube signs its own.

## Notification actions

Each video in the notifications panel (the bell) gets two pills under its title: Watch later and Share. Watch later adds the video and fills in; click again to remove it. Share opens YouTube's own share dialog over the panel. Neither opens the video or closes the panel.

The switch is **Navigation → Notification actions**, with no options.

The Watch later pill starts unfilled even when the video is already saved: checking every notification would send one request per item each time the panel opens. It uses the same `setWatchLater` request as the Watch later button.

## Limits

- If YouTube changes how it signs these requests, the buttons stop working until Kempt is updated. The Save menu keeps working either way.
