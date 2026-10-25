// Isolated world -> main-world.ts. JSON strings in `detail` because Firefox drops objects across worlds.
// content.js may start before main-world.js is listening, so calls wait for its `kyt-mw` ready flag.
// Event names carry the build id: stale main-world copies from earlier builds stay in tabs and must not answer.
import BUILD from 'kyt:build';
import type { Handlers } from '../features/page.ts';

const REQ = `kyt:req:${BUILD}`;
const RES = `kyt:res:${BUILD}`;
let seq = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

const ready = new Promise<void>((resolve) => {
  if (document.documentElement.getAttribute('kyt-mw') === BUILD) return resolve();
  document.addEventListener(`kyt:ready:${BUILD}`, () => resolve(), { once: true });
});

document.addEventListener(RES, (e) => {
  let msg;
  try {
    msg = JSON.parse((e as CustomEvent<string>).detail); // page scripts can fire kyt:res too
  } catch {
    return;
  }
  const p = pending.get(msg?.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.error) p.reject(new Error(msg.error));
  else p.resolve(msg.result);
});

type Result<M extends keyof Handlers> = Awaited<ReturnType<Handlers[M]>>;

export function call<M extends keyof Handlers>(
  method: M,
  ...args: Parameters<Handlers[M]>
): Promise<Result<M>> {
  const id = ++seq;
  return new Promise<Result<M>>((resolve, reject) => {
    // Started before `ready`, so a missing main-world.js shows up as an error too.
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`kyt: bridge call "${method}" timed out`));
    }, 15_000);
    pending.set(id, {
      resolve: (v) => (clearTimeout(timer), resolve(v)),
      reject: (e) => (clearTimeout(timer), reject(e)),
    });
    ready.then(() => document.dispatchEvent(new CustomEvent(REQ, { detail: JSON.stringify({ id, method, args }) })));
  });
}
