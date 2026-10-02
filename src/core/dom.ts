interface WaitOpts {
  root?: ParentNode & Node;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Resolves with the first match under `root`, or null on abort/timeout.
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
    const timer = setTimeout(() => {
      console.warn(`kyt: "${sel}" not found after ${timeout}ms`);
      done(null);
    }, timeout);
    obs.observe(root, { childList: true, subtree: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
