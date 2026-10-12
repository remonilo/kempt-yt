// Pure text matching for our search boxes (timeline, comment-search). Unit tested in test/text.test.ts.

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** A test for `query`, folded once: every word must appear, ignoring case and accents. Empty query matches all. */
export function matcher(query: string): (text: string) => boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return (text) => {
    if (!words.length) return true;
    const hay = fold(text);
    return words.every((w) => hay.includes(w));
  };
}

export const matches = (text: string, query: string) => matcher(query)(text);
