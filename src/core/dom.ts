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
 * Keeps an injected element in place: runs `mount` now and again whenever YouTube re-renders under `root`
 * (it rebuilds lists like the masthead buttons and the watch action row, dropping foreign nodes).
 * `mount` must be idempotent and cheap: check position, insert only if wrong. Removes `el` on abort.
 * Runs in the observer callback (before paint), not a later frame, so the missing node is never painted.
 */
export function keep(el: Element, root: Node, mount: () => void, signal: AbortSignal): void {
  const obs = new MutationObserver(mount);
  mount();
  obs.observe(root, { childList: true, subtree: true });
  signal.addEventListener('abort', () => {
    obs.disconnect();
    el.remove();
  }, { once: true });
}
