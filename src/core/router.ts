export type Route = 'home' | 'watch' | 'shorts' | 'subscriptions' | 'history' | 'channel' | 'post' | 'other';

export function routeOf(path: string): Route {
  if (path === '/') return 'home';
  // /@name/live plays the channel's current stream in the watch page.
  if (path === '/watch' || /^\/(@|channel\/|c\/|user\/)[^/]+\/live$/.test(path)) return 'watch';
  if (path.startsWith('/shorts/')) return 'shorts'; // the Shorts player (only reachable with `shorts` off)
  if (path === '/feed/subscriptions') return 'subscriptions';
  if (path === '/feed/history') return 'history';
  if (path.startsWith('/post/')) return 'post'; // a channel post with its comments
  if (/^\/(@|channel\/|c\/|user\/)/.test(path)) return 'channel';
  return 'other';
}

export const shortsId = (path: string) => path.match(/^\/shorts\/([\w-]{11})/)?.[1];

/**
 * For features on several routes (the loader keeps them running across those): runs `fn` now and again whenever the
 * route changes, aborting the last run's signal first.
 */
export function eachRoute(signal: AbortSignal, fn: (route: Route, signal: AbortSignal) => void): void {
  let last: Route | undefined;
  let run: AbortController | undefined;
  const start = () => {
    const route = routeOf(location.pathname);
    if (route === last) return;
    last = route;
    run?.abort();
    run = new AbortController();
    fn(route, AbortSignal.any([signal, run.signal]));
  };
  start();
  document.addEventListener('kyt:navigate', start, { signal });
}

export function onRoute(cb: (route: Route) => void): void {
  let last = location.href;
  const fire = () => {
    if (location.href === last) return;
    last = location.href;
    const route = routeOf(location.pathname);
    cb(route);
    document.dispatchEvent(new CustomEvent('kyt:navigate', { detail: { route } }));
  };
  document.addEventListener('yt-navigate-finish', fire);
  window.addEventListener('popstate', fire);
}
