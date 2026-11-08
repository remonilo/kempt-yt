---
title: Fun progress bar
description: The seek bar as a wave, a snake, a comet or a paper boat, in the accent color.
---

The seek bar takes one of four playful styles. In each, the played part is the accent color, the buffered part is light and the rest of the track is dark. On chaptered videos the style stays continuous across the gaps between chapters, and SponsorBlock segments follow it.

| Style | Looks like |
| --- | --- |
| Wave | A thin sine wave; the accent line swallows the dark one as the video plays |
| Snake | A thick snake with eyes and a flicking tongue; each chapter start ahead of it is an apple |
| Comet | A glowing line with sparkles streaming back and a turning star for a head |
| Paper boat | The played part is water with a lighter crest, and a paper boat rocks on it |

## Settings

The switch is **Watch → Fun progress bar**, off by default.

| Option | Choices | Default |
| --- | --- | --- |
| Style | Wave, Snake, Comet, Paper boat | Wave |
| Animate | On or off | On |

With Animate off, the style stays still. Reduced motion in your system settings also turns the motion off.

## How it works

- YouTube moves the played fill with an inline `transform: scaleX(p)`, which would stretch a masked wave. Kempt draws the track, buffered part and played part as three unscaled wave layers per chapter segment, and clips the last two to the buffered and played fractions it copies from YouTube's own fills.
- The fractions update on media events (`timeupdate`, `progress`, `seeked`, `durationchange`, `loadedmetadata`) and while you drag on the bar. There are no timers and no per-frame observer. A small `MutationObserver` on the bar alone catches YouTube rebuilding its chapter segments.
- The drift is a `transform` animation, so it runs on the compositor and repaints nothing. It runs only while the video plays and the controls are showing. Pausing freezes the wave where it is, and hiding the controls pauses it.
- On a chaptered video with 30 segments, one update took about 0.2 ms on `timeupdate` and 0.3 ms on `pointermove` in a headless Firefox run. GPU and power use are unmeasured.
