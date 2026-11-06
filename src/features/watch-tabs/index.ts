import type { Feature } from '../../core/feature.ts';
import { el, keep, observe, waitFor } from '../../core/dom.ts';
import { icon } from '../../core/icon.ts';
import { local } from '../../core/i18n.ts';
import { S } from '../../core/selectors.ts';

type Tab = 'info' | 'comments' | 'videos' | 'chat' | 'ai';
const TABS: Tab[] = ['info', 'comments', 'videos', 'chat', 'ai'];
// Short enough for five equal columns; `comments` is the tooltip of its tab (count or icon).
// Videos and Comments are YouTube's words. Longer ones still end in an ellipsis (style.css).
const WORDS = {
  en: { info: 'Info', comments: 'Comments', videos: 'Videos', chat: 'Live chat', ai: 'Ask AI' },
  es: { info: 'Info', comments: 'Comentarios', videos: 'Vídeos', chat: 'Chat', ai: 'Preguntar' },
  pt: { info: 'Info', comments: 'Comentários', videos: 'Vídeos', chat: 'Chat', ai: 'Perguntar' },
  de: { info: 'Info', comments: 'Kommentare', videos: 'Videos', chat: 'Livechat', ai: 'KI fragen' },
  fr: { info: 'Infos', comments: 'Commentaires', videos: 'Vidéos', chat: 'Chat', ai: 'Demander' },
  ru: { info: 'Описание', comments: 'Комментарии', videos: 'Видео', chat: 'Чат', ai: 'Спросить' },
  ja: { info: '概要', comments: 'コメント', videos: '動画', chat: 'チャット', ai: 'AI に質問' },
  ko: { info: '정보', comments: '댓글', videos: '동영상', chat: '채팅', ai: 'AI 질문' },
  hi: { info: 'जानकारी', comments: 'टिप्पणियां', videos: 'वीडियो', chat: 'चैट', ai: 'AI से पूछें' },
  id: { info: 'Info', comments: 'Komentar', videos: 'Video', chat: 'Chat', ai: 'Tanya AI' },
  tr: { info: 'Bilgi', comments: 'Yorumlar', videos: 'Videolar', chat: 'Sohbet', ai: 'Sor' },
};
const EXPANDED = '[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]';
const CHAT_CSS = 'yt-live-chat-header-renderer #close-button { display: none !important; }';
const YT_PANELS = '#shopping-timely-shelf, #persistent-panel-container, #playlist, #panels, #chat-container, #inline-panels';

// Videos and Live chat stay in place and are only shown or hidden; the description and comments move into boxes
// that go back on abort. Our nodes go after YouTube's leading run of panels (YT_PANELS). Why:
// docs/internals/youtube-quirks.
export const watchTabs: Feature = {
  id: 'watch-tabs',
  label: 'Tabs', hint: 'Info, comments and videos', group: 'watch', icon: 'info',
  defaultOn: true,
  routes: ['watch'],
  options: {
    ai: { type: 'boolean', label: 'Ask AI', default: true },
    aiAs: { type: 'choice', label: 'Show as', default: 'button', choices: { button: 'Icon button', tab: 'Tab' }, parent: 'ai' },
    dot: { type: 'boolean', label: 'Dot on Info for tickets, merch, donations', default: true },
  },
  async run({ signal, call }) {
    const flexy = await waitFor(S.watchFlexy, { signal });
    const [desc, comments] = await Promise.all([waitFor(S.description, { signal }), waitFor(S.comments, { signal })]);
    if (!flexy || !desc || !comments || signal.aborted) return;
    const html = document.documentElement;
    const descHome = desc.parentElement!;
    const commentsHome = comments.parentElement!;
    const descNext = desc.nextSibling;

    const bar = el('div', 'kyt-tabs', el('span', 'kyt-tabs-ind'));
    bar.role = 'tablist';
    const words = local(WORDS);
    const btns = new Map(TABS.map((t) => {
      const b = el('button', 'kyt-tab');
      b.role = 'tab';
      // A span, so a long translation ends in an ellipsis inside its equal-width column; the title has it all.
      if (t !== 'comments') {
        b.title = words[t];
        b.append(el('span', '', words[t]));
      }
      b.addEventListener('click', () => {
        // Only user clicks leave theater; select() also runs on navigation and when Ask AI closes.
        if (theater()) flexy.querySelector<HTMLElement>('.ytp-size-button')?.click();
        select(t);
      }, { signal });
      bar.append(b);
      return [t, b];
    }));
    const infoBox = el('div', 'kyt-tab-info');
    const commentsBox = el('div', 'kyt-tab-comments');

    let tab: Tab = 'videos';
    let back: Tab = 'videos'; // where Ask AI returns to when its panel closes
    let askedAt: Set<Element> | null = null; // expanded panels just before we clicked Ask

    const panelsEl = () => flexy.querySelector(S.panels);
    // A replay's chat can start collapsed (YouTube's "Open panel" card, hidden in style.css): the tab expands it.
    // Collapsed with no toggle means the replay has no chat.
    const chatFrame = () => flexy.querySelector<HTMLElement>(`${S.chatContainer} > ${S.liveChat}:not([hidden])`);
    const chatToggle = () => chatFrame()?.querySelector<HTMLElement>(S.chatToggle);
    let chatOpened = false; // we expanded it, so leaving the tab collapses it again
    // Hide-tab features can empty a tab: Comments, Live chat, or Videos with neither related videos nor a playlist.
    const hidden = (...ids: string[]) => ids.some((id) => html.hasAttribute(`kyt-hide-${id}`));
    const available = (t: Tab) => t === 'chat' ? !hidden('chat', 'secondary') && !!chatFrame() && (!chatFrame()!.hasAttribute('collapsed') || !!chatToggle())
      : t === 'ai' ? html.getAttribute('kyt-watch-tabs-aiAs') === 'tab' && !!flexy.querySelector(S.askButton)
      : t === 'comments' ? !hidden('comments')
      : t === 'videos' ? !hidden('related', 'secondary') || (!hidden('playlist') && !!flexy.querySelector(S.playlistPanel))
      : true;

    // Theater closes every tab (the column sits under the player); `tab` is kept and returns afterwards.
    const theater = () => flexy.hasAttribute('theater');

    const render = () => {
      if (!available(tab)) tab = available('videos') ? 'videos' : 'info';
      const open = theater() ? 'none' : tab;
      const shown = TABS.filter(available);
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
      const collapsed = !!chatFrame()?.hasAttribute('collapsed');
      if (t === 'chat' && collapsed) {
        chatToggle()?.click();
        chatOpened = true;
      } else if (t !== 'chat' && chatOpened) {
        if (!collapsed) chatToggle()?.click();
        chatOpened = false;
      }
      tab = t;
      render();
      if (t === 'info') {
        cardsSeen = true;
        call('relayout', '.kyt-tab-info');
      }
      dot();
    };

    // Localized count ("2.4M") from the comments header. It lands ~1s after navigation, so re-read on #panels changes.
    let shownCount: string | undefined;
    const count = () => {
      const n = panelsEl()?.querySelector(`${S.commentsPanel} #contextual-info`)?.textContent?.trim() ?? '';
      if (n === shownCount) return;
      shownCount = n;
      const b = btns.get('comments')!;
      b.title = b.ariaLabel = n ? `${words.comments} (${n})` : words.comments;
      b.replaceChildren(n || icon('comments'));
    };

    // Ask AI opens an engagement panel: tag it so other tabs can hide it, and leave the tab when it closes.
    const onPanels = () => {
      const panels = panelsEl();
      if (!panels) return;
      shop();
      if (askedAt) {
        const opened = [...panels.querySelectorAll(EXPANDED)].find((p) => !askedAt!.has(p));
        if (opened) {
          opened.setAttribute('kyt-ai', '');
          askedAt = null;
        }
      } else if (tab === 'ai' && !panels.querySelector(`[kyt-ai]${EXPANDED}`)) select(back);
    };

    // Shop's product panel opens in Info, under the description. YouTube reuses #panels' children by position for the next video
    // (a moved panel leaks with stale products), so a panel leaves #panels only while expanded and goes back when it
    // closes or a navigation starts.
    const shopHomes = new Map<Element, Node | null>();
    let navigating = false;
    const shopBack = (p: Element) => {
      const home = panelsEl(), next = shopHomes.get(p);
      shopHomes.delete(p);
      home?.insertBefore(p, next?.parentNode === home ? next : null);
    };
    const shop = () => {
      for (const p of [...shopHomes.keys()]) if (navigating || !p.matches(EXPANDED)) shopBack(p);
      const open = !navigating && panelsEl()?.querySelector(`:scope > ${S.shoppingPanels}${EXPANDED}`);
      if (!open) return;
      shopHomes.set(open, open.nextSibling);
      const d = infoBox.querySelector(':scope > #description');
      if (d) d.after(open);
      else infoBox.prepend(open);
      select('info');
    };

    const cardHomes = new Map<Element, [Node, Node | null]>(); // moved cards go back here on abort
    // A card hides behind Info, so the tab gets a dot (style.css, option `dot`) until Info is opened on this video.
    let cardsSeen = false;
    const dot = () => {
      // Slots stay in the box empty; a card counts once YouTube renders into it (merch renders as its own node).
      const has = !html.hasAttribute('kyt-hide-merch') && [...infoBox.children].some((c) => c.matches('ytd-merch-shelf-renderer') ? !c.hasAttribute('hidden')
        : c.matches('#clarify-box, #ticket-shelf, #donation-shelf') && [...c.children].some((x) => !x.hasAttribute('hidden')));
      btns.get('info')!.toggleAttribute('kyt-dot', has && !cardsSeen && tab !== 'info');
    };
    observe(infoBox, { childList: true }, dot, signal);
    const mount = () => {
      const panels = panelsEl();
      if (!panels) return;
      // After YouTube's leading run of panels. Never move what is in place: it re-renders every loaded comment.
      let anchor: Element = panels;
      for (let el = panels.parentElement!.firstElementChild; el; el = el.nextElementSibling) {
        if (el === bar || el === infoBox || el === commentsBox) continue;
        if (!el.matches(YT_PANELS)) break;
        anchor = el;
      }
      const ours = [bar, infoBox, commentsBox];
      if (ours.some((n, i) => (i ? ours[i - 1] : anchor).nextElementSibling !== n)) anchor.after(...ours);
      const d = flexy.querySelector(S.description); // only matches while it's still in ytd-watch-metadata
      if (d) infoBox.prepend(d);
      for (const card of flexy.querySelectorAll(S.watchCards)) {
        if (!cardHomes.has(card)) {
          cardHomes.set(card, [card.parentNode!, card.nextSibling]);
          observe(card, { childList: true, subtree: true, attributeFilter: ['hidden'] }, dot, signal);
        }
        infoBox.append(card);
      }
      dot();
      const c = [...flexy.querySelectorAll(S.comments)].find((x) => x.parentElement !== commentsBox);
      if (c) commentsBox.replaceChildren(c);
    };

    // Live chat's close (X) is inside its iframe, out of CSS reach; re-run on every load (capture).
    const chatDoc = () => flexy.querySelector<HTMLIFrameElement>(`${S.liveChat} iframe`)?.contentDocument;
    const styleChat = () => {
      const doc = chatDoc();
      if (!doc?.head || doc.getElementById('kyt-chat')) return;
      doc.head.append(Object.assign(doc.createElement('style'), { id: 'kyt-chat', textContent: CHAT_CSS }));
    };
    styleChat();
    flexy.addEventListener('load', (e) => e.target instanceof HTMLIFrameElement && styleChat(), { capture: true, signal });

    // Ask AI off: removed from the row and ⋯ menu. On: first among the flexible items, so it is dropped last.
    // Re-applied when YouTube re-renders the row with its own data.
    const ai = () => call('askAi', html.hasAttribute('kyt-watch-tabs-ai') ? 'front' : 'off').catch(() => {});
    const checkAi = () => {
      const ask = flexy.querySelector(`${S.watchActions} [kyt-icon="SPARK"]`);
      if (!ask) return;
      const flex = ask.parentElement?.id === 'flexible-item-buttons';
      if (!html.hasAttribute('kyt-watch-tabs-ai') || (flex && ask !== ask.parentElement!.firstElementChild)) ai();
    };

    call('stamp', S.watchActions, 'watch-tabs');
    ai();
    keep(bar, [flexy.querySelector('#secondary-inner'), flexy.querySelector('#below'), descHome, commentsHome], mount, signal, { childList: true });
    render();
    count();

    const watch = (target: Node | null, init: MutationObserverInit, fn: () => void) => observe(target, init, fn, signal);
    watch(flexy.querySelector(S.chatContainer), { childList: true, subtree: true, attributeFilter: ['hidden', 'collapsed'] }, render);
    watch(flexy.querySelector(S.watchActions), { subtree: true, attributeFilter: ['kyt-icon'] }, () => (checkAi(), render()));
    // HTML lowercases attribute names: the runner's kyt-watch-tabs-aiAs lands as -aias.
    watch(html, { attributeFilter: ['kyt-watch-tabs-ai', 'kyt-watch-tabs-aias'] }, () => (ai(), render()));
    watch(html, { attributeFilter: ['comments', 'chat', 'related', 'playlist', 'secondary', 'merch'].map((id) => `kyt-hide-${id}`) }, () => (render(), dot()));
    watch(flexy, { attributeFilter: ['theater'] }, () => (render(), requestAnimationFrame(align)));
    watch(flexy, { attributeFilter: ['is-two-columns_'] }, render);

    // In theater the column starts beside the title: push the bar down to the action row. Re-measured on resize.
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
    // The description opens expanded when it fits within the player's height, decided once per video the first
    // time Info shows it (hidden, it measures 0). Runs before paint, so a too-tall one never flashes open.
    let fitted = false;
    const fit = new ResizeObserver(() => {
      const h = desc.getBoundingClientRect().height;
      if (fitted || !h) return;
      fitted = true;
      const more = desc.querySelector<HTMLElement>(S.descExpand);
      if (!more || more.hidden || !more.offsetParent) return;
      more.click();
      const player = flexy.querySelector(S.player)?.getBoundingClientRect().height ?? 0;
      if (desc.getBoundingClientRect().height > player) desc.querySelector<HTMLElement>(S.descCollapse)?.click();
    });
    fit.observe(desc);
    signal.addEventListener('abort', () => fit.disconnect(), { once: true });
    document.addEventListener('kyt:navigate', () => (fitted = false), { signal });
    watch(panelsEl(), { subtree: true, attributeFilter: ['visibility'] }, onPanels);
    watch(infoBox, { subtree: true, attributeFilter: ['visibility'] }, shop);
    watch(panelsEl(), { subtree: true, childList: true, characterData: true }, count);

    // The frame is reused for the next video: forget our expand so select() doesn't collapse the new chat.
    document.addEventListener('kyt:navigate', () => (chatOpened = false, cardsSeen = false, select('videos')), { signal });
    document.addEventListener('yt-navigate-start', () => (navigating = true, shop()), { signal });
    document.addEventListener('yt-page-data-updated', () => (navigating = false, ai(), render()), { signal });

    signal.addEventListener('abort', () => {
      const d = infoBox.querySelector(':scope > #description');
      if (d) descHome.insertBefore(d, descNext?.parentNode === descHome ? descNext : null);
      // Reverse, so a card whose old next sibling also moved finds it home already.
      for (const [card, [home, next]] of [...cardHomes].reverse()) home.insertBefore(card, next?.parentNode === home ? next : null);
      [...shopHomes.keys()].forEach(shopBack);
      const c = commentsBox.firstElementChild;
      if (c) commentsHome.append(c);
      infoBox.remove();
      commentsBox.remove();
      flexy.removeAttribute('kyt-tab');
      html.removeAttribute('kyt-watch-tabs-open');
      bar.style.marginTop = '';
      for (const p of flexy.querySelectorAll('[kyt-ai]')) p.removeAttribute('kyt-ai');
      chatDoc()?.getElementById('kyt-chat')?.remove();
      call('askAi', 'restore').catch(() => {});
    }, { once: true });
  },
};
