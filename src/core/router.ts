export type Route =
  | 'home' | 'watch' | 'shorts' | 'subscriptions' | 'search' | 'channel' | 'playlist' | 'other';

export function routeOf(path: string): Route {
  if (path === '/') return 'home';
  if (path === '/watch') return 'watch';
  if (path.startsWith('/shorts/')) return 'shorts';
  if (path === '/feed/subscriptions') return 'subscriptions';
  if (path === '/results') return 'search';
  if (path === '/playlist') return 'playlist';
  if (/^\/(@|channel\/|c\/|user\/)/.test(path)) return 'channel';
  return 'other';
}

/** Video id of a /shorts/<id> path, else undefined. */
export const shortsId = (path: string) => path.match(/^\/shorts\/([\w-]{11})/)?.[1];

/** Calls cb on every SPA navigation and fires `kyt:navigate` ({ route, url }) on document. */
export function onRoute(cb: (route: Route) => void): void {
  let last = location.href;
  const fire = () => {
    if (location.href === last) return;
    last = location.href;
    const route = routeOf(location.pathname);
    cb(route);
    document.dispatchEvent(new CustomEvent('kyt:navigate', { detail: { route, url: last } }));
  };
  document.addEventListener('yt-navigate-finish', fire);
  window.addEventListener('popstate', fire);
}
