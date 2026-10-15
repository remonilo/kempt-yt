export type Sort = 'relevance' | 'az' | 'za';

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Channel order for a sort: `relevance` keeps the guide's order (YouTube's own ranking). Pure, for tests. */
export function sortChannels<T extends { title: string }>(list: T[], sort: Sort): T[] {
  if (sort === 'relevance') return [...list];
  const out = [...list].sort((a, b) => collator.compare(a.title, b.title));
  return sort === 'za' ? out.reverse() : out;
}
