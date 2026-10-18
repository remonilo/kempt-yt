import { text } from '../../page/youtube.ts';

export interface SearchFilter {
  label: string;
  params: string | null; // the `sp` this option navigates to (a selected option's removes it); null: no link
  // (disabled, or a group's default like Relevance)
  selected: boolean;
}
export interface SearchFilterGroup {
  title: string;
  filters: SearchFilter[];
}

export const searchFiltersPage = {
  // The Filters dialog is only built when opened, but its groups sit on the header's data: labels in the UI
  // language, and per option the `sp` YouTube computed for the current query.
  searchFilterGroups(sel: string): SearchFilterGroup[] | null {
    const d = document.querySelector<any>(sel)?.data;
    const groups = d?.searchFilterButton?.buttonRenderer?.command?.openPopupAction?.popup?.searchFilterOptionsDialogRenderer?.groups;
    if (!Array.isArray(groups)) return null;
    return groups.map((g: any) => g.searchFilterGroupRenderer).filter(Boolean).map((g: any) => ({
      title: text(g.title),
      filters: (g.filters ?? []).map((f: any) => f.searchFilterRenderer).filter(Boolean).map((f: any) => ({
        label: text(f.label),
        params: f.status === 'FILTER_STATUS_DISABLED' || !f.navigationEndpoint?.searchEndpoint ? null : f.navigationEndpoint.searchEndpoint.params ?? '',
        selected: f.status === 'FILTER_STATUS_SELECTED',
      })),
    }));
  },

  // Through YouTube's router, like its own filter links. `params` is URL-encoded as YouTube hands it out.
  searchGo(query: string, params: string) {
    const url = `/results?search_query=${encodeURIComponent(query).replace(/%20/g, '+')}${params ? `&sp=${params}` : ''}`;
    const endpoint = {
      commandMetadata: { webCommandMetadata: { url, webPageType: 'WEB_PAGE_TYPE_SEARCH', rootVe: 4724 } },
      searchEndpoint: { query, ...(params && { params }) },
    };
    document.querySelector('ytd-app')?.dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint } }));
  },
};
