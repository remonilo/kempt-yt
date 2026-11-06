---
title: Comment sort
description: Top and Newest as chips instead of a dropdown.
---

The Sort by dropdown above comments becomes a row of chips beside the comment count: Top and Newest. The selected chip uses the accent. It works under videos and on channel post pages.

## Settings

The switch is **Watch → Comment sort as buttons**, with no options.

## How it works

Each chip clicks the matching item in YouTube's dropdown, which stays hidden in the page. YouTube still reloads the comments, so sorting works as before.

Kempt copies the chip labels from the dropdown items, so they're in YouTube's UI language with no translation table. When YouTube re-renders the menu, Kempt updates the labels in place.

## Comment layout

A separate switch, **Watch → Comment layout** (on by default, CSS only), arranges the comments header in two rows: the count and the [comment search](/kempt-yt/docs/features/comment-search/) box, then the sort chips, over a divider. Avatars grow to 43 px and the "Add a comment" field gets a box. The same layout applies under videos and in the Shorts comments panel.
