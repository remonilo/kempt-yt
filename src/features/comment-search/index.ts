import type { Feature } from '../../core/feature.ts';
import { onCommentsPanel } from '../../core/comments-panel.ts';
import { el, keep, observe, waitFor } from '../../core/dom.ts';
import { icon } from '../../core/icon.ts';
import { local } from '../../core/i18n.ts';
import { S } from '../../core/selectors.ts';
import { eachRoute, routeOf } from '../../core/router.ts';
import { matcher } from '../../core/text.ts';

const WORDS = {
  en: { search: 'Search comments', clear: 'Clear', none: 'No matches in loaded comments' },
  es: { search: 'Buscar comentarios', clear: 'Borrar', none: 'No hay coincidencias en los comentarios cargados' },
  pt: { search: 'Pesquisar comentários', clear: 'Limpar', none: 'Nenhum resultado nos comentários carregados' },
  de: { search: 'Kommentare durchsuchen', clear: 'Löschen', none: 'Keine Treffer in den geladenen Kommentaren' },
  fr: { search: 'Rechercher dans les commentaires', clear: 'Effacer', none: 'Aucun résultat dans les commentaires chargés' },
  ru: { search: 'Поиск по комментариям', clear: 'Очистить', none: 'В загруженных комментариях ничего не найдено' },
  ja: { search: 'コメントを検索', clear: 'クリア', none: '読み込まれたコメントに一致するものはありません' },
  ko: { search: '댓글 검색', clear: '지우기', none: '불러온 댓글 중 일치하는 항목 없음' },
  hi: { search: 'टिप्पणियां खोजें', clear: 'साफ़ करें', none: 'लोड की गई टिप्पणियों में कोई मिलान नहीं' },
  id: { search: 'Telusuri komentar', clear: 'Hapus', none: 'Tidak ada yang cocok di komentar yang dimuat' },
  tr: { search: 'Yorumlarda ara', clear: 'Temizle', none: 'Yüklenen yorumlarda eşleşme yok' },
};

/** While searching, YouTube may load more pages only until this many threads match (and never past MAX_LOADED). */
const WANT_VISIBLE = 10;
const MAX_LOADED = 100;

// A search icon at the end of the comments header row. It opens a field in place of the sort chips (or YouTube's
// sort dropdown), which filters the threads already loaded: misses get `kyt-off`, nodes are never moved.
export const commentSearch: Feature = {
  id: 'comment-search',
  label: 'Comment search', hint: 'Filters loaded comments', group: 'watch', icon: 'search',
  defaultOn: true,
  routes: ['watch', 'shorts', 'post'],
  run({ signal }) {
    eachRoute(signal, (route, s) => {
      if (route === 'watch') mountPage(s);
      if (route !== 'post') return onCommentsPanel(s, mountPanel);
      // Post pages re-render their comments header, and post -> post keeps the route: restart per post.
      let page: AbortController | undefined;
      const post = () => {
        page?.abort();
        page = new AbortController();
        mountPage(AbortSignal.any([s, page.signal]));
      };
      post();
      document.addEventListener('kyt:navigate', post, { signal: s });
    });
  },
};

async function mountPage(signal: AbortSignal) {
  // Comments render lazily (when scrolled to, or when their tab opens), so no timeout.
  // On the watch page only the comments element is observed, not every player tick.
  const watch = routeOf(location.pathname) === 'watch';
  const host = watch ? await waitFor(S.comments, { signal }) : document;
  const first = host && await waitFor(':is(ytd-watch-flexy, ytd-browse:not([hidden])) ytd-comments ytd-comments-header-renderer #sort-menu',
    { root: host, signal, timeout: Infinity });
  // `ytd-comments`: post pages also hold a hidden header with its own #sort-menu in ytd-backstage-items.
  // Both pages keep the header container while swapping the header renderer inside it.
  const root = first?.closest('ytd-comments-header-renderer')?.parentElement;
  if (!root || signal.aborted) return;
  mount({
    scope: () => root.closest('ytd-comments'),
    root,
    place(box, none) {
      const header = root.querySelector('ytd-comments-header-renderer');
      // After comment-sort's chips when they are on, else after YouTube's dropdown.
      const anchor = header?.querySelector('.kyt-sort') ?? header?.querySelector('#sort-menu');
      if (anchor && anchor.nextElementSibling !== box) anchor.after(box);
      if (header && none.parentElement !== header) header.append(none);
    },
  }, signal);
}

// In the panel the message goes under the title.
function mountPanel(title: Element, panel: Element, signal: AbortSignal) {
  mount({
    scope: () => panel.querySelector('ytd-comments'),
    root: title,
    place(box, none) {
      // After comment-sort's chips when they are on, else in the title bar before the sort and close buttons.
      const anchor = title.querySelector('#subheader > .kyt-sort');
      const menu = title.querySelector('#menu');
      if (anchor) {
        if (anchor.nextElementSibling !== box) anchor.after(box);
      } else if (menu && menu.previousElementSibling !== box) menu.before(box);
      const sub = title.querySelector('#subheader');
      if (sub && none.parentElement !== sub) sub.append(none);
    },
  }, signal);
}

interface Spot {
  /** The ytd-comments holding the threads. */
  scope: () => Element | null;
  /** Observed by keep(): `place` runs when YouTube re-renders under it. */
  root: Node;
  place: (box: Element, none: Element) => void;
}

function mount({ scope, root, place }: Spot, signal: AbortSignal) {
  const words = local(WORDS);
  const btn = el('button', 'kyt-chip kyt-cs-open', icon('search'));
  btn.title = btn.ariaLabel = words.search;
  const input = el('input');
  input.type = 'text';
  input.placeholder = input.ariaLabel = words.search;
  const clear = el('button', 'kyt-cs-clear', icon('close'));
  clear.title = clear.ariaLabel = words.clear;
  const field = el('label', 'kyt-search', icon('search'), input, clear);
  const box = el('div', 'kyt-cs', btn, field);
  const none = el('div', 'kyt-cs-none', words.none);

  let list: Element | null = null;
  const listObs = observe(null, {}, () => apply(), signal);
  const reset = () => {
    for (const e of scope()?.querySelectorAll('[kyt-off]') ?? []) e.removeAttribute('kyt-off');
    list?.removeAttribute('kyt-query');
    list?.removeAttribute('kyt-more');
    none.hidden = true;
  };
  // One pass over the loaded threads: a thread shows if its top comment or a loaded reply matches. If only replies
  // match, the other replies hide.
  const apply = () => {
    const now = scope()?.querySelector(S.commentList) ?? null;
    if (now !== list) {
      listObs.disconnect();
      if (now) listObs.observe(now, { childList: true }); // new pages and sort changes; no subtree
      list = now;
    }
    if (!input.value.trim()) {
      if (list?.hasAttribute('kyt-query')) reset(); // no work per new page while not searching
      return;
    }
    const hit = matcher(input.value);
    const textOf = (c: Element) => [...c.querySelectorAll(S.commentText)].map((t) => t.textContent).join(' ');
    let shown = 0, total = 0;
    for (const t of list?.querySelectorAll(`:scope > ${S.commentThread}`) ?? []) {
      const top = t.querySelector('#comment');
      const topHit = !!top && hit(textOf(top));
      let any = topHit;
      for (const r of t.querySelectorAll('#replies ytd-comment-view-model')) {
        const on = topHit || hit(textOf(r));
        r.toggleAttribute('kyt-off', !on);
        any ||= on;
      }
      t.toggleAttribute('kyt-off', !any);
      total++;
      if (any) shown++;
    }
    list?.setAttribute('kyt-query', '');
    // With most threads hidden YouTube's loading row stays on screen; style.css hides it unless more are wanted.
    list?.toggleAttribute('kyt-more', shown < WANT_VISIBLE && total < MAX_LOADED);
    none.hidden = shown > 0;
  };

  const open = (on: boolean) => {
    if (box.hasAttribute('kyt-open') === on) return;
    box.toggleAttribute('kyt-open', on);
    if (on) input.focus();
    else {
      input.value = '';
      apply();
      if (box.contains(document.activeElement)) btn.focus({ focusVisible: false });
    }
  };
  btn.addEventListener('click', () => open(true), { signal });
  clear.addEventListener('click', (e) => (e.preventDefault(), open(false)), { signal });
  input.addEventListener('input', apply, { signal });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation(); // YouTube's player shortcuts
    if (!input.value) return open(false);
    input.value = '';
    apply();
  }, { signal });
  // Leaving an empty field closes it.
  field.addEventListener('focusout', (e) => {
    if (!input.value && !field.contains(e.relatedTarget as Node | null)) open(false);
  }, { signal });
  document.addEventListener('kyt:navigate', () => open(false), { signal });

  none.hidden = true;
  keep(box, root, () => place(box, none), signal);
  signal.addEventListener('abort', () => (reset(), none.remove()), { once: true });
}
