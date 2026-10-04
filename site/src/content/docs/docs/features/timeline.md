---
title: Timeline
description: Subscriptions and History grouped under date headers, with type chips and search.
---

<img class="shot" src="/kempt-yt/screenshots/timeline.png" alt="Subscriptions timeline" />

Subscriptions and History become a timeline, with a line down the left and a dot and date before each group of videos. The dot of the group you're reading fills with the accent.

## Date groups

| Age | Header |
| --- | --- |
| Today | Today - 15 Dec 2024 |
| Yesterday | Yesterday - 14 Dec 2024 |
| 2 to 13 days | Friday - 12 Dec 2024 |
| 2 weeks and older | YouTube's own wording: 2 weeks ago, 1 month ago |

History uses YouTube's own day groups, which carry exact dates.

## The toolbar

On Subscriptions, the first row holds:

- The chips are All, Videos, Live and Shorts. Live covers streams on now, past streams and upcoming ones. The Shorts chip hides when [Hide Shorts](/kempt-yt/docs/features/shorts/) is on.
- The search box filters by title and channel. Every word must match in any order, ignoring case and accents.

A date header whose group has no match hides too.

## Settings

The switch is **Feeds → Timeline**, with no options.

## How it works

YouTube's feed shows only ages like "3 days ago" and no dates. Kempt reads each item's age from its long form (the `aria-label`, "7 hours ago" rather than "7h") and buckets it. Exact dates would need one request per video, which breaks the [performance budget](/kempt-yt/docs/internals/performance/).

- Ages parse in any language. `parseAge(text, locale)` builds one regex from `Intl.RelativeTimeFormat` in the long, short and narrow styles, for every plural form. That output matches YouTube's own text in the ten languages Kempt checked, such as "vor 2 Wochen" and "2 週間前". See [Languages](/kempt-yt/docs/features/languages/).
- Groups only move back in time. A stream labelled by its start time, or "Scheduled for", stays in the current group, so headers never repeat.
- Live detection needs no word lists. A live badge means on now. Words around the age ("Streamed 2 weeks ago", "vor 2 Wochen gestreamt") mean a past stream. No age at all means upcoming, but only if some item in the feed had a readable age.
- Headers are rows in YouTube's grid. Kempt adds header elements as full-width rows inside YouTube's own `#contents`, so infinite scroll keeps working untouched. They sit after all of YouTube's cards in the DOM, and flex `order` draws each one above its group. YouTube matches the grid's children to its data by position whenever the row count changes, so a header between cards would make it move every card. The line is a background gradient on the grid, and each dot cuts it with an 8px ring in the page color.
- One observer drives the dot. A single `IntersectionObserver` picks the lowest header above mid-screen. The fill fades in 200 ms, or not at all under reduced motion.

### Filtering without loading the whole feed

YouTube loads the next page whenever its loading row is on screen. With most items filtered out, that row never leaves the screen, so the feed would load to its end and freeze the tab. While a filter is on, Kempt hides the loading row unless fewer than 24 items match and fewer than 300 are loaded.

## Limits

- Filters work on loaded items only. Scroll to load more.
- Premieres ("Premiered 2 days ago") count as Live.
- Kempt hides the "Most relevant" shelf, because its items repeat feed items out of order.
