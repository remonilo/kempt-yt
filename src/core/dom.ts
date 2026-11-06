interface WaitOpts {
  root?: ParentNode & Node;
  signal?: AbortSignal;
  timeout?: number;
  attributes?: string[]; // also re-check when these change under `root`
}

/**
 * Resolves with the first match under `root`, or null on abort/timeout (`timeout: Infinity` waits until abort).
 * Observes only `root`; pass the narrowest container you can.
 */
export function waitFor<T extends Element = Element>(
  sel: string,
  { root = document, signal, timeout = 10_000, attributes }: WaitOpts = {},
): Promise<T | null> {
  if (signal?.aborted) return Promise.resolve(null);
  const hit = root.querySelector<T>(sel);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const done = (el: T | null) => {
      obs.disconnect();
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(el);
    };
    const onAbort = () => done(null);
    const obs = new MutationObserver(() => {
      const el = root.querySelector<T>(sel);
      if (el) done(el);
    });
    const timer = timeout === Infinity ? undefined : setTimeout(() => {
      console.warn(`kyt: "${sel}" not found after ${timeout}ms`);
      done(null);
    }, timeout);
    obs.observe(root, { childList: true, subtree: true, ...(attributes && { attributeFilter: attributes }) });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Runs `mount` now and whenever YouTube re-renders under `root`, so an injected element survives. `mount` must be
 * idempotent and cheap. Runs before paint; removes `el` on abort. Several roots: pass `{ childList: true }`.
 */
export function keep(
  el: Element,
  root: Node | null | (Node | null)[],
  mount: () => void,
  signal: AbortSignal,
  init: MutationObserverInit = { childList: true, subtree: true },
): void {
  if (signal.aborted) return;
  const obs = new MutationObserver(mount);
  mount();
  for (const r of [root].flat()) if (r) obs.observe(r, init);
  signal.addEventListener('abort', () => {
    obs.disconnect();
    el.remove();
  }, { once: true });
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.append(...kids);
  return e;
}

export function observe(target: Node | null, init: MutationObserverInit, fn: () => void, signal: AbortSignal): MutationObserver {
  const obs = new MutationObserver(fn);
  if (target && !signal.aborted) obs.observe(target, init);
  signal.addEventListener('abort', () => obs.disconnect(), { once: true });
  return obs;
}

/**
 * Sets html[kyt-stuck] while `row` sits under the masthead (sticky or fixed there), so a feature's CSS can extend the
 * row's frost up behind the masthead and clear the masthead's own: two blurs side by side show a seam.
 */
export function stuckUnderMasthead(row: Element, signal: AbortSignal): void {
  const html = document.documentElement;
  const top = parseFloat(getComputedStyle(html).getPropertyValue('--ytd-masthead-height')) || 56;
  const io = new IntersectionObserver(([e]) => html.toggleAttribute('kyt-stuck', e.boundingClientRect.top < top + 1),
    { rootMargin: `-${top + 1}px 0px 0px 0px`, threshold: 1 });
  io.observe(row);
  signal.addEventListener('abort', () => (io.disconnect(), html.removeAttribute('kyt-stuck')), { once: true });
}
