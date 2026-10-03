import type { Feature } from '../../core/feature.ts';
import { keep, waitFor } from '../../core/dom.ts';
import { icon } from '../../core/icon.ts';
import { S } from '../../core/selectors.ts';

type Tab = 'info' | 'comments' | 'videos' | 'chat' | 'ai';
const TABS: [Tab, string][] = [['info', 'Info'], ['comments', ''], ['videos', 'Videos'], ['chat', 'Live chat'], ['ai', 'Ask AI']];
const EXPANDED = '[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]';
const CHAT_CSS = 'yt-live-chat-header-renderer #close-button { display: none !important; }';

/**
 * Tabs above the right column. Videos (#related) and Live chat (#chat-container) stay where YouTube put them
 * and are only shown or hidden, so the chat iframe never reloads. The description and comments move into
 * boxes after #panels and go back on abort. Everything anchors on #panels, which YouTube moves between
 * #secondary-inner and #below with the layout, so one-column layout works the same.
 * Hidden tabs are display:none: comments and related load lazily when their tab is first shown.
 */
export const watchTabs: Feature = {
  id: 'watch-tabs',
  label: 'Info, comments and videos as tabs',
  defaultOn: true,
  routes: ['watch'],
  options: { askAi: { type: 'boolean', label: 'Ask AI tab', default: false } },
  async run({ signal, call }) {
    const flexy = await waitFor(S.watchFlexy, { signal });
    const [desc, comments] = await Promise.all([waitFor(S.description, { signal }), waitFor(S.comments, { signal })]);
    if (!flexy || !desc || !comments || signal.aborted) return;
    const html = document.documentElement;
    const descHome = desc.parentElement!;
    const commentsHome = comments.parentElement!;
    const descNext = desc.nextSibling;

    const bar = document.createElement('div');
    bar.className = 'kyt-tabs';
    bar.role = 'tablist';
    bar.append(Object.assign(document.createElement('span'), { className: 'kyt-tabs-ind' }));
    const btns = new Map(TABS.map(([t, label]) => {
      const b = document.createElement('button');
      b.className = 'kyt-tab';
      b.role = 'tab';
      b.textContent = label;
      b.addEventListener('click', () => {
        // A tab click in theater leaves theater (YouTube's own size button), then opens the tab. Only user
        // clicks do this: select() also runs on navigation and when Ask AI closes, which must not leave theater.
        if (theater()) flexy.querySelector<HTMLElement>('.ytp-size-button')?.click();
        select(t);
      }, { signal });
      bar.append(b);
      return [t, b];
    }));
    const infoBox = Object.assign(document.createElement('div'), { className: 'kyt-tab-info' });
    const commentsBox = Object.assign(document.createElement('div'), { className: 'kyt-tab-comments' });

    let tab: Tab = 'videos';
    let back: Tab = 'videos'; // where Ask AI returns to when its panel closes
    let askedAt: Set<Element> | null = null; // expanded panels just before we clicked Ask

    const panelsEl = () => flexy.querySelector(S.panels);
    const available = (t: Tab) => t === 'chat' ? !!flexy.querySelector(`${S.chatContainer} > ${S.liveChat}:not([hidden])`)
      : t === 'ai' ? html.hasAttribute('kyt-watch-tabs-askAi') && !!flexy.querySelector(S.askButton)
      : true;

    // Theater (cinema) mode closes every tab: the right column sits under the full-width player there, so an
    // open tab would only make the page scroll. `tab` is kept and comes back when theater ends.
    const theater = () => flexy.hasAttribute('theater');

    const render = () => {
      if (!available(tab)) tab = 'videos';
      const open = theater() ? 'none' : tab;
      const shown = TABS.map(([t]) => t).filter(available);
      for (const [t, b] of btns) {
        b.hidden = !shown.includes(t);
        b.ariaSelected = String(t === open);
      }
      bar.style.setProperty('--i', String(shown.indexOf(tab)));
      bar.style.setProperty('--n', String(shown.length));
      if (flexy.getAttribute('kyt-tab') !== open) flexy.setAttribute('kyt-tab', open);
      // Two columns with a tab open: the tab scrolls, so the page's own scrollbar is hidden (style.css).
      html.toggleAttribute('kyt-watch-tabs-open', open !== 'none' && flexy.hasAttribute('is-two-columns_'));
    };

    const select = (t: Tab) => {
      if (t === 'ai' && !panelsEl()?.querySelector(`[kyt-ai]${EXPANDED}`)) {
        askedAt = new Set(panelsEl()?.querySelectorAll(EXPANDED));
        flexy.querySelector<HTMLElement>(S.askButton)?.click();
      }
      if (t === 'ai' && tab !== 'ai') back = tab;
      tab = t;
      render();
      if (t === 'info') call('relayout', '.kyt-tab-info');
    };

    // Short, localized count ("2.4M") from the comments panel header. It updates about a second after an
    // in-app navigation, so it's re-read whenever #panels changes; the early return keeps that cheap.
    let shownCount: string | undefined;
    const count = () => {
      const n = panelsEl()?.querySelector(`${S.commentsPanel} #contextual-info`)?.textContent?.trim() ?? '';
      if (n === shownCount) return;
      shownCount = n;
      const b = btns.get('comments')!;
      b.title = b.ariaLabel = n ? `Comments (${n})` : 'Comments';
      b.replaceChildren(n || icon('comments'));
    };

    // Ask AI opens an engagement panel: tag it so other tabs can hide it, and leave the tab when it closes.
    const onPanels = () => {
      const panels = panelsEl();
      if (!panels) return;
      if (askedAt) {
        const opened = [...panels.querySelectorAll(EXPANDED)].find((p) => !askedAt!.has(p));
        if (opened) {
          opened.setAttribute('kyt-ai', '');
          askedAt = null;
        }
      } else if (tab === 'ai' && !panels.querySelector(`[kyt-ai]${EXPANDED}`)) select(back);
    };

    const mount = () => {
      const panels = panelsEl();
      if (!panels) return;
      if (bar.nextElementSibling !== panels) panels.before(bar);
      if (panels.nextElementSibling !== infoBox || infoBox.nextElementSibling !== commentsBox) panels.after(infoBox, commentsBox);
      const d = flexy.querySelector(S.description); // only matches while it's still in ytd-watch-metadata
      if (d) infoBox.replaceChildren(d);
      const c = [...flexy.querySelectorAll(S.comments)].find((x) => x.parentElement !== commentsBox);
      if (c) commentsBox.replaceChildren(c);
    };

    // Live chat's close (X) is inside its same-origin iframe, out of reach of style.css. The iframe reloads
    // with each stream, so this re-runs on every load (load doesn't bubble: capture).
    const chatDoc = () => flexy.querySelector<HTMLIFrameElement>(`${S.liveChat} iframe`)?.contentDocument;
    const styleChat = () => {
      const doc = chatDoc();
      if (!doc?.head || doc.getElementById('kyt-chat')) return;
      doc.head.append(Object.assign(doc.createElement('style'), { id: 'kyt-chat', textContent: CHAT_CSS }));
    };
    styleChat();
    flexy.addEventListener('load', (e) => e.target instanceof HTMLIFrameElement && styleChat(), { capture: true, signal });

    call('stamp', S.watchActions);
    const below = flexy.querySelector('#below')!;
    keep(bar, [flexy.querySelector('#secondary-inner')!, below, descHome, commentsHome], mount, signal, { childList: true });
    render();
    count();

    const watch = (target: Node | null, init: MutationObserverInit, fn: () => void) => {
      if (!target) return;
      const o = new MutationObserver(fn);
      o.observe(target, init);
      signal.addEventListener('abort', () => o.disconnect(), { once: true });
    };
    watch(flexy.querySelector(S.chatContainer), { childList: true, subtree: true, attributeFilter: ['hidden'] }, render);
    watch(flexy.querySelector(S.watchActions), { subtree: true, attributeFilter: ['kyt-icon'] }, render);
    watch(html, { attributeFilter: ['kyt-watch-tabs-askAi'] }, render);
    watch(flexy, { attributeFilter: ['theater'] }, () => (render(), requestAnimationFrame(align)));
    watch(flexy, { attributeFilter: ['is-two-columns_'] }, render);

    // In theater the right column starts beside the title. Push the bar down to the action buttons' row.
    // Re-measured on theater toggles and whenever the metadata block resizes (title wraps, window resizes).
    const align = () => {
      bar.style.marginTop = '';
      const btn = flexy.querySelector('ytd-watch-metadata #actions button');
      if (!theater() || !btn || !flexy.hasAttribute('is-two-columns_')) return;
      const d = btn.getBoundingClientRect().top - bar.getBoundingClientRect().top;
      if (d > 0) bar.style.marginTop = `${d}px`;
    };
    const meta = flexy.querySelector('ytd-watch-metadata');
    if (meta) {
      const ro = new ResizeObserver(align);
      ro.observe(meta);
      signal.addEventListener('abort', () => ro.disconnect(), { once: true });
    }
    watch(panelsEl(), { subtree: true, attributeFilter: ['visibility'] }, onPanels);
    watch(panelsEl(), { subtree: true, childList: true, characterData: true }, count);

    document.addEventListener('kyt:navigate', () => select('videos'), { signal });
    document.addEventListener('yt-page-data-updated', render, { signal });

    signal.addEventListener('abort', () => {
      const d = infoBox.firstElementChild;
      if (d) descHome.insertBefore(d, descNext?.parentNode === descHome ? descNext : null);
      const c = commentsBox.firstElementChild;
      if (c) commentsHome.append(c);
      infoBox.remove();
      commentsBox.remove();
      flexy.removeAttribute('kyt-tab');
      html.removeAttribute('kyt-watch-tabs-open');
      bar.style.marginTop = '';
      for (const p of flexy.querySelectorAll('[kyt-ai]')) p.removeAttribute('kyt-ai');
      chatDoc()?.getElementById('kyt-chat')?.remove();
    }, { once: true });
  },
};
