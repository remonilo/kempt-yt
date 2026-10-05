declare const ytcfg: { get(key: string): any } | undefined;

// Undefined before YouTube's config script has run.
export const cfg = (key: string): any => (typeof ytcfg === 'undefined' ? undefined : ytcfg.get(key));

const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];

// SAPISIDHASH auth, as YouTube's own web client does. Signed out it goes without auth, which public endpoints
// (guide) accept.
export async function innertube(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Origin': location.origin,
    'X-Goog-AuthUser': String(cfg('SESSION_INDEX') ?? 0),
    'X-Youtube-Client-Name': String(cfg('INNERTUBE_CONTEXT_CLIENT_NAME')),
    'X-Youtube-Client-Version': String(cfg('INNERTUBE_CLIENT_VERSION')),
  };
  const sapisid = cookie('SAPISID') ?? cookie('__Secure-3PAPISID');
  if (sapisid) {
    const ts = Math.floor(Date.now() / 1000);
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${ts} ${sapisid} ${location.origin}`));
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    headers.Authorization = `SAPISIDHASH ${ts}_${hash}`;
  }
  const pageId = cfg('DELEGATED_SESSION_ID'); // brand accounts
  if (pageId) headers['X-Goog-PageId'] = pageId;
  const res = await fetch(`/youtubei/v1/${endpoint}?prettyPrint=false`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ context: cfg('INNERTUBE_CONTEXT'), ...body }),
  });
  if (!res.ok) throw new Error(`innertube ${endpoint}: ${res.status}`);
  return res.json();
}

export function* walk(o: any): Generator<any> {
  if (!o || typeof o !== 'object') return;
  yield o;
  for (const v of Object.values(o)) yield* walk(v);
}

export function find(o: any, test: (x: any) => boolean): any {
  for (const x of walk(o)) if (test(x)) return x;
}

export const text = (t: any): string => t?.simpleText ?? t?.runs?.map((r: any) => r.text).join('') ?? t?.content ?? '';

// By URL, so the `navigate` handler can follow links we render ourselves like YouTube does. Filled by handlers
// that return links (sidebar guide and playlists).
export const endpoints = new Map<string, any>();

export const inst = (el: any) => el.polymerController ?? el.inst ?? el;

// Only for short bounded waits on YouTube's own late setup.
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
