import { find, inst } from '../../page/youtube.ts';

const askOrig = new WeakMap<object, any>();
const askMode = new WeakMap<object, string>();

export const watchTabs = {
  // Text expanders that rendered while hidden miss their "...more" until re-measured.
  relayout(sel: string) {
    for (const el of document.querySelectorAll<any>(`${sel} ytd-text-inline-expander`)) inst(el).resize?.(false);
  },

  // See docs/internals/youtube-quirks.
  askAi(mode: 'front' | 'off' | 'restore') {
    const m = document.querySelector<any>('ytd-watch-metadata #actions ytd-menu-renderer');
    const d = m?.data;
    if (!d) return false;
    const orig = askOrig.get(d) ?? d;
    const isAsk = (it: any) => !!find(it, (x) => x?.panelIdentifier === 'PAyouchat' || x?.iconName === 'SPARK');
    const top: any[] = orig.topLevelButtons ?? [];
    const flex: any[] = orig.flexibleItems ?? [];
    const ask = flex.find(isAsk);
    const has = !!ask || top.some(isAsk);
    let next = orig;
    if (mode === 'off' && has) next = { ...orig, topLevelButtons: top.filter((x) => !isAsk(x)), flexibleItems: flex.filter((x) => x !== ask) };
    if (mode === 'front' && ask && flex[0] !== ask) next = { ...orig, flexibleItems: [ask, ...flex.filter((x) => x !== ask)] };
    if (next === d || (askOrig.get(d) === orig && askMode.get(d) === mode)) return has;
    if (next !== orig) {
      askOrig.set(next, orig);
      askMode.set(next, mode);
    }
    m.data = next;
    return has;
  },
};
