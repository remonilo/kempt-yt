---
title: Languages
description: The labels Kempt draws follow YouTube's UI language.
---

Kempt draws a few labels of its own: the watch page tabs, the timeline chips and search box, and a few tooltips. They follow **YouTube's** UI language, which you set in YouTube's account menu, not your browser's language.

Supported: English, Spanish, Portuguese, German, French, Russian, Japanese, Korean, Hindi, Indonesian and Turkish. Any other language gets English.

Labels Kempt copies from YouTube, such as the comment sort chips and the sidebar entries, are in every language YouTube has.

## How it works

`local(table)` in `src/core/i18n.ts` picks a feature's strings by `<html lang>`, which YouTube sets to its UI language. Each feature keeps its own table:

```ts
const WORDS = local<Record<'info' | 'videos', string>>({
  en: { info: 'Info', videos: 'Videos' },
  de: { info: 'Info', videos: 'Videos' },
  // ...one entry per language
});
```

The table's type is `Record<Lang, T>`, so a missing language fails the type check.

Where YouTube already has a word, Kempt uses YouTube's: the chip names are YouTube's search chips, and the Comments tooltip is YouTube's comments header.

## Help translate

The non-YouTube strings were written without a native speaker. If you speak one of the languages, read the `WORDS` tables in `src/features/*/index.ts` and open a PR.
