interface WaitOpts {
  root?: ParentNode & Node;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Resolves with the first match under `root`, or null on abort/timeout (`timeout: Infinity` waits until abort).
 * Observes only `root`; pass the narrowest container you can.
 */
export function waitFor<T extends Element = Element>(
  sel: string,
  { root = document, signal, timeout = 10_000 }: WaitOpts = {},
): Promise<T | null> {
  const hit = root.querySelector<T>(sel);
  if (hit || signal?.aborted) return Promise.resolve(hit);
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
    obs.observe(root, { childList: true, subtree: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Runs `mount` now and whenever YouTube re-renders under `root`, so an injected element survives. `mount` must be
 * idempotent and cheap. Runs before paint; removes `el` on abort. Several roots: pass `{ childList: true }`.
 */
export function keep(
  el: Element,
  root: Node | Node[],
  mount: () => void,
  signal: AbortSignal,
  init: MutationObserverInit = { childList: true, subtree: true },
): void {
  const obs = new MutationObserver(mount);
  mount();
  for (const r of [root].flat()) obs.observe(r, init);
  signal.addEventListener('abort', () => {
    obs.disconnect();
    el.remove();
  }, { once: true });
}
