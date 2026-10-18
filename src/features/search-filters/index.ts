import type { Feature } from '../../core/feature.ts';
import { el, keep, observe, waitFor } from '../../core/dom.ts';
import { icon } from '../../core/icon.ts';
import { dropdown } from '../../core/dropdown.ts';
import { local, uiLang } from '../../core/i18n.ts';
import { S } from '../../core/selectors.ts';
import { saveOption } from '../../core/settings.ts';
import type { SearchFilterGroup } from './page.ts';
import { isUploadDate, pickYear, readRange, shift, withRange, yearSpan } from './query.ts';

const WORDS = {
  en: { any: 'Any', custom: 'Custom range', hint: 'Exact days or whole years', grid: 'Grid', list: 'List', from: 'From', to: 'To', apply: 'Apply', clear: 'Clear' },
  es: { any: 'Cualquiera', custom: 'Rango personalizado', hint: 'Días exactos o años', grid: 'Cuadrícula', list: 'Lista', from: 'Desde', to: 'Hasta', apply: 'Aplicar', clear: 'Borrar' },
  pt: { any: 'Qualquer', custom: 'Período personalizado', hint: 'Dias exatos ou anos', grid: 'Grade', list: 'Lista', from: 'De', to: 'Até', apply: 'Aplicar', clear: 'Limpar' },
  de: { any: 'Beliebig', custom: 'Eigener Zeitraum', hint: 'Genaue Tage oder ganze Jahre', grid: 'Raster', list: 'Liste', from: 'Von', to: 'Bis', apply: 'Anwenden', clear: 'Löschen' },
  fr: { any: 'Tous', custom: 'Période personnalisée', hint: 'Jours précis ou années', grid: 'Grille', list: 'Liste', from: 'Du', to: 'Au', apply: 'Appliquer', clear: 'Effacer' },
  ru: { any: 'Любые', custom: 'Свой период', hint: 'Точные дни или годы', grid: 'Сетка', list: 'Список', from: 'С', to: 'По', apply: 'Применить', clear: 'Сбросить' },
  ja: { any: 'すべて', custom: 'カスタム期間', hint: '日付または年で指定', grid: 'グリッド', list: 'リスト', from: '開始', to: '終了', apply: '適用', clear: 'クリア' },
  ko: { any: '전체', custom: '사용자 지정 기간', hint: '정확한 날짜 또는 연도', grid: '그리드', list: '목록', from: '시작', to: '종료', apply: '적용', clear: '지우기' },
  hi: { any: 'कोई भी', custom: 'अपनी तारीखें', hint: 'सटीक दिन या पूरे साल', grid: 'ग्रिड', list: 'सूची', from: 'से', to: 'तक', apply: 'लागू करें', clear: 'हटाएं' },
  id: { any: 'Semua', custom: 'Rentang khusus', hint: 'Tanggal pasti atau tahun', grid: 'Petak', list: 'Daftar', from: 'Dari', to: 'Sampai', apply: 'Terapkan', clear: 'Hapus' },
  tr: { any: 'Tümü', custom: 'Özel aralık', hint: 'Belirli günler veya yıllar', grid: 'Izgara', list: 'Liste', from: 'Başlangıç', to: 'Bitiş', apply: 'Uygula', clear: 'Temizle' },
};
type Words = (typeof WORDS)['en'];
type Go = (q: string, p: string) => void;

/** Search filters as dropdown chips (Figma Search 117:7228), with a custom date range in Upload date (decision 41). */
export const searchFilters: Feature = {
  id: 'search-filters', label: 'Search filters and grid', hint: 'Filter chips with a custom date range, results as a grid or list',
  group: 'feeds', icon: 'filter', defaultOn: true,
  routes: ['other'],
  options: {
    layout: { type: 'choice', label: 'Results layout', default: 'grid', choices: { grid: 'Grid', list: 'List' } },
  },
  run({ signal, call }) {
    // Every filter change is a new search URL; restart per navigation.
    let page: AbortController | undefined;
    const start = () => {
      page?.abort();
      page = new AbortController();
      if (location.pathname === '/results') mount(AbortSignal.any([signal, page.signal]), call);
    };
    start();
    document.addEventListener('kyt:navigate', start, { signal });
  },
};

type Call = Parameters<NonNullable<Feature['run']>>[0]['call'];

async function mount(signal: AbortSignal, call: Call) {
  const header = await waitFor(S.searchHeader, { signal });
  if (!header || signal.aborted) return;
  const groups = await call('searchFilterGroups', S.searchHeader);
  if (signal.aborted) return;
  // A first load can run before YouTube hands the header its data.
  if (!groups) return document.addEventListener('yt-page-data-updated', () => mount(signal, call), { signal, once: true });

  const search = new URLSearchParams(location.search);
  const query = search.get('search_query') ?? '';
  const sp = search.get('sp') ?? '';
  const go: Go = (q, params) => call('searchGo', q, params);
  const words = local(WORDS);

  const row = el('div', 'kyt-search-filters');
  row.role = 'toolbar';
  for (const g of groups) row.append(group(g, query, sp, go, words, signal));
  row.append(layoutToggle(words, signal));
  keep(row, header, () => {
    const bar = header.querySelector(':scope > #chip-bar');
    if (bar && bar.previousElementSibling !== row) bar.before(row);
  }, signal, { childList: true });
  stackWhenNarrow(header, row, signal);
}

// One line needs room for every filter chip, the grid/list chips and some of YouTube's chips; measured from our own
// chips, whose widths don't depend on the mode, so toggling can't flip back and forth.
const MIN_YT_CHIPS = 240;
function stackWhenNarrow(header: Element, row: HTMLElement, signal: AbortSignal) {
  const ro = new ResizeObserver(() => {
    const gap = parseFloat(getComputedStyle(header).columnGap) || 0;
    let need = MIN_YT_CHIPS;
    for (const c of row.children as HTMLCollectionOf<HTMLElement>) need += c.offsetWidth + gap;
    header.toggleAttribute('kyt-stacked', need > header.clientWidth);
  });
  ro.observe(header);
  signal.addEventListener('abort', () => {
    ro.disconnect();
    header.removeAttribute('kyt-stacked');
  }, { once: true });
}

// One chip per YouTube group. Options toggle like in YouTube's dialog: a selected one's link removes it, and
// Features can hold several. "Any" clears the group, unless an option already is the default (Prioritize: Relevance).
// Upload date also holds the custom range; a preset and a range replace each other.
function group(g: SearchFilterGroup, query: string, sp: string, go: Go, words: Words, signal: AbortSignal) {
  const date = isUploadDate(g.filters.map((f) => f.params));
  const cur = readRange(query);
  const ranged = date && !!(cur.after || cur.before);
  const on = g.filters.filter((f) => f.selected);
  const choices: Record<string, string> = {};
  const params = new Map<string, string>();
  const anyParams = on.length === 1 ? on[0].params : ranged ? sp : null;
  const showAny = !on.length || (anyParams !== null && !g.filters.some((f) => !f.selected && f.params === anyParams));
  if (showAny) {
    choices.any = words.any;
    if (anyParams !== null) params.set('any', anyParams);
  }
  g.filters.forEach((f, i) => {
    choices[`f${i}`] = f.label; // not bare numbers: those keys sort before 'any'
    if (f.params !== null) params.set(`f${i}`, f.params);
  });
  const isOn = (k: string) => (k === 'any' ? !on.length && !ranged : !!g.filters[+k.slice(1)]?.selected);
  const range = date ? rangeForm(query, cur, on.length ? on[0].params ?? sp : sp, go, words, signal) : null;
  const dd = dropdown(g.title, choices, () => '', (k) => {
    const p = params.get(k);
    if (p !== undefined) go(date ? withRange(query, {}) : query, p);
  }, signal, { on: isOn, text: () => (on.length ? on.map((f) => f.label).join(', ') : range?.text() || words.any) });
  // Default-selected options (Relevance) have no link; anything else selected is an active filter.
  if (ranged || on.some((f) => f.params !== null)) dd.root.querySelector('.kyt-dd-btn')!.ariaPressed = 'true';
  for (const item of dd.root.querySelectorAll<HTMLButtonElement>('.kyt-dd-item')) {
    const k = item.dataset.value!;
    if (!params.has(k) && !isOn(k)) item.disabled = true;
  }
  if (range) range.attach(dd, words, signal);
  return dd.root;
}

// The custom range: YouTube honours after:/before: in the query (PLAN.md Search page item). `after:D` includes D,
// `before:D` excludes it (checked against known upload dates), so the To input shows the day before the query's
// `before:`. `spOut` is the `sp` to search with: the current one minus any Upload date preset.
function rangeForm(query: string, cur: ReturnType<typeof readRange>, spOut: string, go: Go, words: Words, signal: AbortSignal) {
  const shown = { after: cur.after, before: shift(cur.before, -1) };
  const fmt = new Intl.DateTimeFormat(uiLang(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const day = (d: string) => fmt.format(new Date(d));
  const text = () => {
    const { after: a, before: b } = shown;
    const years = a && b && yearSpan(a, b);
    if (years) return years[0] === years[1] ? `${years[0]}` : `${years[0]} – ${years[1]}`;
    if (a && b) return a === b ? day(a) : `${day(a)} – ${day(b)}`;
    if (a) return `${words.from} ${day(a)}`;
    return b ? `${words.to} ${day(b)}` : '';
  };

  // A native date input reads empty until day, month and year are all set, so whole years get chips of their own.
  const today = new Date().toISOString().slice(0, 10);
  const input = (v?: string) => {
    const i = el('input');
    i.type = 'date';
    i.value = v ?? '';
    return i;
  };
  const from = input(shown.after);
  const to = input(shown.before);
  // Oldest to newest, scrolled sideways (wheel too) to the picked From year, else the newest, when shown.
  const years = el('div', 'kyt-range-years');
  for (let y = 2005; y <= +today.slice(0, 4); y++) {
    const chip = el('button', 'kyt-chip', String(y));
    chip.dataset.year = String(y);
    chip.addEventListener('click', () => {
      ({ from: from.value, to: to.value } = pickYear(from.value, to.value, y));
      sync();
    }, { signal });
    years.append(chip);
  }
  years.addEventListener('wheel', (e) => {
    if (!e.deltaY || e.deltaX) return;
    e.preventDefault();
    years.scrollLeft += e.deltaY;
  }, { signal, passive: false });
  const reveal = () => {
    const c = years.querySelector<HTMLElement>('[data-edge]') ?? years.lastElementChild as HTMLElement;
    years.scrollLeft = c.offsetLeft - years.offsetLeft - 60; // a year of context before it
  };
  function sync() {
    from.max = to.value || today;
    to.min = from.value;
    from.removeAttribute('aria-invalid');
    to.removeAttribute('aria-invalid');
    for (const [i, edge] of [[from, 'from'], [to, 'to']] as const) {
      if (i.value) i.dataset.edge = edge;
      else delete i.dataset.edge;
    }
    const span = yearSpan(from.value, to.value);
    for (const c of years.children as HTMLCollectionOf<HTMLElement>) {
      const y = +c.dataset.year!;
      c.ariaPressed = String(!!span && y >= span[0] && y <= span[1]);
      // From and To get their own colour; a single year is From.
      if (span && y === span[0]) c.dataset.edge = 'from';
      else if (span && y === span[1]) c.dataset.edge = 'to';
      else delete c.dataset.edge;
    }
  }
  sync();
  from.addEventListener('input', sync, { signal });
  to.addEventListener('input', sync, { signal });

  const clear = el('button', 'kyt-chip', words.clear);
  const apply = el('button', 'kyt-chip kyt-range-apply', words.apply);
  const form = el('div', 'kyt-range',
    el('label', '', el('span', '', words.from), from),
    el('label', '', el('span', '', words.to), to),
    years,
    el('div', 'kyt-range-actions', clear, apply));
  form.id = 'kyt-range-form'; // one Upload date group per page
  form.hidden = !(cur.after || cur.before);

  return {
    text,
    // Below the presets: a row that stands out (accent icon, hint line) and opens the form under it.
    attach(dd: { root: HTMLElement; close: () => void }, w: Words, sig: AbortSignal) {
      const submit = (range: { after?: string; before?: string }) => {
        dd.close();
        const next = withRange(query, range);
        if (next !== query) go(next, spOut);
      };
      clear.addEventListener('click', () => submit({}), { signal: sig });
      apply.addEventListener('click', () => {
        // A half-filled date reads as empty; flag it instead of silently dropping it.
        const bad = [from, to].filter((i) => i.validity.badInput);
        for (const i of bad) i.ariaInvalid = 'true';
        if (bad.length) return bad[0].focus();
        submit({ after: from.value || undefined, before: shift(to.value, 1) });
      }, { signal: sig });
      form.addEventListener('keydown', (e) => e.key === 'Enter' && apply.click(), { signal: sig });

      const toggle = el('button', 'kyt-range-toggle', icon('date'),
        el('span', 'kyt-range-label', el('span', '', w.custom), el('span', 'kyt-range-hint', w.hint)),
        icon('arrow-down'));
      toggle.ariaExpanded = String(!form.hidden);
      toggle.setAttribute('aria-controls', form.id);
      toggle.addEventListener('click', () => {
        form.hidden = !form.hidden;
        toggle.ariaExpanded = String(!form.hidden);
        if (!form.hidden) reveal();
      }, { signal: sig });
      dd.root.querySelector('.kyt-dd-btn')!.addEventListener('click', () => {
        if (dd.root.hasAttribute('open') && !form.hidden) reveal();
      }, { signal: sig });
      dd.root.querySelector('.kyt-dd-menu')!.append(toggle, form);
    },
  };
}

// Grid/list chips like the Subscriptions toolbar; the layout itself is CSS on html[kyt-search-filters-layout].
const html = document.documentElement;
function layoutToggle(words: Words, signal: AbortSignal) {
  const toggle = el('div', 'kyt-chips kyt-layout');
  toggle.role = 'group';
  for (const v of ['grid', 'list'] as const) {
    const b = el('button', 'kyt-chip', icon(v));
    b.dataset.layout = v;
    b.title = b.ariaLabel = words[v];
    toggle.append(b);
  }
  const sync = () => {
    const layout = html.getAttribute('kyt-search-filters-layout') ?? 'grid';
    for (const b of toggle.children as HTMLCollectionOf<HTMLElement>) b.ariaPressed = String(b.dataset.layout === layout);
  };
  toggle.addEventListener('click', (e) => {
    const v = (e.target as Element).closest<HTMLElement>('[data-layout]')?.dataset.layout;
    if (!v) return;
    html.setAttribute('kyt-search-filters-layout', v); // before storage answers, so the click feels instant
    saveOption('search-filters', 'layout', v);
  }, { signal });
  // The popup can change it too.
  observe(html, { attributeFilter: ['kyt-search-filters-layout'] }, sync, signal);
  sync();
  return toggle;
}
