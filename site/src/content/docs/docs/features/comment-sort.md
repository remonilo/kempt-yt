---
title: Comment sort
description: Top and Newest as chips instead of a dropdown.
---

The Sort by dropdown above comments becomes a row of chips beside the comment count: Top and Newest. The selected chip uses the accent.

## Settings

**Watch page → Comment sort as buttons.** No options.

## How it works

Each chip clicks the matching item in YouTube's dropdown, which stays in the page, hidden. YouTube still does the reload, so sorting behaves exactly as before.

The chip labels are copied from the dropdown items, so they're in YouTube's UI language without a translation table. When YouTube re-renders the menu, Kempt updates the labels in place.
