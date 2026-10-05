// Pure, so it's unit-tested.
// Sections are told apart by renderer type and icon type, never by title: titles are localized.

export interface Entry {
  title: string;
  /** Path or absolute URL; `kyt:<icon>` for entries without one (Shorts). */
  url: string;
  icon?: string;
  thumb?: string;
  header?: boolean;
  isNew?: boolean;
}

export interface Section {
  type: string;
  title: string;
  entries: Entry[];
}

export interface Row {
  entry: Entry;
  /** 'playlists' = fetched on first open. */
  children?: Entry[] | 'playlists';
  toggle?: boolean;
}

export interface Nav {
  groups: Row[][];
  more: Entry[][];
}

export const EXPLORE = 'kyt:EXPLORE';

const is = (e: Entry | undefined, type: string) => !!e?.icon?.startsWith(type);

// Types not listed keep YouTube's order after these.
const LIBRARY = ['ACCOUNT_CIRCLE', 'WATCH_HISTORY', 'LIKES_PLAYLIST', 'OFFLINE_DOWNLOAD', 'WATCH_LATER', 'PLAYLISTS'];
const rank = (e: Entry) => {
  const i = LIBRARY.findIndex((t) => is(e, t));
  return i < 0 ? LIBRARY.length : i;
};
const rows = (...r: (Row | false | undefined)[]) => r.filter((x): x is Row => !!x);

export function buildNav(sections: Section[]): Nav {
  const moreAt = sections.findIndex((s) => s.entries.some((e) => is(e, 'YOUTUBE_')));
  const top = moreAt < 0 ? sections : sections.slice(0, moreAt);
  const tail = moreAt < 0 ? [] : sections.slice(moreAt);

  const subs = top.find((s) => s.type === 'guideSubscriptionsSectionRenderer');
  // Titled plain sections after the first, without a collapsible header: Explore (signed in or out).
  const explore = top.filter((s, i) => i > 0 && s.type === 'guideSectionRenderer' && s.title && !s.entries.some((e) => e.header));
  const rest = top.filter((s) => s !== subs && !explore.includes(s)).flatMap((s) => s.entries);

  const home = rest.find((e) => is(e, 'TAB_HOME'));
  const shorts = rest.find((e) => is(e, 'TAB_SHORTS'));
  const subsHead = subs?.entries.find((e) => e.header) ?? rest.find((e) => is(e, 'TAB_SUBSCRIPTIONS'));
  const channels = subs?.entries.filter((e) => !e.header && e.thumb) ?? [];
  // A collapsible's header can repeat as its own item (Courses): one row per URL.
  const library = rest
    .filter((e, i) => e !== home && e !== shorts && e !== subsHead && rest.findIndex((x) => x.url === e.url) === i)
    .sort((a, b) => rank(a) - rank(b)); // stable: unlisted types keep their order

  const groups = [
    rows(
      home && { entry: home },
      shorts && { entry: shorts },
      explore.length > 0 && {
        entry: { title: explore[0].title, url: EXPLORE, icon: 'EXPLORE' },
        children: explore.flatMap((s) => s.entries),
        toggle: true,
      },
    ),
    library.map((entry) => ({ entry, children: is(entry, 'PLAYLISTS') ? ('playlists' as const) : undefined })),
    rows(subsHead && { entry: subsHead, children: channels.length ? channels : undefined }),
  ].filter((g) => g.length);

  return { groups, more: tail.map((s) => s.entries).filter((g) => g.length) };
}
