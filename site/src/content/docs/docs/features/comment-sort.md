---
title: Comment sort
description: Top and Newest as chips instead of a dropdown.
banner:
  content: These docs are outdated and will be updated once v1.0 is released.
---

The Sort by dropdown above comments becomes a row of chips beside the comment count: Top and Newest. The selected chip uses the accent. It works under videos and on channel post pages.

## Settings

The switch is **Watch page → Comment sort as buttons**, with no options.

## How it works

Each chip clicks the matching item in YouTube's dropdown, which stays hidden in the page. YouTube still reloads the comments, so sorting works as before.

Kempt copies the chip labels from the dropdown items, so they're in YouTube's UI language with no translation table. When YouTube re-renders the menu, Kempt updates the labels in place.
