---
title: Top bar & Watch later
description: A Settings button beside your avatar, and a Watch later button under the video.
---

Both need a signed-in account and appear only when you're signed in.

## Settings in top bar

A gear button sits before your avatar and opens YouTube's settings. The Settings entry in the sidebar goes away.

**Navigation → Settings in top bar.** No options.

**How it works.** Kempt inserts a link to `/account` in the top bar's end slot (`ytd-masthead #end`). The tooltip follows YouTube's UI language.

## Watch later button

A Watch later button sits in the action row under the video. Click it to add the video to Watch later; it fills in. Click again to remove it.

**Navigation → Watch later button.** No options.

**How it works.** The button asks the [page bridge](/kempt-yt/docs/internals/page-bridge/) two things:

- `inWatchLater(id)` loads the video's playlist state with the request YouTube's Save menu sends (`playlist/get_add_to_playlist`), so the button starts filled when the video is already saved.
- `setWatchLater(id, on)` adds or removes the video with `browse/edit_playlist` on the `WL` playlist.

Both run in YouTube's page, with your session, signed the same way YouTube signs its own requests.

## Limits

- If YouTube changes how it signs these requests, the button stops working until Kempt is updated. The Save menu keeps working either way.
