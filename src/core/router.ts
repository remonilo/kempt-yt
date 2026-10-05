export type Route = 'home' | 'watch' | 'subscriptions' | 'history' | 'channel' | 'other';

export function routeOf(path: string): Route {
  if (path === '/') return 'home';
  // /@name/live plays the channel's current stream in the watch page.
  if (path === '/watch' || /^\/(@|channel\/|c\/|user\/)[^/]+\/live$/.test(path)) return 'watch';
  if (path === '/feed/subscriptions') return 'subscriptions';
  if (path === '/feed/history') return 'history';
  if (/^\/(@|channel\/|c\/|user\/)/.test(path)) return 'channel';
  return 'other';
}

export const shortsId = (path: string) => path.match(/^\/shorts\/([\w-]{11})/)?.[1];

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
