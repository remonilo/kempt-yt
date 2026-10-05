---
title: Wavy progress bar
description: The played part of the seek bar becomes a sine wave that drifts while the video plays.
---

The seek bar draws as a thin sine wave. The played part is the accent color, the buffered part is light, and the rest of the track is dark, so the accent line looks like it swallows the dark one as the video plays. On chaptered videos the wave stays continuous across the gaps between chapters.

## Settings

The switch is **Watch page → Wavy progress bar**, off by default.

| Option | Default |
| --- | --- |
| Animate wave | On |

With Animate wave off, the wave stays still. Reduced motion in your system settings also turns the drift off.

## How it works

- YouTube moves the played fill with an inline `transform: scaleX(p)`, which would stretch a masked wave. Kempt draws the track, buffered part and played part as three unscaled wave layers per chapter segment, and clips the last two to the buffered and played fractions it copies from YouTube's own fills.
- The fractions update on media events (`timeupdate`, `progress`, `seeked`, `durationchange`, `loadedmetadata`) and while you move the pointer over the bar. There are no timers and no per-frame observer. A small `MutationObserver` on the bar alone catches YouTube rebuilding its chapter segments.
- The drift is a `transform` animation, so it runs on the compositor and repaints nothing. It runs only while the video plays and the controls are showing. Pausing freezes the wave where it is, and hiding the controls pauses it.
- On a chaptered video with 30 segments, one update took about 0.2 ms on `timeupdate` and 0.3 ms on `pointermove` in a headless Firefox run. GPU and power use are unmeasured.
